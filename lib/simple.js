
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./exif')
const {
    default: makeWASocket,
    makeWALegacySocket,
    extractMessageContent,
    makeInMemoryStore,
    proto,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    getBinaryNodeChild,
    jidDecode,
    areJidsSameUser,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    WAMessageStubType,
    WA_DEFAULT_EPHEMERAL,
} = require("@adiwajshing/baileys")
const { toAudio, toPTT, toVideo } = require('./converter')
const chalk = require('chalk')
const fetch = require('node-fetch')
const FileType = require('file-type')
const PhoneNumber = require('awesome-phonenumber')
const fs = require('fs')
const path = require('path')
const jimp = require('jimp')
const pino = require('pino')
const util = require('util')
const { LRUCache } = require('lru-cache');

exports.makeWASocket = (connectionOptions, options = {}) => {
    let conn = (global.opts && global.opts['legacy'] ? makeWALegacySocket : makeWASocket)(connectionOptions)

    const isLidCache = new LRUCache({
        ttl: 3 * 24 * 60 * 60 * 1000, // 3 days
        ttlAutopurge: true,
        updateAgeOnGet: true
    });

    conn.isLid = {
        set(key, value, ttlSeconds) {
            const options = {};
            if (ttlSeconds) options.ttl = ttlSeconds * 1000;
            isLidCache.set(key, value, options);
            return this;
        },
        get(key) { return isLidCache.get(key); },
        has(key) { return isLidCache.has(key); },
        delete(key) { isLidCache.delete(key); return this; },
        clear() { isLidCache.clear(); return this; },
        get size() { return isLidCache.size; }
    };

    conn.decodeJid = (jid) => {
        if (!jid || typeof jid !== 'string') return jid || null
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {}
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid
        } else return jid
    }

    conn.getJid = (sender) => {
        sender = conn.decodeJid(sender)
        if (!sender?.endsWith('@lid')) return sender
        if (conn.isLid.has(sender)) return conn.isLid.get(sender)
        for (const chat of Object.values(conn.chats || {})) {
            if (!chat?.metadata?.participants) continue
            const user = chat.metadata.participants.find((p) => p.lid === sender || p.id === sender)
            if (user) {
                const jid = user?.phoneNumber || user?.jid || user?.id
                conn.isLid.set(sender, jid)
                return jid
            }
        }
        return sender
    }

    if (conn.user && conn.user.id) conn.user.jid = conn.decodeJid(conn.user.id)
    if (!conn.chats) conn.chats = {}

    function updateNameToDb(contacts) {
        if (!contacts) return
        for (const contact of contacts) {
            const id = conn.decodeJid(contact.id)
            if (!id) continue
            let chats = conn.chats[id]
            if (!chats) chats = conn.chats[id] = { id }
            conn.chats[id] = {
                ...chats,
                ...({
                    ...contact, id, ...(id.endsWith('@g.us') ?
                        { subject: contact.subject || chats.subject || '' } :
                        { name: contact.notify || chats.name || chats.notify || '' })
                } || {})
            }
        }
    }
    conn.ev.on('contacts.upsert', updateNameToDb)
    conn.ev.on('groups.update', updateNameToDb)
    conn.ev.on('chats.set', async ({ chats }) => {
        for (let { id, name, readOnly } of chats) {
            id = conn.decodeJid(id)
            if (!id) continue
            const isGroup = id.endsWith('@g.us')
            let chats = conn.chats[id]
            if (!chats) chats = conn.chats[id] = { id }
            chats.isChats = !readOnly
            if (name) chats[isGroup ? 'subject' : 'name'] = name
            if (isGroup) {
                const metadata = await conn.groupMetadata(id).catch(_ => null)
                if (!metadata) continue
                chats.subject = name || metadata.subject
                chats.metadata = metadata
            }
        }
    })

    conn.logger = {
        ...conn.logger,
        info(...args) { console.log(chalk.bold.rgb(57, 183, 16)(`INFO [${new Date()}]:`), chalk.cyan(util.format(...args))) },
        error(...args) { console.log(chalk.bold.rgb(247, 38, 33)(`ERROR [${new Date()}]:`), chalk.rgb(255, 38, 0)(util.format(...args))) },
        warn(...args) { console.log(chalk.bold.rgb(239, 225, 3)(`WARNING [${new Date()}]:`), chalk.keyword('orange')(util.format(...args))) }
    }

    conn.getFile = async (PATH, returnAsFilename) => {
        let res, filename
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
        let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
        if (data && returnAsFilename && !filename) {
            filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + type.ext)
            await fs.promises.writeFile(filename, data)
        }
        return { res, filename, ...type, data }
    }

    conn.resize = async (buffer, uk1, uk2) => {
        let j = await jimp.read(buffer)
        return await j.resize(uk1, uk2).getBufferAsync(jimp.MIME_JPEG)
    }

    conn.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await conn.getFile(path, true)
        let { res, data: file, filename: pathFile } = type
        if (res && res.status !== 200 || file.length <= 65536) {
            try { throw { json: JSON.parse(file.toString()) } }
            catch (e) { if (e.json) throw e.json }
        }
        let opt = { filename }
        if (quoted) opt.quoted = quoted
        let mtype = '', mimetype = type.mime
        if (/webp/.test(type.mime)) mtype = 'sticker'
        else if (/image/.test(type.mime)) mtype = 'image'
        else if (/video/.test(type.mime)) mtype = 'video'
        else if (/audio/.test(type.mime)) {
            let convert = await (ptt ? toPTT : toAudio)(file, type.ext)
            file = convert.data
            pathFile = convert.filename
            mtype = 'audio'
            mimetype = 'audio/ogg; codecs=opus'
        }
        else mtype = 'document'
        return await conn.sendMessage(jid, {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathFile },
            mimetype
        }, { ...opt, ...options })
    }

    conn.reply = (jid, text = '', quoted, options) => {
        return Buffer.isBuffer(text) ? conn.sendFile(jid, text, 'file', '', quoted, false, options) : conn.sendMessage(jid, { ...options, text, mentions: conn.parseMention(text) }, { quoted, ...options })
    }

    conn.parseMention = (text = '') => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
    }

    conn.getName = (jid = "", withoutContact = false) => {
        jid = conn.decodeJid(jid)
        if (jid.endsWith("@g.us")) return (conn.chats[jid]?.subject) || jid
        if (jid === "0@s.whatsapp.net") return "WhatsApp"
        if (areJidsSameUser(jid, conn.user?.id)) return conn.user?.name || "Me"
        return conn.chats[jid]?.name || conn.chats[jid]?.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international") || jid.split("@")[0]
    }

    conn.downloadM = async (m, type, saveToFile) => {
        if (!m || !(m.url || m.directPath)) return Buffer.alloc(0)
        const stream = await downloadContentFromMessage(m, type)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        if (saveToFile) {
            let { filename } = await conn.getFile(buffer, true)
            return filename
        }
        return buffer
    }

    conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(quoted, messageType)
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        let type = await FileType.fromBuffer(buffer)
        let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    conn.copyNForward = async (jid, message, forwardingScore = true, options = {}) => {
        let m = generateForwardMessageContent(message, !!forwardingScore)
        let mtype = Object.keys(m)[0]
        if (forwardingScore && typeof forwardingScore == 'number' && forwardingScore > 1) m[mtype].contextInfo.forwardingScore += forwardingScore
        m = generateWAMessageFromContent(jid, m, { ...options, userJid: conn.user.id })
        await conn.relayMessage(jid, m.message, { messageId: m.key.id, additionalAttributes: { ...options } })
        return m
    }

    conn.processMessageStubType = async(m) => {
        if (!m.messageStubType) return
        const chat = conn.decodeJid(m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || '')
        if (!chat || chat === 'status@broadcast') return
        const isGroup = chat.endsWith('@g.us')
        if (!isGroup) return
        let chats = conn.chats[chat]
        if (!chats) chats = conn.chats[chat] = { id: chat }
        chats.isChats = true
        const metadata = await conn.groupMetadata(chat).catch(_ => null)
        if (!metadata) return
        chats.subject = metadata.subject
        chats.metadata = metadata
    }

    conn.insertAllGroup = async() => {
        const groups = await conn.groupFetchAllParticipating().catch(_ => null) || {}
        for (const group in groups) conn.chats[group] = { ...(conn.chats[group] || {}), id: group, subject: groups[group].subject, isChats: true, metadata: groups[group] }
        return conn.chats
    }

    conn.pushMessage = async(m) => {
        if (!m) return
        if (!Array.isArray(m)) m = [m]
        for (const message of m) {
            try {
                if (!message) continue
                if (message.messageStubType && message.messageStubType != WAMessageStubType.CIPHERTEXT) conn.processMessageStubType(message).catch(console.error)
                const _mtype = Object.keys(message.message || {})
                const mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(_mtype[0]) && _mtype[0]) || (_mtype.length >= 3 && _mtype[1] !== 'messageContextInfo' && _mtype[1]) || _mtype[_mtype.length - 1]
                const chat = conn.decodeJid(message.key.remoteJid || message.message?.senderKeyDistributionMessage?.groupId || '')
                if (!chat || chat === 'status@broadcast') continue
                const isGroup = chat.endsWith('@g.us')
                let chats = conn.chats[chat]
                if (!chats) {
                    if (isGroup) await conn.insertAllGroup().catch(console.error)
                    chats = conn.chats[chat] = { id: chat, isChats: true, ...(conn.chats[chat] || {}) }
                }
                const fromMe = message.key.fromMe || areJidsSameUser(message.key.participant || chat, conn.user.id)
                if (!['protocolMessage'].includes(mtype) && !fromMe && message.messageStubType != WAMessageStubType.CIPHERTEXT && message.message) {
                    chats.messages = chats.messages || {}
                    chats.messages[message.key.id] = JSON.parse(JSON.stringify(message, null, 2))
                    let qChatsMessages = Object.entries(chats.messages)
                    if (qChatsMessages.length > 40) chats.messages = Object.fromEntries(qChatsMessages.slice(qChatsMessages.length - 40))
                }
            } catch (e) {
                console.error(e)
            }
        }
    }

    return conn
}

