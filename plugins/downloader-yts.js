const axios = require('axios');

let handler = async (m, { text, usedPrefix, command }) => {
  if (!text) throw `Cari apa?\n\nContoh:\n${usedPrefix}${command} old love`;

  m.reply(global.wait);

  try {
    const res = await axios.get(`https://api.yupra.my.id/api/search/youtube?q=${encodeURIComponent(text)}`);
    if (!res.data.status) throw 'Tidak ditemukan hasil.';

    let results = res.data.results;
    let teks = results.map(v => {
      return `
*${v.title}*
🔗 ${v.url}
⏱️ Duration: ${v.duration}
👁️ Views: ${v.views}
👤 Channel: ${v.channel}
      `.trim();
    }).join('\n\n========================\n\n');

    m.reply(teks);
  } catch (e) {
    console.error(e);
    throw 'Terjadi kesalahan saat mencari di YouTube.';
  }
}

handler.help = ['yts <pencarian>', 'ytsearch <pencarian>'];
handler.tags = ['downloader'];
handler.command = /^yts(earch)?$/i
handler.limit = true;
handler.register = true;

module.exports = handler;
