const { Sticker, StickerTypes } = require('wa-sticker-formatter');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';
    if (!/webp/.test(mime)) throw `Balas stiker dengan caption *${usedPrefix + command}* packname|author`;

    let [packname, author] = text.split('|');
    packname = packname || global.packname;
    author = author || global.author;

    try {
        let buffer = await q.download();
        let s = new Sticker(buffer, {
            pack: packname,
            author: author,
            type: StickerTypes.FULL
        });
        await conn.sendMessage(m.chat, { sticker: await s.toBuffer() }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply('❌ Gagal mengubah WM stiker.');
    }
};

handler.help = ['swm <packname>|<author>'];
handler.tags = ['maker'];
handler.command = /^(swm|wm|stickerwm)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;