exports.smsg = (conn, m) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    m = M.create(m)
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id && (m.id.length === 22 || m.id.startsWith('3EB0'))
        m.chat = conn.decodeJid(m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || '')
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = conn.decodeJid(m.key.fromMe ? conn.user.id : (m.key.participant || m.key.remoteJid || ''))
        m.fromMe = m.key.fromMe || areJidsSameUser(m.sender, conn.user.id)
    }
    if (m.message) {
        let mtype = Object.keys(m.message)
        m.mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(mtype[0]) && mtype[0]) || (mtype.length >= 3 && mtype[1] !== 'messageContextInfo' && mtype[1]) || mtype[mtype.length - 1]
        m.msg = m.message[m.mtype]
        m.text = m.msg?.text || m.msg?.caption || m.msg?.contentText || m.msg || ''
        if (typeof m.text !== 'string') m.text = ''
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || []
        let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage ? m.msg.contextInfo.quotedMessage : null
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0]
            m.quoted = m.quoted[type]
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = conn.decodeJid(m.msg.contextInfo.remoteJid || m.chat)
            m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = areJidsSameUser(m.quoted.sender, conn.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || ''
            m.quoted.name = conn.getName(m.quoted.sender)
            if (m.quoted.url || m.quoted.directPath) m.quoted.download = (saveToFile = false) => conn.downloadM(m.quoted, m.quoted.mtype.replace(/message/i, ''), saveToFile)
            m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id, participant: m.quoted.sender } })
        }
    }
    m.name = m.pushName || conn.getName(m.sender)
    if (m.msg && (m.msg.url || m.msg.directPath)) m.download = (saveToFile = false) => conn.downloadM(m.msg, m.mtype.replace(/message/i, ''), saveToFile)
    m.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m, options)
    m.delete = () => conn.sendMessage(m.chat, { delete: m.key })
    return m
}

exports.protoType = () => {
    String.prototype.capitalize = function () { return this.charAt(0).toUpperCase() + this.slice(1) }
    String.prototype.capitalizeV2 = function () { return this.split(' ').map(v => v.capitalize()).join(' ') }
    String.prototype.decodeJid = function () {
        if (/:\d+@/gi.test(this)) {
            const decode = jidDecode(this) || {}
            return (decode.user && decode.server && decode.user + '@' + decode.server || this).trim()
        } else return this.trim()
    }
    Number.prototype.getRandom = String.prototype.getRandom = Array.prototype.getRandom = function () {
        if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)]
        return Math.floor(Math.random() * this)
    }
    Number.prototype.toTimeString = function () {
        const seconds = Math.floor((this / 1000) % 60), minutes = Math.floor((this / (60 * 1000)) % 60), hours = Math.floor((this / (60 * 60 * 1000)) % 24), days = Math.floor(this / (24 * 60 * 60 * 1000))
        return ( (days ? `${days} day(s) ` : '') + (hours ? `${hours} hour(s) ` : '') + (minutes ? `${minutes} minute(s) ` : '') + (seconds ? `${seconds} second(s)` : '') ).trim()
    }
}
