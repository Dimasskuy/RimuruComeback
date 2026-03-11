const simple = require('./lib/simple');
const util = require('util');
const fs = require('fs');
const chalk = require('chalk');
const schema = require('./lib/schema');
const logger = require('./lib/logger');
const economyService = require('./lib/economyService');

const isNumber = x => typeof x === 'number' && !isNaN(x);
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms));

// Sets untuk tracking initialization - akan dibersihkan secara berkala
const initializedUsers = new Set();
const initializedChats = new Set();
const INIT_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 jam

// Cleanup Sets secara berkala untuk prevent memory leak
const initCleanupInterval = setInterval(() => {
    const userCount = initializedUsers.size;
    const chatCount = initializedChats.size;
    initializedUsers.clear();
    initializedChats.clear();
    if (userCount > 0 || chatCount > 0) {
        logger.debug(`[Handler] Cleaned up initialization sets: ${userCount} users, ${chatCount} chats`);
    }
}, INIT_CLEANUP_INTERVAL);

// Mutex/lock untuk prevent race condition pada user data operations
const userLocks = new Map();
const chatLocks = new Map();
const LOCK_TIMEOUT = 5000; // 5 detik timeout

/**
 * Acquire lock untuk user data (prevent race condition)
 * @param {string} key - User JID
 * @returns {Promise<Function>} Release function
 */
async function acquireUserLock(key) {
    const startTime = Date.now();
    while (userLocks.has(key)) {
        if (Date.now() - startTime > LOCK_TIMEOUT) {
            logger.warn(`[Handler] Lock timeout for user: ${key}`);
            break;
        }
        await delay(10);
    }
    userLocks.set(key, Date.now());
    return () => userLocks.delete(key);
}

/**
 * Acquire lock untuk chat data
 * @param {string} key - Chat JID
 * @returns {Promise<Function>} Release function
 */
async function acquireChatLock(key) {
    const startTime = Date.now();
    while (chatLocks.has(key)) {
        if (Date.now() - startTime > LOCK_TIMEOUT) {
            logger.warn(`[Handler] Lock timeout for chat: ${key}`);
            break;
        }
        await delay(10);
    }
    chatLocks.set(key, Date.now());
    return () => chatLocks.delete(key);
}

// Cleanup stale locks setiap 10 menit
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of userLocks.entries()) {
        if (typeof value === 'number' && now - value > LOCK_TIMEOUT * 2) {
            userLocks.delete(key);
        }
    }
    for (const [key, value] of chatLocks.entries()) {
        if (typeof value === 'number' && now - value > LOCK_TIMEOUT * 2) {
            chatLocks.delete(key);
        }
    }
}, 10 * 60 * 1000);

