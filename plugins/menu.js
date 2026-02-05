const {
    BufferJSON,
    WA_DEFAULT_EPHEMERAL,
    generateWAMessageFromContent,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    prepareWAMessageMedia,
    areJidsSameUser,
    getContentType
} = require('@adiwajshing/baileys');

process.env.TZ = 'Asia/Jakarta';
let fs = require('fs');
let path = require('path');
let fetch = require('node-fetch');
let moment = require('moment-timezone');
let levelling = require('../lib/levelling');
let os = require('os');

let arrayMenu = [
    'all', 'main', 'owner', 'info', 'ai', 'group', 'internet', 'downloader', 'xp',
    'rpg', 'rpgG', 'maker', 'fun', 'jadian', 'kerang', 'game', 'tools',
    'advanced', 'anonymous', 'database', 'github', 'voice', 'store', ''
];

const allTags = {
    'all': 'SEMUA MENU',
    'main': "MENU UTAMA",
    'owner': "MENU OWNER",
    'info': "MENU INFO",
    'ai': "MENU OPENAI",
    'group': "MENU GROUP",
    'internet': "INTERNET",
    'downloader': "MENU DOWNLOADER",
    'xp': "MENU EXP",
    'rpg': "MENU RPG",
    'rpgG': "MENU GUILD RPG",
    'maker': "MENU MAKER",
    'fun': "MENU FUN",
    'jadian': "MENU PASANGAN",
    'kerang': "MENU KERANG",
    'game': "MENU GAME",
    'tools': "MENU TOOLS",
    'advanced': "ADVANCED",
    'anonymous': "ANONYMOUS CHAT",
    'database': 'MENU DATABASE',
    'github': 'MENU GITHUB',
    'voice': 'PENGUBAH SUARA',
    'store': 'MENU STORE',
    '': "NO CATEGORY"
};

const defaultMenu = {
    before: `
> *T I M E*
> %wib WIB
> %wita WITA
> %wit WIT

> *D A T E*
> *Hari*: %week
> *Tanggal*: %date
> *Tahun Baru*: -%dateCountdown hari, %hours jam, %minutes menit, %seconds detik lagi menuju tahun baru!

> *B O T   I N F O*
> *Memory*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB
> *Platform*: %platformInfo
> *Informasi*: %infomem
> *Free Memory*: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB
> *Total Memory*: ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB
> *Uptime*: %uptime (%muptime)
> *Database*: %totalreg dari %rtotalreg

> *U S E R   I N F O*
> *Limit*: %limit
> *Level*: %level
> *XP*: %totalexp

*NOTE* :
*_Jika Ada Fitur Yang Error, Tolong Segera Lapor Kepada Owner. Dengan Mengetik (.ʀᴇᴘᴏʀᴛ)._*
    `.trimStart(),
    header: '╭─   *`%category`* ',
    body: `> %cmd %islimit %isPremium`,
    footer: "╰─────────── –\n",
    after: `*RimuruBeta By Dmsss*`,
};

