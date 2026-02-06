const axios = require('axios');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';
    if (!/image/.test(mime)) throw `Kirim/Reply gambar dengan caption *${usedPrefix + command}*`;

    m.reply('Processing HD...');
    try {
        let buffer = await q.download();
        let imageUrl = await uploadImage(buffer);
        if (!imageUrl) throw 'Gagal mengupload gambar.';

        await conn.sendMessage(m.chat, { react: { text: '📤', key: m.key } });
        const apiUrl = `https://archive.lick.eu.org/api/tools/upscale?url=${encodeURIComponent(imageUrl)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        await conn.sendFile(m.chat, response.data, 'hd.jpg', '✅ Sukses HD Result', m);
    } catch (e) {
        console.error(e);
        m.reply('❌ Gagal mengubah ke HD. Coba lagi nanti.');
    }
};

handler.help = ['hd', 'remini'];
handler.tags = ['maker'];
handler.command = /^(hd|remini)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;

async function uploadImage(buffer) {
  let { ext } = await fromBuffer(buffer);
  let bodyForm = new FormData();
  bodyForm.append("file", buffer, "file." + ext);
  let res = await axios.post("https://file.botcahx.eu.org/api/upload.php", bodyForm, {
    headers: {
        ...bodyForm.getHeaders()
    }
  });
  let data = res.data;
  let resultUrl = data.result ? data.result.url : '';
  return resultUrl;
}
