const { Sticker, StickerTypes } = require('wa-sticker-formatter');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Teksnya mana?\nContoh: *${usedPrefix + command}* Halo`;

    try {
        let url = `https://api.yupra.my.id/api/image/brat?text=${encodeURIComponent(text)}`;
        let s = new Sticker(url, {
            pack: global.packname,
            author: global.author,
            type: StickerTypes.FULL
        });
        await conn.sendMessage(m.chat, { sticker: await s.toBuffer() }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply('❌ Gagal membuat Brat sticker.');
    }
};

handler.help = ['brat <teks>'];
handler.tags = ['maker'];
handler.command = /^brat$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;
