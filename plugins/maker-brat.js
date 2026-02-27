const fetch = require('node-fetch');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Teksnya mana?\nContoh: *${usedPrefix + command}* Halo`;

    try {
        let url = `https://api.yupra.my.id/api/image/brat?text=${encodeURIComponent(text)}`;
        let res = await fetch(url);
        let imgBuffer = await res.buffer();
        
        if (!imgBuffer || imgBuffer.length === 0) throw 'Failed to fetch image';
        
        // Send as sticker using conn.sendImageAsSticker (same as .s command)
        await conn.sendImageAsSticker(m.chat, imgBuffer, m, { packname: global.packname, author: global.author });
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
