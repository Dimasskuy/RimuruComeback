const axios = require('axios');

const mono = (text) => "```" + text + "```";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Link TikTok!\n\nContoh:\n${usedPrefix}${command} https://vt.tiktok.com/ZSkGPK9Kj/`);

    m.reply(global.wait);

    let data = null;
    let result = null;

    try {
        const response = await axios.get(`https://api.yupra.my.id/api/downloader/tiktok?url=${text}`, {
            timeout: 15000 // 15s timeout to prevent hanging
        });
        data = response.data;
        result = data.result;

        if (!result || !result.data || !Array.isArray(result.data) || result.data.length === 0) {
            throw new Error('Tidak ada data media ditemukan');
        }

        const hasVideo = result.data.some(media => media.type === 'video' || media.type === 'nowatermark');
        const hasPhoto = result.data.some(media => media.type === 'photo');

        let contentType = 'video';
        if (hasPhoto && !hasVideo) {
            contentType = 'photo';
        } else if (hasVideo && hasPhoto) {
            contentType = 'mixed';
        }

        let title = result.desc || result.title || result.result?.title || 'TikTok Post';

        if (title === 'TikTok Post' && result.data && result.data.length > 0) {
            const firstMedia = result.data.find(m => m.type === 'video' || m.type === 'nowatermark' || m.type === 'photo');
            if (firstMedia && firstMedia.description) {
                title = firstMedia.description;
            }
        }

        let caption = `🎵 Caption: ${title}\n`;
        if (result.author && result.author.nickname) caption += `👤 Author: @${result.author.nickname}\n`;

        if (contentType === 'video' || contentType === 'mixed') {
            if (result.duration) caption += `⏱️ Duration: ${result.duration}\n`;
        }

        if (result.music_info && result.music_info.title) caption += `🎵 Music: ${result.music_info.title} by ${result.music_info.author || 'Unknown'}\n`;
        caption += `\n✅ TikTok Done`;

        let headerText = '';
        if (contentType === 'video') {
            headerText = '*Downloader TikTok - Versi Video*';
        } else if (contentType === 'photo') {
            headerText = '*Downloader TikTok - Versi Foto*';
        } else {
            headerText = '*Downloader TikTok - Versi Video & Foto*';
        }

        await conn.reply(m.chat, mono(`${headerText}\n\n` + caption), m);

        for (let i = 0; i < result.data.length; i++) {
            const media = result.data[i];

            if (media.type === 'video' || media.type === 'nowatermark') {
                await conn.sendMessage(m.chat, {
                    video: { url: media.url },
                    fileName: (title).substring(0, 30) + '.mp4'
                }, { quoted: m });
            } else if (media.type === 'photo') {
                await conn.sendMessage(m.chat, {
                    image: { url: media.url }
                }, { quoted: m });
            }
        }
    } catch(e) {
        console.error('TikTok download error:', e);
        throw mono('❌ Link Error / API Down / Tidak ada media ditemukan.');
    } finally {
        data = null;
        result = null;
    }
};

handler.help = ['tiktok <url>', 'tt <url>'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|tt)$/i;
handler.limit = true;

module.exports = handler;
