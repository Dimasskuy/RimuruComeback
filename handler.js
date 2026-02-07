
const simple = require('./lib/simple');
const util = require('util');
const fs = require('fs');
const chalk = require('chalk');
const schema = require('./lib/schema');

const isNumber = x => typeof x === 'number' && !isNaN(x);
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms));

const initializedUsers = new Set();
const initializedChats = new Set();

// Categorize plugins once to save CPU
let categorizedPlugins = { all: [], before: [], command: [] };
function categorizePlugins() {
    categorizedPlugins = { all: [], before: [], command: [] };
    for (let name in global.plugins) {
        let plugin = global.plugins[name];
        if (!plugin || plugin.disabled) continue;
        if (typeof plugin.all === 'function') categorizedPlugins.all.push(plugin);
        if (typeof plugin.before === 'function') categorizedPlugins.before.push(plugin);
        if (typeof plugin === 'function') categorizedPlugins.command.push({ name, plugin });
    }
}

module.exports = {
    async handler(chatUpdate) {
        if (global.db.data == null) await global.loadDatabase();
        this.msgqueque = this.msgqueque || [];
        if (!chatUpdate) return;

        // Categorize if not done yet or if plugins changed
        if (categorizedPlugins.command.length === 0) categorizePlugins();

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

                // Optimize User Data Initialization
                let user = global.db.data.users[m.sender];
                if (!user || typeof user !== 'object') {
                    user = global.db.data.users[m.sender] = { ...schema.userDefaults };
                }
                
                if (!initializedUsers.has(m.sender)) {
                    for (let key in schema.userDefaults) {
                        if (!(key in user)) user[key] = schema.userDefaults[key];
                    }
                    if (!user.name) user.name = m.name || this.getName(m.sender);
                    initializedUsers.add(m.sender);
                }

                // Optimize Chat Data Initialization
                let chat = global.db.data.chats[m.chat];
                if (!chat || typeof chat !== 'object') {
                    chat = global.db.data.chats[m.chat] = { ...schema.chatDefaults };
                }
                
                if (!initializedChats.has(m.chat)) {
                    for (let key in schema.chatDefaults) {
                        if (!(key in chat)) chat[key] = schema.chatDefaults[key];
                    }
                    initializedChats.add(m.chat);
                }

                // Optimize Member GC Data
                if (m.isGroup) {
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
                            lastseen: 0
                        };
                    }
                }
            } catch (e) {
                console.error(e);
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

            // Plugin execution - all
            for (let plugin of categorizedPlugins.all) {
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
            const senderJid = m.sender;
            const ownerList = [
                this.decodeJid(this.user.id),
                ...global.owner,
                global.numberowner,
                ...(global.mods || []),
                ...(global.prems || [])
            ].map(v => v?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')

            let isROwner = ownerList.includes(senderJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net') ||
                          ownerList.includes(this.decodeJid(m.sender).replace(/[^0-9]/g, '') + '@s.whatsapp.net') ||
                          global.owner.some(v => v.replace(/[^0-9]/g, '') === m.sender.split('@')[0])

            let isOwner = isROwner || m.fromMe;
            let isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(senderJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
            let isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(senderJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net') || (_user.premiumTime > 0 || _user.premium);

            m.isROwner = isROwner
            m.isOwner = isOwner
            m.isMods = isMods
            m.isPrems = isPrems

            const groupMetadata = (m.isGroup ? (this.chats[m.chat] || {}).metadata || (await this.groupMetadata(m.chat).catch(() => null)) : {}) || {};
            const participants = (m.isGroup ? groupMetadata.participants : []) || [];
            const user = (m.isGroup ? participants.find((u) => this.getJid(u.id) === this.getJid(m.sender)) : {}) || {};
            const bot = (m.isGroup ? participants.find((u) => this.getJid(u.id) == this.decodeJid(this.user.id)) : {}) || {};
            const isAdmin = user?.admin == 'superadmin' || user?.admin == 'admin' || false;
            const isBotAdmin = bot?.admin || false;

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

            // Plugin execution - before
            let isSkipped = false;
            for (let plugin of categorizedPlugins.before) {
                let _prefix = plugin.customPrefix ? plugin.customPrefix : this.prefix ? this.prefix : global.prefix;
                let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                    Array.isArray(_prefix) ? _prefix.map(p => {
                        let re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
                        return [re.exec(m.text), re];
                    }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp]]
                ).find(p => p[1]);

                if (await plugin.before.call(this, m, {
                    match, conn: this, participants, groupMetadata, user, bot,
                    isROwner, isOwner, isAdmin, isBotAdmin, isPrems, chatUpdate,
                })) {
                    isSkipped = true;
                    break;
                }
            }
            if (isSkipped) return;

            // Plugin execution - command
            for (let { name, plugin } of categorizedPlugins.command) {
                if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) continue;

                let _prefix = plugin.customPrefix ? plugin.customPrefix : this.prefix ? this.prefix : global.prefix;
                let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                    Array.isArray(_prefix) ? _prefix.map(p => {
                        let re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
                        return [re.exec(m.text), re];
                    }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp]]
                ).find(p => p[1]);

                if ((usedPrefix = (match[0] || '')[0])) {
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
                    if (plugin.botAdmin && !isBotAdmin) { global.dfail('botAdmin', m, this); continue; }
                    if (plugin.admin && !isAdmin) { global.dfail('admin', m, this); continue; }
                    if (plugin.private && m.isGroup) { global.dfail('private', m, this); continue; }
                    if (plugin.register && !_user.registered) { global.dfail('unreg', m, this); continue; }

                    m.isCommand = true;
                    let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17;
                    if (xp > 200) m.reply('Ngecit -_-');
                    else m.exp += xp;

                    if (!isPrems && plugin.limit && global.db.data.users[m.sender].limit < plugin.limit * 1) {
                        this.reply(m.chat, `Limit anda habis, silahkan beli melalui *${usedPrefix}buy* atau beli di *${usedPrefix}shop*`, m);
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
                        console.error(e);
                        if (e) {
                            let text = util.format(e);
                            if (this.ws.readyState === 1) m.reply(text);
                        }
                    } finally {
                        if (typeof plugin.after === 'function') {
                            try { await plugin.after.call(this, m, extra); } catch (e) { console.error(e); }
                        }
                        if (m.limit && this.ws.readyState === 1) m.reply(+m.limit + ' Limit terpakai');
                    }
                    break;
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (opts['queque'] && m.text) {
                const index = this.msgqueque.indexOf(m.id || m.key.id);
                if (index !== -1) this.msgqueque.splice(index, 1);
            }
                let user, stats = global.db.data?.stats;
                if (m && global.db.data) {
                    if (m.sender && (user = global.db.data.users?.[m.sender])) {
                    user.exp += m.exp;
                    user.limit -= m.limit * 1;
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
        let groupMetadata = (this.chats[id] || {}).metadata || await this.groupMetadata(id).catch(() => null);
        if (!groupMetadata) return;

        for (let user of participants) {
            let jid = this.getJid(user);
            if (!jid || (!jid.includes('@s.whatsapp.net') && !jid.includes('@lid'))) continue;
            const isAdd = ['add', 'invite', 'invite_v4'].includes(action);
            let text = (isAdd ? (chat.sWelcome || 'Welcome, @user!') : (chat.sBye || 'Bye, @user!'))
                .replace('@subject', groupMetadata.subject || 'this group')
                .replace('@desc', groupMetadata.desc?.toString() || '')
                .replace('@user', '@' + jid.split('@')[0]);

            if (this.ws.readyState === 1) {
                await this.sendMessage(id, { text, mentions: [jid] }).catch(console.error);
            }
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
    if (global.reloadHandler) global.reloadHandler();
});
