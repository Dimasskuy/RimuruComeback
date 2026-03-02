const fs = require('fs');
const path = require('path');
const { getMetadata, formatDuration, downloadVideo } = require('../lib/ytdlp');

const mono = (text) => `\`\`\`${text}\`\`\``;

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(mono(`Masukkan Link/Judul YouTube!\n\nContoh:\n${usedPrefix}${command} https://youtu.be/xxxx`));

  const tempDir = path.join(__dirname, '..', 'tmp', 'yt-dlp');
  let waitMsg;
  let videoPath;

  try {
    const metadata = await getMetadata(text);
    waitMsg = await m.reply(mono(`🎥 Processing...\n\nJudul: ${metadata.title}\nDurasi: ${formatDuration(metadata.duration)}\nChannel: ${metadata.channel}`));

    videoPath = await downloadVideo(metadata.url, tempDir, '480');

    await conn.sendMessage(m.chat, {
      video: { url: videoPath },
      mimetype: 'video/mp4',
      fileName: `${metadata.title}.mp4`,
      caption: mono(`🎥 YOUTUBE MP4\n\nJudul: ${metadata.title}\nDurasi: ${formatDuration(metadata.duration)}\nChannel: ${metadata.channel}\nQuality: 480p`)
    }, { quoted: m });
  } catch (e) {
    const msg = e.message.includes('yt-dlp tidak ditemukan')
      ? `${e.message}\nHint: install yt-dlp / isi YTDLP_BINARY di .env`
      : e.message;
    m.reply(mono(`❌ Gagal: ${msg}`));
  } finally {
    if (waitMsg?.key) await conn.sendMessage(m.chat, { delete: waitMsg.key }).catch(() => {});
    if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  }
};

handler.help = ['ytmp4 <url/judul>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = 4;
handler.register = true;

module.exports = handler;
