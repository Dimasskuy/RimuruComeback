let fetch = require('node-fetch');
let FormData = require('form-data');
let { fromBuffer } = require('file-type');

let handler = async (m, { conn, text }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    if (!mime) throw `balas gambar dengan perintah .ocr`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `_*jenis ${mime} tidak didukung!*_`
    let img = await q.download()
    let url = await uploader(img)
    // Using API directly (replaced ocr-space-api-wrapper)
    let res = await fetch(`https://api.ocr.space/parse/imageurl?apikey=K88953133888957&url=${encodeURIComponent(url)}&language=eng`)
    let hasil = await res.json()
    await m.reply(hasil.ParsedResults?.[0]?.ParsedText || 'Tidak ada teks terdeteksi')
}

handler.help = ['ocr', 'totext']
handler.tags = ['tools']
handler.command = /^(ocr|totext)$/i
handler.limit = true


handler.register = true
module.exports = handler

async function uploader(buffer) {
  let { ext } = await fromBuffer(buffer);
  bodyForm = new FormData();
  bodyForm.append("file", buffer, "file." + ext);

 let res = await fetch("https://file.botcahx.eu.org/api/upload.php", {
    method: "post",
    body: bodyForm,
  });

 let data = await res.json()
  return data.result.url || 'null'
}
