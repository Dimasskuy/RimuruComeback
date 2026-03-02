const fs = require('fs');
const path = require('path');
const { getMetadata, formatDuration, downloadAudio } = require('../lib/ytdlp');

const mono = (text) => `\`\`\`${text}\`\`\``;

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(mono(`Masukkan Link YouTube atau Judul Lagu!\n\nContoh:\n${usedPrefix}${command} https://youtu.be/xxxx\n${usedPrefix}${command} Alan Walker Faded`));

  const tempDir = path.join(__dirname, '..', 'tmp', 'yt-dlp');
  let waitMsg;
  let audioPath;

  try {
    const metadata = await getMetadata(text);
    waitMsg = await m.reply(mono(`🎵 Processing...\n\nJudul: ${metadata.title}\nDurasi: ${formatDuration(metadata.duration)}\nChannel: ${metadata.channel}`));

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
    if (waitMsg?.key) {
      await conn.sendMessage(m.chat, { delete: waitMsg.key }).catch(() => {});
    }
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
};

handler.help = ['ytmp3 <url/judul>'];
handler.tags = ['downloader'];
handler.command = /^ytmp3$/i;
handler.limit = 3;
handler.register = true;

module.exports = handler;
