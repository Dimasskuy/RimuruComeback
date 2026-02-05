const axios = require('axios');
const yts = require('yt-search');

const mono = (text) => "```" + text + "```";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Judul Lagu!\n\nContoh:\n${usedPrefix}${command} Alan Walker Faded`);

    m.reply(global.wait);

    let search = null;
    let vid = null;
    let r = null;

    try {
        search = await yts(text);
        if(!search || !search.all || !search.videos || !search.videos.length) {
            throw mono('404 Not Found');
        }

        vid = search.videos[0];
        if(!vid || !vid.url) {
            throw mono('Video tidak ditemukan.');
        }

        r = await axios.get(`https://api.elrayyxml.web.id/api/downloader/ytmp3?url=${vid.url}`, {
            timeout: 20000
        });

        if (!r.data || !r.data.status || !r.data.result || !r.data.result.url) {
            throw mono('❌ Gagal mengambil data dari API.');
        }

        await conn.sendMessage(m.chat, {
            audio: { url: r.data.result.url },
            mimetype: 'audio/mpeg',
            fileName: (r.data.result.title || 'Audio') + '.mp3',
            contextInfo: { externalAdReply: {
                title: vid.title || 'Audio',
                body: vid.author?.name || 'Unknown',
                thumbnailUrl: vid.thumbnail || null,
                mediaType: 1,
                renderLargerThumbnail: true
            }}
        }, { quoted: m });
    } catch(e) {
        console.error('Play command error:', e);
        throw mono('❌ Gagal Play: ' + (e.message || 'Terjadi kesalahan'));
    } finally {
        search = null;
        vid = null;
        r = null;
    }
};

handler.help = ['play <judul>'];
handler.tags = ['downloader'];
handler.command = /^play$/i;
handler.limit = true;

module.exports = handler;
