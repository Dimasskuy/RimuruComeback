
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

exports.areJidsSameUser = areJidsSameUser
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
const axios = require('axios');

const isLidCache = new LRUCache({
    ttl: 3 * 24 * 60 * 60 * 1000, // 3 days
    ttlAutopurge: true,
    updateAgeOnGet: true
});

exports.makeWASocket = (connectionOptions, options = {}) => {
    let conn = (global.opts && global.opts['legacy'] ? makeWALegacySocket : makeWASocket)(connectionOptions)

    conn.isLid = {
        set(key, value, ttlSeconds) {
            const options = {};
            if (ttlSeconds) options.ttl = ttlSeconds * 1000;
            isLidCache.set(key, value, options);
            if (global.db.data) {
                global.db.data.isLid = global.db.data.isLid || {};
                global.db.data.isLid[key] = value;
                global.db.data.jidToLid = global.db.data.jidToLid || {};
                global.db.data.jidToLid[value] = key;
            }
            return this;
        },
        get(key) {
            let val = isLidCache.get(key);
            if (!val && global.db.data?.isLid?.[key]) {
                val = global.db.data.isLid[key];
                isLidCache.set(key, val);
            }
            return val;
        },
        has(key) { return isLidCache.has(key) || !!global.db.data?.isLid?.[key]; },
        delete(key) {
            isLidCache.delete(key);
            if (global.db.data?.isLid) delete global.db.data.isLid[key];
            return this;
        },
        clear() {
            isLidCache.clear();
            if (global.db.data) global.db.data.isLid = {};
            return this;
        },
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

    conn.ev.on('group-participants.update', async function updateParticipantsToDb({ id, participants, action }) {
        id = conn.decodeJid(id)
        if (!(id in conn.chats)) conn.chats[id] = { id }
        conn.chats[id].isChats = true
        const groupMetadata = await conn.groupMetadata(id).catch(_ => null)
        if (!groupMetadata) return
        conn.chats[id] = {
            ...conn.chats[id],
            subject: groupMetadata.subject,
            metadata: groupMetadata
        }
    })

    conn.ev.on('presence.update', async function presenceUpdatePushToDb({ id, presences }) {
        const sender = Object.keys(presences)[0] || id
        const _sender = conn.decodeJid(sender)
        const presence = presences[sender]['lastKnownPresence'] || 'composing'
        let chats = conn.chats[_sender]
        if (!chats) chats = conn.chats[_sender] = { id: sender }
        chats.presences = presence
        if (id.endsWith('@g.us')) {
            let chats = conn.chats[id]
            if (!chats) {
                const metadata = await conn.groupMetadata(id).catch(_ => null)
                if (metadata) chats = conn.chats[id] = { id, subject: metadata.subject, metadata }
            }
            if (chats) chats.isChats = true
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

    conn.waitEvent = (eventName, is = () => true, maxTries = 25) => {
        return new Promise((resolve, reject) => {
            let tries = 0
            let on = (...args) => {
                if (++tries > maxTries) reject('Max tries reached')
                else if (is()) {
                    conn.ev.off(eventName, on)
                    resolve(...args)
                }
            }
            conn.ev.on(eventName, on)
        })
    }

    conn.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    conn.filter = (text) => {
      let mati = ["q", "w", "r", "t", "y", "p", "s", "d", "f", "g", "h", "j", "k", "l", "z", "x", "c", "v", "b", "n", "m"]
      if (/[aiueo][aiueo]([qwrtypsdfghjklzxcvbnm])?$/i.test(text)) return text.substring(text.length - 1)
      else {
        let res = Array.from(text).filter(v => mati.includes(v))
        let resu = res[res.length - 1]
        for (let huruf of mati) {
            if (text.endsWith(huruf)) {
                resu = res[res.length - 2]
            }
        }
        let misah = text.split(resu)
        return resu + misah[misah.length - 1]
      }
    }

    conn.msToDate = (ms) => {
      let days = Math.floor(ms / (24 * 60 * 60 * 1000));
      let daysms = ms % (24 * 60 * 60 * 1000);
      let hours = Math.floor((daysms) / (60 * 60 * 1000));
      let hoursms = ms % (60 * 60 * 1000);
      let minutes = Math.floor((hoursms) / (60 * 1000));
      let minutesms = ms % (60 * 1000);
      let sec = Math.floor((minutesms) / (1000));
      return days + " Hari " + hours + " Jam " + minutes + " Menit";
    }

    conn.rand = async (isi) => {
        return isi[Math.floor(Math.random() * isi.length)]
    }

    conn.resize = async (buffer, uk1, uk2) => {
        let j = await jimp.read(buffer)
        return await j.resize(uk1, uk2).getBufferAsync(jimp.MIME_JPEG)
    }

    conn.sendMedia = async (jid, path, quoted, options = {}) => {
        let { ext, mime, data } = await conn.getFile(path)
        let messageType = mime.split("/")[0]
        let pase = messageType.replace('application', 'document') || messageType
        return await conn.sendMessage(jid, { [`${pase}`]: data, mimetype: mime, ...options }, { quoted })
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

    conn.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        let buffer
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options)
        } else {
            buffer = await imageToWebp(buff)
        }
        await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        return buffer
    }

    conn.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        let buffer
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options)
        } else {
            buffer = await videoToWebp(buff)
        }
        await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        return buffer
    }

    conn.sendContact = async (jid, data, quoted, options) => {
        let contacts = []
        for (let [number, name] of data) {
            number = number.replace(/[^0-9]/g, '')
            let njid = number + '@s.whatsapp.net'
            let biz = await conn.getBusinessProfile(njid).catch(_ => ({})) || {}
            let vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${name.replace(/\n/g, '\\n')}
item1.TEL;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}
item1.X-ABLabel:Ponsel${biz.description ? `
PHOTO;BASE64:${(await conn.getFile(await conn.profilePictureUrl(njid).catch(_ => '')).catch(_ => ({})) || {}).data?.toString('base64')}
X-WA-BIZ-DESCRIPTION:${(biz.description || '').replace(/\n/g, '\\n')}
X-WA-BIZ-NAME:${(((conn.chats[njid] || {}) || { vname: conn.chats[njid]?.name }).vname || conn.getName(njid) || name).replace(/\n/, '\\n')}
`.trim() : ''}
END:VCARD
`.trim()
            contacts.push({ vcard, displayName: name })
        }
        return await conn.sendMessage(jid, {
            contacts: {
                ...options,
                displayName: (contacts.length > 1 ? `${contacts.length} kontak` : contacts[0].displayName) || null,
                contacts,
            },
            quoted, ...options
        })
    }

    conn.reply = (jid, text = '', quoted, options) => {
        return Buffer.isBuffer(text) ? conn.sendFile(jid, text, 'file', '', quoted, false, options) : conn.sendMessage(jid, { ...options, text, mentions: conn.parseMention(text) }, { quoted, ...options })
    }

    conn.sendText = (jid, text, quoted = '', options) => conn.sendMessage(jid, { text: text, ...options }, { quoted })

    conn.sendGroupV4Invite = async (jid, participant, inviteCode, inviteExpiration, groupName = 'unknown subject', caption = 'Invitation to join my WhatsApp group', options = {}) => {
        let msg = proto.Message.fromObject({
            groupInviteMessage: proto.GroupInviteMessage.fromObject({
                inviteCode,
                inviteExpiration: parseInt(inviteExpiration) || + new Date(new Date + (3 * 86400000)),
                groupJid: jid,
                groupName: groupName ? groupName : conn.getName(jid),
                caption
            })
        })
        let message = await conn.prepareWAMessageMedia({ text: caption }, { userJid: conn.user.jid }); // Placeholder
        // Actually, Baileys has a way to send this.
        return await conn.relayMessage(participant, msg, options)
    }

    conn.sendButton = async (jid, contentText, footer, buffer, buttons, quoted, options) => {
        if (buffer) try { buffer = (await conn.getFile(buffer)).data } catch { buffer = null }
        let message = {
            ...options,
            ...(buffer ? { caption: contentText || '' } : { text: contentText || '' }),
            footer,
            buttons: buttons.map(btn => ({
                buttonId: btn[1] || btn[0] || '',
                buttonText: { displayText: btn[0] || btn[1] || '' }
            })),
            ...(buffer ? { image: buffer } : {})
        }
        return await conn.sendMessage(jid, message, { quoted, ...options })
    }

    conn.sendButtonImg = async (jid, buffer, contentText, footerText, button1, id1, quoted, options) => {
        let type = await conn.getFile(buffer)
        let { data: file } = type
        const buttons = [{ buttonId: id1, buttonText: { displayText: button1 }, type: 1 }]
        const buttonMessage = {
            image: file,
            caption: contentText,
            footer: footerText,
            buttons: buttons,
            headerType: 4,
            ...options
        }
        return await conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }

    conn.send2ButtonImg = async (jid, buffer, contentText, footerText, button1, id1, button2, id2, quoted, options) => {
        let type = await conn.getFile(buffer)
        let { data: file } = type
        const buttons = [
            { buttonId: id1, buttonText: { displayText: button1 }, type: 1 },
            { buttonId: id2, buttonText: { displayText: button2 }, type: 1 }
        ]
        const buttonMessage = {
            image: file,
            caption: contentText,
            footer: footerText,
            buttons: buttons,
            headerType: 4,
            ...options
        }
        return await conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }

    conn.send3ButtonImg = async (jid, buffer, contentText, footerText, button1, id1, button2, id2, button3, id3, quoted, options) => {
        let type = await conn.getFile(buffer)
        let { data: file } = type
        const buttons = [
            { buttonId: id1, buttonText: { displayText: button1 }, type: 1 },
            { buttonId: id2, buttonText: { displayText: button2 }, type: 1 },
            { buttonId: id3, buttonText: { displayText: button3 }, type: 1 }
        ]
        const buttonMessage = {
            image: file,
            caption: contentText,
            footer: footerText,
            buttons: buttons,
            headerType: 4,
            ...options
        }
        return await conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }

    conn.sendH3Button = async (jid, content, displayText, link, displayCall, number, quickReplyText, id, quickReplyText2, id2, quickReplyText3, id3, quoted) => {
        let template = generateWAMessageFromContent(jid, proto.Message.fromObject({
            templateMessage: {
                hydratedTemplate: {
                    hydratedContentText: content,
                    hydratedButtons: [
                        { urlButton: { displayText, url: link } },
                        { callButton: { displayText: displayCall, phoneNumber: number } },
                        { quickReplyButton: { displayText: quickReplyText, id } },
                        { quickReplyButton: { displayText: quickReplyText2, id: id2 } },
                        { quickReplyButton: { displayText: quickReplyText3, id: id3 } }
                    ]
                }
            }
        }), { userJid: conn.user.jid, quoted });
        return await conn.relayMessage(jid, template.message, { messageId: template.key.id })
    }

    conn.sendHButtonLoc = async (jid, buffer, content, footer, distek, link1, quick1, id1, quoted) => {
        let template = generateWAMessageFromContent(jid, proto.Message.fromObject({
            templateMessage: {
                hydratedTemplate: {
                    hydratedContentText: content,
                    locationMessage: { jpegThumbnail: buffer },
                    hydratedFooterText: footer,
                    hydratedButtons: [
                        { urlButton: { displayText: distek, url: link1 } },
                        { quickReplyButton: { displayText: quick1, id: id1 } }
                    ]
                }
            }
        }), { userJid: conn.user.jid, quoted });
        return await conn.relayMessage(jid, template.message, { messageId: template.key.id })
    }

    conn.sendHButt = async (jid, content, distek, link, discall, number, retek, id, quoted) => {
        let template = generateWAMessageFromContent(jid, proto.Message.fromObject({
            templateMessage: {
                hydratedTemplate: {
                    hydratedContentText: content,
                    hydratedButtons: [
                        { urlButton: { displayText: distek, url: link } },
                        { callButton: { displayText: discall, phoneNumber: number } },
                        { quickReplyButton: { displayText: retek, id } }
                    ]
                }
            }
        }), { userJid: conn.user.jid, quoted });
        return await conn.relayMessage(jid, template.message, { messageId: template.key.id })
    }

    conn.sendButtonLoc = async (jid, buffer, content, footer, button1, row1, quoted, options = {}) => {
        let buttons = [{ buttonId: row1, buttonText: { displayText: button1 }, type: 1 }]
        let buttonMessage = {
            location: { jpegThumbnail: buffer },
            caption: content,
            footer: footer,
            buttons: buttons,
            headerType: 6
        }
        return await conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }

    conn.send2ButtonLoc = async (jid, buffer, content, footer, button1, row1, button2, row2, quoted, options = {}) => {
        let buttons = [
            { buttonId: row1, buttonText: { displayText: button1 }, type: 1 },
            { buttonId: row2, buttonText: { displayText: button2 }, type: 1 }
        ]
        let buttonMessage = {
            location: { jpegThumbnail: buffer },
            caption: content,
            footer: footer,
            buttons: buttons,
            headerType: 6
        }
        return await conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }

    conn.send3ButtonLoc = async (jid, buffer, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}) => {
        let buttons = [
            { buttonId: row1, buttonText: { displayText: button1 }, type: 1 },
            { buttonId: row2, buttonText: { displayText: button2 }, type: 1 },
            { buttonId: row3, buttonText: { displayText: button3 }, type: 1 }
        ]
        let buttonMessage = {
            location: { jpegThumbnail: buffer },
            caption: content,
            footer: footer,
            buttons: buttons,
            headerType: 6
        }
        return await conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }

    conn.sendButtonVid = async (jid, buffer, contentText, footerText, button1, id1, quoted, options) => {
        let type = await conn.getFile(buffer)
        let { data: file } = type
        let buttons = [{ buttonId: id1, buttonText: { displayText: button1 }, type: 1 }]
        const buttonMessage = {
            video: file,
            caption: contentText,
            footer: footerText,
            buttons: buttons,
            headerType: 4,
            ...options
        }
        return await conn.sendMessage(jid, buttonMessage, { quoted, ...options })
    }

    conn.cMod = (jid, message, text = '', sender = conn.user.jid, options = {}) => {
        let copy = message.toJSON()
        let mtype = Object.keys(copy.message)[0]
        let msg = copy.message[mtype]
        if (typeof msg === 'string') copy.message[mtype] = text || msg
        else if (msg.caption) msg.caption = text || msg.caption
        else if (msg.text) msg.text = text || msg.text
        if (typeof msg !== 'string') copy.message[mtype] = { ...msg, ...options }
        if (copy.participant) sender = copy.participant = sender || copy.participant
        else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
        if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
        else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
        copy.key.remoteJid = jid
        copy.key.fromMe = areJidsSameUser(sender, conn.user.id)
        return proto.WebMessageInfo.create(copy)
    }

    conn.cMods = (jid, message, text = '', sender = conn.user.jid, options = {}) => {
        return conn.cMod(jid, message, text, sender, options)
    }

    conn.copyNForward = async (jid, message, forwardingScore = true, options = {}) => {
        let m = generateForwardMessageContent(message, !!forwardingScore)
        let mtype = Object.keys(m)[0]
        if (forwardingScore && typeof forwardingScore == 'number' && forwardingScore > 1) m[mtype].contextInfo.forwardingScore += forwardingScore
        m = generateWAMessageFromContent(jid, m, { ...options, userJid: conn.user.id })
        await conn.relayMessage(jid, m.message, { messageId: m.key.id, additionalAttributes: { ...options } })
        return m
    }

    conn.fakeReply = (jid, text = '', fakeJid = conn.user.jid, fakeText = '', fakeGroupJid, options) => {
        return conn.reply(jid, text, { key: { fromMe: areJidsSameUser(fakeJid, conn.user.id), participant: fakeJid, ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {}) }, message: { conversation: fakeText }, ...options })
    }

    conn.loadMessage = (messageID) => {
        return Object.entries(conn.chats)
            .filter(([_, { messages }]) => typeof messages === 'object')
            .find(([_, { messages }]) => Object.entries(messages)
                .find(([k, v]) => (k === messageID || v.key?.id === messageID)))
            ?.[1].messages?.[messageID]
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
        let trueFileName = attachExtension ? (filename + '.' + (type?.ext || 'bin')) : filename
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    conn.parseMention = (text = '') => {
        if (!text) return []
        const match = [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((m) => m[1])
        const out = []
        for (const id of match) {
            const lid = `${id}@lid`
            const jid = conn.getJid(lid)
            if (jid && jid !== lid) out.push(jid)
            else out.push(`${id}@s.whatsapp.net`)
        }
        return [...new Set(out)]
    }

    conn.chatRead = async (jid, participant = conn.user.jid, messageID) => {
        return await conn.sendReadReceipt(jid, participant, [messageID])
    }

    conn.sendTextWithMentions = async (jid, text, quoted, options = {}) => conn.sendMessage(jid, { text: text, contextInfo: { mentionedJid: conn.parseMention(text) }, ...options }, { quoted })

    conn.getName = (jid = "", withoutContact = false) => {
        jid = conn.decodeJid(jid)
        if (jid.endsWith("@g.us")) return (conn.chats[jid]?.subject) || jid
        if (jid === "0@s.whatsapp.net") return "WhatsApp"
        if (areJidsSameUser(jid, conn.user?.id)) return conn.user?.name || "Me"
        return conn.chats[jid]?.name || conn.chats[jid]?.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international") || jid.split("@")[0]
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
        for (const group in groups) {
            conn.chats[group] = { ...(conn.chats[group] || {}), id: group, subject: groups[group].subject, isChats: true, metadata: groups[group] }
            if (groups[group].participants) {
                for (let p of groups[group].participants) {
                    const jid = conn.decodeJid(p.id)
                    const lid = p.lid || p.id
                    if (lid.endsWith('@lid') && jid.endsWith('@s.whatsapp.net')) {
                        conn.isLid.set(lid, jid)
                    }
                }
            }
        }
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
                    chats.messages[message.key.id] = JSON.parse(JSON.stringify(message))
                    let qChatsMessages = Object.keys(chats.messages)
                    if (qChatsMessages.length > 20) {
                        for (let i = 0; i < qChatsMessages.length - 20; i++) {
                            delete chats.messages[qChatsMessages[i]]
                        }
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
    }

    conn.getBuffer = async (url, options) => {
        try {
            const res = await axios({ method: "get", url, headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 }, ...options, responseType: 'arraybuffer' })
            return res.data
        } catch (e) {
            console.log(`Error : ${e}`)
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

        let chatJid = m.key.remoteJid;
        if (chatJid?.endsWith('@lid')) {
            const senderPn = m.key.senderPn || (m.key.participant?.endsWith('@s.whatsapp.net') ? m.key.participant : null);
            if (!m.isGroup && senderPn) {
                chatJid = senderPn;
            } else {
                chatJid = conn.getJid(chatJid) || chatJid;
            }
        }
        m.chat = conn.decodeJid(chatJid || m.message?.senderKeyDistributionMessage?.groupId || '');
        m.isGroup = m.chat.endsWith('@g.us')

        let senderJid = m.key.fromMe
            ? conn.user.id
            : m.key.participantPn || m.key.senderPn ||
              (m.key.remoteJid?.endsWith('@s.whatsapp.net') ? m.key.remoteJid : null)
              || conn.getJid(m.key.remoteJid || m.key.senderLid || m.key.participant || m.chat || '')
              || m.key.participant || m.key.senderLid || m.key.remoteJid || m.participant || m.chat || '';

        m.sender = conn.decodeJid(senderJid)
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
            let quotedChat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.chat = conn.decodeJid(quotedChat.endsWith('@lid') ? conn.getJid(quotedChat) : quotedChat);

            let quotedSender = m.msg.contextInfo.participantPn || m.msg.contextInfo.participant;
            m.quoted.sender = conn.getJid(quotedSender)
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
