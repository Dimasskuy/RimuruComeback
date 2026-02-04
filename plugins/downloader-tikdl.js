const fetch = require('node-fetch')

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    throw `Masukkan URL!\n\nContoh:\n${usedPrefix}${command} https://vt.tiktok.com/ZSkGPK9Kj/`;
  }
  if (!args[0].match(/tiktok/gi)) {
    throw `Berikan URL dari TikTok!`;
  }

  m.reply(global.wait);

  try {
    const api = global.API('botcahx', '/api/dowloader/tikok', { url: args[0] }, 'apikey');
    const res = await fetch(api);
    const json = await res.json();

    if (json.status) {
      await conn.sendFile(m.chat, json.result.video, 'tiktok.mp4', `*TikTok Downloader*\n\n*Username:* ${json.result.author.nickname}\n*Description:* ${json.result.title}`, m);
    } else {
      // Fallback or error
      throw `Gagal mendownload video.`;
    }
  } catch (e) {
    console.error(e);
    // Try another API or package as fallback
    try {
        const { tiktokdl } = require('tiktokdl');
        const response = await tiktokdl(args[0]);
        await conn.sendFile(m.chat, response.video, 'tiktok.mp4', '*TikTok Downloader (Fallback)*', m);
    } catch (err) {
        throw `Error: ${global.eror}`;
    }
  }
};

handler.help = ['tikdl'];
handler.command = /^(tikdl|tiktok)$/i;
handler.tags = ['downloader'];
handler.limit = true;

module.exports = handler;
