const { performance } = require('perf_hooks');
const os = require('os');

let handler = async (m, { conn, command }) => {
    try {
        let old = performance.now();
        let totalMem = os.totalmem();
        let freeMem = os.freemem();
        let usedMem = totalMem - freeMem;
        
        let cpuUsage = os.loadavg()[0]; // 1 minute load average
        let cpuCore = os.cpus().length;
        let cpuModel = os.cpus()[0].model;
        let OS = os.platform();

        await conn.reply(m.chat, `_Testing ${command}..._`, m);
        let neww = performance.now();

        let txt = `
*「 Status 」*
OS : *${OS}*
CPU Model : *${cpuModel}*
CPU Core : *${cpuCore} Core*
Load Avg (1m) : *${cpuUsage.toFixed(2)}*
Ram : *${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${Math.round((usedMem / totalMem) * 100)}%)*
Ping : *${(neww - old).toFixed(4)} ms*
Uptime : *${clockString(os.uptime() * 1000)}*
`.trim();

        conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: txt,
                contextInfo: {
                    externalAdReply: {
                        title: `Server Status`,
                        mediaType: 1,
                        previewType: 0,
                        renderLargerThumbnail: true,
                        thumbnailUrl: 'https://telegra.ph/file/ec8cf04e3a2890d3dce9c.jpg',
                        sourceUrl: ''
                    }
                },
                mentions: [m.sender]
            }
        }, {});
    } catch (e) {
        console.log(e);
        conn.reply(m.chat, 'Terjadi kesalahan.', m);
    }
};

handler.help = ['', 'bot'].map(v => 'status' + v);
handler.tags = ['info'];
handler.command = /^(bot)?stat(us)?(bot)?$/i;


handler.register = true
module.exports = handler;

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}
