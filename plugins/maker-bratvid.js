const fetch = require('node-fetch');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Teksnya mana?\nContoh: *${usedPrefix + command}* Halo`;
    if (text.length > 300) throw 'Teks terlalu panjang! Maksimal 300 karakter.';

    try {
        let url = `https://api.yupra.my.id/api/video/bratv?text=${encodeURIComponent(text)}`;
        let res = await fetch(url);
        let videoBuffer = await res.buffer();
        
        if (!videoBuffer || videoBuffer.length === 0) throw 'Failed to fetch video';
        
        // Send as sticker using conn.sendVideoAsSticker (same as .s command for video)
        await conn.sendVideoAsSticker(m.chat, videoBuffer, m, { packname: global.packname, author: global.author });
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