let handler = async (m, { conn, usedPrefix: _p, args = [] }) => {
    try {
        let package = JSON.parse(await fs.promises.readFile(path.join(__dirname, '../package.json')).catch(_ => '{}'));
        let { exp, limit, level, role } = global.db.data.users[m.sender] || {};
        let { min, xp, max } = levelling.xpRange(level, global.multiplier);

        let name = `@${m.sender.split`@`[0]}`;
        let teks = args[0] || '';

        let d = new Date(new Date() + 3600000);
        let locale = 'id';
        const wib = moment.tz('Asia/Jakarta').format("HH:mm:ss");
        const wita = moment.tz('Asia/Makassar').format("HH:mm:ss");
        const wit = moment.tz('Asia/Jayapura').format("HH:mm:ss");
        let week = d.toLocaleDateString(locale, { weekday: 'long' });
        let date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

        // Menghitung penyamaan tahun baru
        let dateCountdown = moment('2026-01-01').diff(moment(), 'days');

        // Hitung sisa waktu menuju tahun baru
        let newYear = moment('2026-01-01');
        let duration = moment.duration(newYear.diff(moment()));
        let hours = duration.hours();
        let minutes = duration.minutes();
        let seconds = duration.seconds();

        let platformInfo = `${os.platform()} ${os.arch()}`;
        let infomem = `${os.arch()}, ${os.release()}`;
        let uptime = clockString(process.uptime() * 1000);
        let muptime = clockString(process.uptime() * 1000);
        let totalreg = Object.keys(global.db.data.users).length;

        let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
            return {
                help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
                tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
                prefix: 'customPrefix' in plugin,
                limit: plugin.limit,
                premium: plugin.premium,
                enabled: !plugin.disabled,
            };
        });

        // Fungsi untuk mengucapkan salam berdasarkan waktu
        function ucapan() {
            const hour_now = moment.tz('Asia/Jakarta').format('HH'); // Mengambil jam saat ini
            if (hour_now >= '03' && hour_now < '10') return 'Pagi kak🌄';
            if (hour_now >= '10' && hour_now < '15') return 'Siang kak🌅';
            if (hour_now >= '15' && hour_now < '17') return 'Sore kak🌇';
            if (hour_now >= '17' && hour_now < '18') return 'Selamat Petang kak🌉';
            if (hour_now >= '18' && hour_now < '23') return 'Malam kak🌃';
            return 'Selamat Malam!🌙'; // Default jika di luar jam yang ditentukan
        }

        if (!teks) {
            let menuList = `${defaultMenu.before}\n\n╭─  ◦ *DAFTAR MENU*\n`;
            for (let tag of arrayMenu) {
                if (tag && allTags[tag]) {
                    menuList += `┊ ${_p}menu ${tag}\n`;
                }
            }
            menuList += `╰─────────────  \n\n${defaultMenu.after}`;

            let replace = {
                '%': '%',
                p: _p,
                uptime,
                muptime,
                name,
                date,
                week,
                dateCountdown,
                wib,
                wita,
                wit,
                limit,
                level,
                exp,
                totalexp: exp,
                platformInfo,
                infomem,
                totalreg,
                rtotalreg: totalreg,
                hours: hours,
                minutes: minutes,
                seconds: seconds
            };

            let text = menuList.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'),
                (_, name) => '' + replace[name]);

            await conn.relayMessage(m.chat, {
                extendedTextMessage: {
                    text: text,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        externalAdReply: {
                            title: ucapan(),  // Menggunakan ucapan yang tepat
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnailUrl: 'https://i.pinimg.com/736x/ec/63/bd/ec63bd973d649637c460f84c717b307d.jpg',
                        sourceUrl: 'https://whatsapp.com/channel/0029VaCvaNgBPzjcfrTixA1U'
                    }
                    },
                    mentions: [m.sender]
                }
            }, {});
            return;
        }

        if (!allTags[teks]) {
            return m.reply(`Menu "${teks}" tidak tersedia.\nSilakan ketik ${_p}menu untuk melihat daftar menu.`);
        }

        let menuCategory = defaultMenu.before + '\n\n';

        if (teks === 'all') {
            for (let tag of arrayMenu) {
                if (tag !== 'all' && allTags[tag]) {
                    menuCategory += defaultMenu.header.replace(/%category/g, allTags[tag]) + '\n';

                    let categoryCommands = help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help);
                    for (let menu of categoryCommands) {
                        for (let helpItem of menu.help) {
                            menuCategory += defaultMenu.body
                                .replace(/%cmd/g, menu.prefix ? helpItem : _p + helpItem)
                                .replace(/%islimit/g, menu.limit ? '(Ⓛ)' : '')
                                .replace(/%isPremium/g, menu.premium ? '(Ⓟ)' : '') + '\n';
                        }
                    }
                    menuCategory += defaultMenu.footer + '\n';
                }
            }
        } else {
            menuCategory += defaultMenu.header.replace(/%category/g, allTags[teks]) + '\n';

            let categoryCommands = help.filter(menu => menu.tags && menu.tags.includes(teks) && menu.help);
            for (let menu of categoryCommands) {
                for (let helpItem of menu.help) {
                    menuCategory += defaultMenu.body
                        .replace(/%cmd/g, menu.prefix ? helpItem : _p + helpItem)
                        .replace(/%islimit/g, menu.limit ? '(Ⓛ)' : '')
                        .replace(/%isPremium/g, menu.premium ? '(Ⓟ)' : '') + '\n';
                }
            }
            menuCategory += defaultMenu.footer + '\n';
        }

        menuCategory += '\n' + defaultMenu.after;

        let replace = {
            '%': '%',
            p: _p,
            uptime,
            muptime,
            name,
            date,
            week,
            dateCountdown,
            wib,
            wita,
            wit,
            limit,
            level,
            exp,
            totalexp: exp,
            platformInfo,
            infomem,
            totalreg,
            rtotalreg: totalreg,
            hours: hours,
            minutes: minutes,
            seconds: seconds
        };

        let text = menuCategory.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'),
            (_, name) => '' + replace[name]);

        await conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: text,
                contextInfo: {
                    mentionedJid: [m.sender],
                    externalAdReply: {
                        title: ucapan(),  // Menggunakan ucapan yang tepat
                        mediaType: 1,
                        previewType: 0,
                        renderLargerThumbnail: true,
                        thumbnailUrl: 'https://i.pinimg.com/736x/ec/63/bd/ec63bd973d649637c460f84c717b307d.jpg',
                        sourceUrl: 'https://whatsapp.com/channel/0029VaCvaNgBPzjcfrTixA1U'
                    }
                },
                mentions: [m.sender]
            }
        }, {});
    } catch (e) {
        conn.reply(m.chat, 'Maaf, menu sedang error', m);
        console.error(e);
    }
};

handler.help = ['menu'];
handler.tags = ['main'];
handler.command = /^(menu|help)$/i;
handler.exp = 3;


handler.register = true
module.exports = handler;

function clockString(ms) {
    if (isNaN(ms)) return '--';
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}
