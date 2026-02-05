const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Teksnya mana?\nContoh: *${usedPrefix + command}* Halo`;
    if (text.length > 300) throw 'Teks terlalu panjang! Maksimal 300 karakter.';

    m.reply(global.wait);
    try {
        let url = `https://api.yupra.my.id/api/video/bratv?text=${encodeURIComponent(text)}`;
        let res = await axios.get(url, { responseType: 'arraybuffer' });
        let s = new Sticker(res.data, {
            pack: global.packname,
            author: global.author,
            type: StickerTypes.ANIMATED,
            quality: 15
        });
        await conn.sendMessage(m.chat, { sticker: await s.toBuffer() }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply('❌ Gagal membuat Brat video sticker.');
    }
};

handler.help = ['bratvid <teks>'];
handler.tags = ['maker'];
handler.command = /^(bratvid|bratv)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;
