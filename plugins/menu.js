let fs = require('fs');
let path = require('path');
let levelling = require('../lib/levelling');
let moment = require('moment-timezone');
let os = require('os');

process.env.TZ = 'Asia/Jakarta';

const defaultMenu = {
    before: `
👋 *Hai, %name!*
Selamat datang di Rimuru Bot RPG.

📊 *STATUS PEMAIN*
├ 🎖️ *Level:* %level
├ 💼 *Role:* %role
├ 💰 *Limit:* %limit
├ 📈 *XP:* %totalexp
└ ⏳ *Uptime:* %uptime

🗓️ *WAKTU SERVER*
├ 📅 %date
└ ⌚ %wib WIB

💡 *PETUNJUK PENGGUNAAN*
Ketik *%pmenu <kategori>* untuk melihat perintah spesifik.
Contoh: *%pmenu rpg*

📂 *KATEGORI MENU:*
`.trimStart(),
    header: '╭─── [ *%category* ] ───',
    body: '│ • %cmd %islimit %isPremium',
    footer: '╰───────────────────\n',
    after: `*RimuruBeta Project*`,
};

let handler = async (m, { conn, usedPrefix: _p, args = [] }) => {
    try {
        let { exp, limit, level, role } = global.db.data.users[m.sender];
        let { min, xp, max } = levelling.xpRange(level, global.multiplier);
        let name = conn.getName(m.sender);

        let d = new Date(Date.now() + 3600000);
        let locale = 'id';
        let date = d.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        let wib = moment.tz('Asia/Jakarta').format('HH:mm:ss');
        let uptime = clockString(process.uptime() * 1000);

        // Daftar Tags/Kategori
        let tags = {
            'main': 'UTAMA',
            'rpg': 'RPG & ADVENTURE',
            'game': 'GAME LAINNYA',
            'xp': 'EXP & LEVEL',
            'group': 'GROUP',
            'downloader': 'DOWNLOADER',
            'tools': 'TOOLS',
            'fun': 'FUN',
            'database': 'DATABASE',
            'owner': 'OWNER',
            'info': 'INFO BOT',
        };

        let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
            return {
                help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
                tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
                prefix: 'customPrefix' in plugin,
                limit: plugin.limit,
                premium: plugin.premium,
                enabled: !plugin.disabled,
            }
        });

        // Jika user hanya mengetik .menu (tanpa argumen)
        if (!args[0]) {
            let menuList = defaultMenu.before;
            for (let tag of Object.keys(tags)) {
                menuList += `│ • *${_p}menu ${tag}* (${tags[tag]})\n`;
            }
            menuList += `╰───────────────────\n\n${defaultMenu.after}`;

            // Replace variables
            let text = menuList.replace(/%name/g, name)
                .replace(/%level/g, level)
                .replace(/%role/g, role)
                .replace(/%limit/g, limit)
                .replace(/%totalexp/g, exp)
                .replace(/%uptime/g, uptime)
                .replace(/%date/g, date)
                .replace(/%wib/g, wib)
                .replace(/%p/g, _p);

            await conn.sendMessage(m.chat, {
                text: text,
                contextInfo: {
                    externalAdReply: {
                        title: "RIMURU RPG BOT",
                        body: "The Best WhatsApp RPG Bot",
                        thumbnailUrl: "https://telegra.ph/file/0b0d3d5f308899885239a.jpg",
                        sourceUrl: "https://github.com/dmsss",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });
            return;
        }

        // Jika user mengetik .menu <kategori>
        let tag = args[0].toLowerCase();
        if (!tags[tag]) {
            return m.reply(`Kategori "${tag}" tidak ditemukan.\nKetik *${_p}menu* untuk melihat daftar kategori.`);
        }

        let menuCategory = defaultMenu.header.replace(/%category/g, tags[tag]) + '\n';

        let commands = help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help);
        for (let menu of commands) {
            for (let helpItem of menu.help) {
                menuCategory += defaultMenu.body
                    .replace(/%cmd/g, menu.prefix ? helpItem : _p + helpItem)
                    .replace(/%islimit/g, menu.limit ? '(Limit)' : '')
                    .replace(/%isPremium/g, menu.premium ? '(Premium)' : '') + '\n';
            }
        }
        menuCategory += defaultMenu.footer + '\n' + defaultMenu.after;

        await m.reply(menuCategory);

    } catch (e) {
        conn.reply(m.chat, 'Maaf, menu sedang error', m);
        console.error(e);
    }
}

handler.help = ['menu', 'help'];
handler.tags = ['main'];
handler.command = /^(menu|help|\?)$/i;
handler.register = true;

module.exports = handler;

function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}
