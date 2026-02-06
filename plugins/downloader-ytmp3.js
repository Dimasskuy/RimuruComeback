const axios = require('axios');

const mono = (text) => "```" + text + "```";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Link YouTube!\n\nContoh:\n${usedPrefix}${command} https://youtu.be/xxxx`);

    m.reply(global.wait);

    let r = null;

    try {
        r = await axios.get(`https://api.deline.web.id/downloader/ytmp3?url=${encodeURIComponent(text)}`, {
            timeout: 20000
        });

        if (!r.data || !r.data.status || !r.data.result || !r.data.result.dlink) {
            throw mono('❌ Gagal mengambil data dari API.');
        }

        const title = r.data.result.youtube.title || 'Audio';
        const url = r.data.result.dlink;

        await conn.sendMessage(m.chat, {
            audio: { url: url },
            mimetype: 'audio/mpeg'
        }, { quoted: m });

        await conn.sendMessage(m.chat, {
            document: { url: url },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`
        }, { quoted: m });
    } catch(e) {
        console.error('YT MP3 Error:', e);
        throw mono('❌ Gagal YT MP3: ' + (e.message || 'Terjadi kesalahan'));
    } finally {
        r = null;
    }
};

handler.help = ['ytmp3 <url>'];
handler.tags = ['downloader'];
handler.command = /^ytmp3$/i;
handler.limit = true;


handler.register = true
module.exports = handler;