module.exports = {
    async handler(chatUpdate) {
        if (initializedUsers.size > 5000) initializedUsers.clear();
        if (initializedChats.size > 1000) initializedChats.clear();
        if (global.db.data == null) await global.loadDatabase();
        this.msgqueque = this.msgqueque || [];
        if (!chatUpdate) return;
        if (chatUpdate.messages.length > 1) logger.debug(`[Handler] Multiple messages: ${chatUpdate.messages.length}`);
        let m = chatUpdate.messages[chatUpdate.messages.length - 1];
        if (!m) return;

        try {
            m = simple.smsg(this, m) || m;
            if (!m) return;
            m.exp = 0;
            m.limit = false;

            try {
                if (!global.db.data) await global.loadDatabase();
                if (!global.db.data.users) global.db.data.users = {};
                if (!global.db.data.chats) global.db.data.chats = {};

                // Resolve LID if possible using existing data
                if (m.sender.endsWith('@lid') && global.db.data.isLid?.[m.sender]) {
                    m.sender = global.db.data.isLid[m.sender];
                }

                // Identity Merging dengan lock untuk prevent race condition
                if (!m.sender.endsWith('@lid')) {
                    const lid = global.db.data.jidToLid?.[m.sender];
                    if (lid && global.db.data.users[lid]) {
                        const releaseLock = await acquireUserLock(m.sender);
                        try {
                            // Re-check setelah acquire lock
                            if (global.db.data.users[lid]) {
                                global.db.data.users[m.sender] = {
                                    ...(global.db.data.users[m.sender] || {}),
                                    ...global.db.data.users[lid]
                                };
                                delete global.db.data.users[lid];
                                logger.info(`[Handler] Merged data from ${lid} to ${m.sender}`);
                            }
                        } finally {
                            releaseLock();
                        }
                    }
                }

                // Optimize User Data Initialization dengan lock
                const releaseUserLock = await acquireUserLock(m.sender);
                try {
                    let user = global.db.data.users[m.sender];
                    if (typeof user !== 'object') global.db.data.users[m.sender] = {};
                    user = global.db.data.users[m.sender];

                    if (user && !initializedUsers.has(m.sender)) {
                        for (let key in schema.userDefaults) {
                            let val = schema.userDefaults[key];
                            if (!(key in user)) user[key] = val;
                            else if (typeof val === 'number' && (typeof user[key] !== 'number' || isNaN(user[key]))) user[key] = val;
                        }
                        if (!user.name) user.name = m.name || this.getName(m.sender);
                        initializedUsers.add(m.sender);
                    }
                    user.lastseen = Date.now();
                } finally {
                    releaseUserLock();
                }

                // Optimize Chat Data Initialization dengan lock
                const releaseChatLock = await acquireChatLock(m.chat);
                try {
                    let chat = global.db.data.chats[m.chat];
                    if (typeof chat !== 'object') global.db.data.chats[m.chat] = {};
                    chat = global.db.data.chats[m.chat];

                    if (chat && !initializedChats.has(m.chat)) {
                        for (let key in schema.chatDefaults) {
                            let val = schema.chatDefaults[key];
                            if (!(key in chat)) chat[key] = val;
                            else if (typeof val === 'number' && (typeof chat[key] !== 'number' || isNaN(chat[key]))) chat[key] = val;
                        }
                        initializedChats.add(m.chat);
                    }

                    // Optimize Member GC Data
                    if (m.isGroup) {
                        // Identity Merging for Group Members
                        if (!m.sender.endsWith('@lid')) {
                            const lid = global.db.data.jidToLid?.[m.sender];
                            if (lid && chat.memgc?.[lid]) {
                                chat.memgc[m.sender] = {
                                    ...(chat.memgc[m.sender] || {}),
                                    ...chat.memgc[lid]
                                };
                                delete chat.memgc[lid];
                            }
                        }

                        let memgc = chat.memgc?.[m.sender];
                        if (typeof memgc !== 'object' || memgc === null) {
                            chat.memgc = chat.memgc || {};
                            chat.memgc[m.sender] = {
                                blacklist: false,
                                banned: false,
                                bannedTime: 0,
                                chat: 0,
                                chatTotal: 0,
                                command: 0,
                                commandTotal: 0,
                                lastseen: 0,
                                lastCmd: 0
                            };
                        }
                    }
                } finally {
                    releaseChatLock();
                }
            } catch (e) {
                logger.error(`[Handler] Database error: ${e.message}`, { sender: m.sender, chat: m.chat });
            }

            if (opts['nyimak']) return;
            if (!m.fromMe && opts['self']) return;
            if (opts['pconly'] && m.chat.endsWith('g.us')) return;
            if (opts['gconly'] && !m.chat.endsWith('g.us')) return;
            if (opts['swonly'] && m.chat !== 'status@broadcast') return;
            if (typeof m.text !== 'string') m.text = '';

            if (opts['queque'] && m.text) {
                this.msgqueque.push(m.id || m.key.id);
                await delay(Math.min(this.msgqueque.length, 10) * 500);
            }

            // Optimized Plugin execution
            const allPlugins = global.categorizedPlugins?.all || Object.keys(global.plugins).filter(name => typeof global.plugins[name].all === 'function');
            for (let name of allPlugins) {
                let plugin = global.plugins[name];
                if (!plugin || plugin.disabled) continue;
                try {
                    await plugin.all.call(this, m, chatUpdate);
                } catch (e) {
                    if (typeof e !== 'string') console.error(e);
                }
            }

            if (m.id.startsWith('3EB0') || (m.id.startsWith('BAE5') && m.id.length === 16 || m.isBaileys && m.fromMe)) return;
            m.exp += Math.ceil(Math.random() * 10);

            let usedPrefix;
            let _user = global.db.data.users[m.sender];

            // Fixed Robust Owner Detection
            const senderJid = this.getJid(m.sender);
            const ownerList = [
                this.decodeJid(this.user.id),
                ...global.owner,
                global.numberowner,
                ...(global.mods || []),
                ...(global.prems || [])
            ].map(v => v?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')

            let isROwner = ownerList.includes(senderJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net') ||
                          ownerList.includes(this.decodeJid(m.sender).replace(/[^0-9]/g, '') + '@s.whatsapp.net') ||
                          global.owner.some(v => v.replace(/[^0-9]/g, '') === (m.sender || '').split('@')[0]) ||
                          global.owner.some(v => v.replace(/[^0-9]/g, '') === (senderJid || '').split('@')[0]);

            let isOwner = isROwner || m.fromMe;
            let isMods = isOwner || global.mods.some(v => v.replace(/[^0-9]/g, '') === (m.sender || '').split('@')[0]) || global.mods.some(v => v.replace(/[^0-9]/g, '') === (senderJid || '').split('@')[0]);
            let isPrems = isROwner || global.prems.some(v => v.replace(/[^0-9]/g, '') === (m.sender || '').split('@')[0]) || global.prems.some(v => v.replace(/[^0-9]/g, '') === (senderJid || '').split('@')[0]) || (_user.premiumTime > 0 || _user.premium);

            m.isROwner = isROwner
            m.isOwner = isOwner
            m.isMods = isMods
            m.isPrems = isPrems

            let groupMetadata = (m.isGroup ? (this.chats[m.chat] || {}).metadata || (await this.groupMetadata(m.chat).catch(() => null)) : {}) || {};
            let participants = (m.isGroup ? groupMetadata.participants : []) || [];
            const findParticipant = (id) => participants.find((u) => simple.areJidsSameUser(u.id, id) || simple.areJidsSameUser(u.lid || '', id));

            let user = (m.isGroup ? findParticipant(m.sender) : {}) || {};
            let bot = (m.isGroup ? findParticipant(this.user.id) : {}) || {};

            let isAdmin = user?.admin == 'superadmin' || user?.admin == 'admin' || false;
            let isBotAdmin = bot?.admin == 'superadmin' || bot?.admin == 'admin' || false;

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

            // Optimized 'before' plugins (those without main function/command)
            const beforeOnlyPlugins = (global.categorizedPlugins?.before || []).filter(name => !global.categorizedPlugins.command.includes(name));
            for (let name of beforeOnlyPlugins) {
                let plugin = global.plugins[name];
                if (!plugin || plugin.disabled) continue;
                if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) continue;

                if (typeof plugin.before === 'function' && await plugin.before.call(this, m, {
                    match: [[null, null]], conn: this, participants, groupMetadata, user, bot,
                    isROwner, isOwner, isAdmin, isBotAdmin, isPrems, chatUpdate,
                })) break;
            }

            // Consolidated Plugin Loop
            const pluginsToRun = global.categorizedPlugins?.command || [];
            for (let name of pluginsToRun) {
                let plugin = global.plugins[name];
                if (!plugin || plugin.disabled) continue;
                if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) continue;

                const _prefix = plugin.customPrefix ? plugin.customPrefix : this.prefix ? this.prefix : global.prefix;
                const match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                    Array.isArray(_prefix) ? _prefix.map(p => {
                        let re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
                        return [re.exec(m.text), re];
                    }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp]]
                ).find(p => p[1]);

                // Run 'before' handler if exists
                if (typeof plugin.before === 'function') {
                    if (await plugin.before.call(this, m, {
                        match, conn: this, participants, groupMetadata, user, bot,
                        isROwner, isOwner, isAdmin, isBotAdmin, isPrems, chatUpdate,
                    })) continue; // Skip command part of THIS plugin if before returns true
                }

                // If it's a command, try to match and run
                const regexMatch = match[0];
                if (typeof plugin === 'function' && regexMatch && (usedPrefix = regexMatch[0])) {
                    let noPrefix = m.text.replace(usedPrefix, '');
                    let [command, ...args] = noPrefix.trim().split` `.filter(v => v);
                    args = args || [];
                    let _args = noPrefix.trim().split` `.slice(1);
                    let text = _args.join` `;
                    command = (command || '').toLowerCase();

                    let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) :
                        Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                        typeof plugin.command === 'string' ? plugin.command === command : false;

                    if (!isAccept) continue;
                    m.plugin = name;

                    if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                        let chat = global.db.data.chats[m.chat];
                        let user = global.db.data.users[m.sender];
                        if (!['group-modebot.js', 'owner-unbanchat.js', 'owner-exec.js', 'owner-exec2.js', 'tool-delete.js'].includes(name) && (chat?.isBanned || chat?.mute)) return;
                        if (name != 'unbanuser.js' && user && user.banned) return;
                        if (m.isGroup) {
                            chat.memgc[m.sender].command++;
                            chat.memgc[m.sender].commandTotal++;
                            chat.memgc[m.sender].lastCmd = Date.now();
                        }
                        user.command = (user.command || 0) + 1;
                        user.commandTotal = (user.commandTotal || 0) + 1;
                        user.lastCmd = Date.now();
                    }

                    if (plugin.rowner && !isROwner) { global.dfail('rowner', m, this); continue; }
                    if (plugin.owner && !isOwner) { global.dfail('owner', m, this); continue; }
                    if (plugin.mods && !isMods) { global.dfail('mods', m, this); continue; }
                    if (plugin.premium && !isPrems) { global.dfail('premium', m, this); continue; }
                    if (plugin.group && !m.isGroup) { global.dfail('group', m, this); continue; }
                    if (m.isGroup && ((plugin.botAdmin && !isBotAdmin) || (plugin.admin && !isAdmin))) {
                        let freshMetadata = await this.groupMetadata(m.chat).catch(() => null);
                        if (freshMetadata) {
                            groupMetadata = freshMetadata;
                            if (this.chats[m.chat]) this.chats[m.chat].metadata = groupMetadata;
                            participants = groupMetadata.participants || [];
                            user = findParticipant(m.sender) || {};
                            bot = findParticipant(this.user.id) || {};
                            isAdmin = user?.admin == 'superadmin' || user?.admin == 'admin' || false;
                            isBotAdmin = bot?.admin == 'superadmin' || bot?.admin == 'admin' || false;
                        }
                    }

                    if (plugin.botAdmin && !isBotAdmin) { global.dfail('botAdmin', m, this); continue; }
                    if (plugin.admin && !isAdmin) { global.dfail('admin', m, this); continue; }
                    if (plugin.private && m.isGroup) { global.dfail('private', m, this); continue; }
                    if (plugin.register && !_user.registered) { global.dfail('unreg', m, this); continue; }

                    m.isCommand = true;
                    let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17;
                    if (xp > 200) m.reply('Ngecit -_-');
                    else m.exp += xp;

                    if (!isPrems && plugin.limit && global.db.data.users[m.sender].limit < plugin.limit * 1) {
                        const methods = (global.gameplay?.limit_acquisition_methods || []).join(', ') || 'purchase';
                        this.reply(m.chat, `Limit Anda habis. Cara mendapatkan limit: ${methods}`, m);
                        economyService.recordAudit({
                            user: m.sender,
                            action: 'limit.exhausted',
                            status: 'blocked',
                            meta: { command, methods }
                        });
                        continue;
                    }
                    if (plugin.level > _user.level) {
                        this.reply(m.chat, `diperlukan level ${plugin.level} untuk menggunakan perintah ini. Level kamu ${_user.level}\n gunakan .levelup untuk menaikan level!`, m);
                        continue;
                    }

                    let extra = {
                        match, usedPrefix, noPrefix, _args, args, command, text,
                        conn: this, participants, groupMetadata, user, bot,
                        isROwner, isOwner, isAdmin, isBotAdmin, isPrems, chatUpdate,
                    };
                    try {
                        await plugin.call(this, m, extra);
                        if (!isPrems) m.limit = m.limit || plugin.limit || false;
                    } catch (e) {
                        m.error = e;
                        logger.error(`[Plugin Error] ${m.plugin || 'unknown'}: ${e.message}`);
                        if (e) {
                            let text = util.format(e);
                            m.reply(text);
                        }
                    } finally {
                        if (typeof plugin.after === 'function') {
                            try { await plugin.after.call(this, m, extra); } catch (e) { logger.error(`[Plugin After Error] ${m.plugin || 'unknown'}: ${e.message}`); }
                        }
                    }
                    break;
                }
            }
        } catch (e) {
            logger.error(`[Handler Error] ${e.message}`, { stack: e.stack });
        } finally {
            if (opts['queque'] && m.text) {
                const index = this.msgqueque.indexOf(m.id || m.key.id);
                if (index !== -1) this.msgqueque.splice(index, 1);
            }
                let user, stats = global.db.data?.stats;
                if (m && global.db.data) {
                    if (m.sender && (user = global.db.data.users?.[m.sender])) {
                    user.exp += m.exp;
                    if (!(user.premium || user.premiumTime > Date.now())) {
                        user.limit -= m.limit * 1;
                    }
                }

                    if (m.plugin && stats) {
                    let now = +new Date();
                    let stat = stats[m.plugin] = stats[m.plugin] || { total: 0, success: 0, last: 0, lastSuccess: 0 };
                    stat.total++;
                    stat.last = now;
                    if (!m.error) {
                        stat.success++;
                        stat.lastSuccess = now;
                    }
                }
            }

            try { require('./lib/print')(m, this); } catch (e) { console.log(m, m.quoted, e); }
            if (opts['autoread']) await this.readMessages([m.key]);
        }
    },

    async participantsUpdate({ id, participants, action }) {
        if (opts['self']) return;
        if (global.isInit) return;
        let chat = global.db.data.chats[id] || {};
        if (!chat.welcome) return;
        let groupMetadata = await this.groupMetadata(id).catch(() => null);
        if (!groupMetadata) return;

        for (let user of participants) {
            let jid = this.getJid(user);
            if (!jid || (!jid.includes('@s.whatsapp.net') && !jid.includes('@lid'))) continue;
            const isAdd = ['add', 'invite', 'invite_v4'].includes(action);
            let text = (isAdd ? (chat.sWelcome || 'Welcome, @user!') : (chat.sBye || 'Bye, @user!'))
                .replace('@subject', groupMetadata.subject || 'this group')
                .replace('@desc', groupMetadata.desc?.toString() || '')
                .replace('@user', '@' + jid.split('@')[0]);

            await this.sendMessage(id, { text, mentions: [jid] });
        }
    },

    async delete(key) {
        let { remoteJid, fromMe, id, participant } = key;
        if (fromMe) return;
        let chats = Object.entries(this.chats).find(([user, data]) => data.messages && data.messages[id]);
        if (!chats) return;
        let msg = JSON.parse(chats[1].messages[id]);
        let chat = global.db.data.chats[msg.key.remoteJid] || {};
        if (chat.delete) return;
        await this.reply(msg.key.remoteJid, `Terdeteksi @${participant.split`@`[0]} telah menghapus pesan\nUntuk mematikan fitur ini, ketik\n*.enable delete*`.trim(), msg, { mentions: [participant] });
        this.copyNForward(msg.key.remoteJid, msg).catch(e => console.log(e, msg));
    }
};

global.dfail = (type, m, conn) => {
    let msg = {
        rowner: 'Perintah ini hanya dapat digunakan oleh OWWNER',
        owner: 'Perintah ini hanya dapat digunakan oleh Owner Bot',
        mods: 'Perintah ini hanya dapat digunakan oleh Moderator',
        premium: 'Perintah ini hanya untuk member *Premium*',
        group: 'Perintah ini hanya dapat digunakan di grup!',
        private: 'Perintah ini hanya dapat digunakan di Chat Pribadi!',
        admin: 'Perintah ini hanya untuk *Admin* grup!',
        botAdmin: 'Jadikan bot sebagai *Admin* untuk menggunakan perintah ini!',
        unreg: 'Silahkan daftar untuk menggunakan fitur ini dengan cara mengetik:\n\n*#daftar nama.umur*\n\nContoh: *#daftar dms.16*',
        restrict: 'Fitur ini di *disable*!'
    }[type];
    if (msg) return m.reply(msg);
};

// Auto reload handler
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright("Update 'handler.js'"));
    delete require.cache[file];
    require(file);
});
