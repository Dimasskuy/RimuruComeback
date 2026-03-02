const fs = require('fs');
const path = require('path');
const { getMetadata, formatDuration, downloadAudio } = require('../lib/ytdlp');

const mono = (text) => `\`\`\`${text}\`\`\``;

let handler = async (m, { conn, text }) => {
  if (!text) return m.reply(mono('Judul?'));

  const tempDir = path.join(__dirname, '..', 'tmp', 'yt-dlp');
  let waitMsg;
  let audioPath;

  try {
    const metadata = await getMetadata(text);
    waitMsg = await m.reply(mono(`🎵 Searching...\n\nJudul: ${metadata.title}\nChannel: ${metadata.channel}\nDurasi: ${formatDuration(metadata.duration)}\n\nMohon tunggu...`));

    audioPath = await downloadAudio(metadata.url, tempDir);

    await conn.sendMessage(m.chat, {
      audio: { url: audioPath },
      mimetype: 'audio/mpeg',
      fileName: `${metadata.title}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: metadata.title,
          body: metadata.channel,
          thumbnailUrl: metadata.thumbnail,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: metadata.url
        }
      }
    }, { quoted: m });
  } catch (e) {
    const msg = e.message.includes('yt-dlp tidak ditemukan')
      ? `${e.message}\nHint: install yt-dlp / isi YTDLP_BINARY di .env`
      : e.message;
    m.reply(mono(`❌ Gagal: ${msg}`));
  } finally {
    if (waitMsg?.key) await conn.sendMessage(m.chat, { delete: waitMsg.key }).catch(() => {});
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
};

handler.help = ['play <judul/url>'];
handler.tags = ['downloader'];
handler.command = /^play$/i;
handler.limit = 3;
handler.register = true;

module.exports = handler;
