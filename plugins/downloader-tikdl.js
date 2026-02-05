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
    // Try Botcahx API
    const api = global.API('botcahx', '/api/dowloader/tiktok', { url: args[0] }, 'apikey');
    const res = await fetch(api);
    const json = await res.json();

    if (json.status) {
      await conn.sendFile(m.chat, json.result.video[0] || json.result.video, 'tiktok.mp4', `*TikTok Downloader*\n\n*Username:* ${json.result.author.nickname}\n*Description:* ${json.result.title}`, m);
    } else {
       // Fallback 1: Another Botcahx endpoint or different structure
       const api2 = global.API('botcahx', '/api/dowloader/tikok', { url: args[0] }, 'apikey');
       const res2 = await fetch(api2);
       const json2 = await res2.json();
       if (json2.status) {
         await conn.sendFile(m.chat, json2.result.video[0] || json2.result.video, 'tiktok.mp4', `*TikTok Downloader*\n\n*Username:* ${json2.result.author.nickname}\n*Description:* ${json2.result.title}`, m);
       } else throw 'API Error';
    }
  } catch (e) {
    console.error(e);
    // Fallback 2: tiktokdl package
    try {
        const { tiktokdl } = require('tiktokdl');
        const response = await tiktokdl(args[0]);
        await conn.sendFile(m.chat, response.video, 'tiktok.mp4', '*TikTok Downloader (Package Fallback)*', m);
    } catch (err) {
        // Fallback 3: try known public API
        try {
            const res3 = await fetch(`https://api.tiklydown.eu.org/api/download?url=${args[0]}`);
            const json3 = await res3.json();
            await conn.sendFile(m.chat, json3.video.noWatermark, 'tiktok.mp4', '*TikTok Downloader (Public API)*', m);
        } catch (err2) {
            throw `Error: ${global.eror || 'Gagal mendownload video TikTok.'}`;
        }
    }
  }
};

handler.help = ['tikdl'];
handler.command = /^(tikdl|tiktok)$/i;
handler.tags = ['downloader'];
handler.limit = true;

module.exports = handler;
