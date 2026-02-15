const fetch = require('node-fetch');

const mono = (text) => "```" + text + "```";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Link YouTube!\n\nContoh:\n${usedPrefix}${command} https://youtu.be/xxxx`);

    m.reply(global.wait);

    try {
        const step1 = await fetch('https://app.ytdown.to/proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
                'Accept': '*/*',
                'Origin': 'https://app.ytdown.to',
                'Referer': 'https://app.ytdown.to/id2/',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `url=${encodeURIComponent(text)}`
        });

        if (!step1.ok) throw `Server error: ${step1.status}`;
        const videoInfo = await step1.json();
        if (!videoInfo.api || videoInfo.api.status !== 'ok') throw 'Gagal mengambil info video';

        const { title, mediaItems } = videoInfo.api;
        const videos = mediaItems.filter(item => item.type === 'Video').slice(0, 1);
        if (videos.length === 0) throw 'Video tidak tersedia';
        const bestVideo = videos[0];

        const downloadMedia = async (mediaUrl) => {
            const step2 = await fetch('https://app.ytdown.to/proxy.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
                    'Accept': '*/*',
                    'Origin': 'https://app.ytdown.to',
                    'Referer': 'https://app.ytdown.to/id2/',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: `url=${encodeURIComponent(mediaUrl)}`
            });
            if (!step2.ok) throw `Download request failed: ${step2.status}`;
            let downloadStatus = await step2.json();
            let attempts = 0;
            while (downloadStatus.api.status === 'queued' && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const pollRequest = await fetch('https://app.ytdown.to/proxy.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
                        'Accept': '*/*',
                        'Origin': 'https://app.ytdown.to',
                        'Referer': 'https://app.ytdown.to/id2/',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: `url=${encodeURIComponent(mediaUrl)}`
                });
                if (!pollRequest.ok) throw `Polling failed: ${pollRequest.status}`;
                downloadStatus = await pollRequest.json();
                attempts++;
                if (downloadStatus.api.status === 'completed') break;
            }
            if (downloadStatus.api.status !== 'completed') throw 'Download timeout';
            return downloadStatus.api.fileUrl;
        };

        const videoUrl = await downloadMedia(bestVideo.mediaUrl);

        await conn.sendMessage(m.chat, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: mono(`🎥 YOUTUBE MP4\n\nJudul: ${title}`)
        }, { quoted: m });

    } catch(e) {
        console.error('YT MP4 Error:', e);
        throw mono('❌ Gagal YT MP4: ' + (e.message || 'Terjadi kesalahan'));
    }
};

handler.help = ['ytmp4 <url>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = true;
handler.register = true;
module.exports = handler;
