const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { tmpdir } = require('os');
const webp = require('node-webpmux');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';
    if (!/webp/.test(mime)) throw `Balas stiker dengan caption *${usedPrefix + command}* packname|author`;

    // Split by | if exists
    let packname, author;
    if (text && text.includes('|')) {
        [packname, author] = text.split('|');
        packname = packname || global.packname;
        author = author || global.author;
    } else {
        // Only packname, no author
        packname = text || global.packname;
        author = '';
    }

    try {
        let buffer = await q.download();
        
        // Create temp files
        const tmpFileIn = path.join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
        const tmpFileOut = path.join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
        
        // Write input
        fs.writeFileSync(tmpFileIn, buffer);
        
        // Add exif
        const img = new webp.Image();
        const json = { 
            "sticker-pack-id": crypto.randomBytes(32).toString('hex'),
            "sticker-pack-name": packname, 
            "sticker-pack-publisher": author, 
            "emojis": [''] 
        };
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        
        await img.load(tmpFileIn);
        fs.unlinkSync(tmpFileIn);
        img.exif = exif;
        await img.save(tmpFileOut);
        
        // Read and send
        const stiker = fs.readFileSync(tmpFileOut);
        fs.unlinkSync(tmpFileOut);
        
        await conn.sendMessage(m.chat, { sticker: stiker }, { quoted: m });
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
