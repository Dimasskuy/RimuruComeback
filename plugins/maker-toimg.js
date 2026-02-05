const axios = require('axios');
const FormData = require('form-data');
const cheerio = require('cheerio');
const { fromBuffer } = require('file-type');

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';
    if (!/webp/.test(mime)) throw `Balas stiker dengan caption *${usedPrefix + command}*`;

    m.reply(global.wait);
    try {
        let buffer = await q.download();
        let link = await webp2png(buffer);
        if (!link) throw 'Gagal mengkonversi stiker ke gambar.';
        await conn.sendFile(m.chat, link, 'sticker.png', '✅ Sukses Konversi', m);
    } catch (e) {
        console.error(e);
        m.reply('❌ Terjadi kesalahan saat mengkonversi.');
    }
};

handler.help = ['toimg'];
handler.tags = ['maker'];
handler.command = /^toimg$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;

async function webp2png(source) {
    try {
        let form = new FormData();
        let isUrl = typeof source === 'string' && /https?:\/\//.test(source);
        form.append('new-image-url', isUrl ? source : '');
        form.append('new-image', isUrl ? '' : source, 'image.webp');

        let res = await axios.post('https://ezgif.com/webp-to-png', form, {
            headers: form.getHeaders(),
            userJid: 'Rimuru'
        });

        let $ = cheerio.load(res.data);
        let form2 = new FormData();
        let obj = {};
        $('form').find('input[name]').each((i, el) => {
            let name = $(el).attr('name');
            let value = $(el).attr('value');
            obj[name] = value;
            form2.append(name, value);
        });

        let res2 = await axios.post('https://ezgif.com/webp-to-png/' + obj.file, form2, {
            headers: form2.getHeaders()
        });

        let $2 = cheerio.load(res2.data);
        let link = $2('div#output > p.outfile > img').attr('src');

        if (!link) return null;
        return link.startsWith('https') ? link : 'https:' + link;
    } catch (e) {
        return null;
    }
}
