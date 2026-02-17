const axios = require('axios');
const fetch = require('node-fetch');

const mono = (text) => "```" + text + "```";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Judul Lagu!\n\nContoh:\n${usedPrefix}${command} Alan Walker Faded`);

    m.reply(global.wait);

    try {
        // Search for the video first
        const searchRes = await axios.get(`https://api.yupra.my.id/api/search/youtube?q=${encodeURIComponent(text)}`);
        if(!searchRes.data.status || !searchRes.data.results || !searchRes.data.results.length) {
            throw mono('404 Not Found');
        }

        const vid = searchRes.data.results[0];
        const url = vid.url;

        // Use the new API for downloading
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
            body: `url=${encodeURIComponent(url)}`
        });

        if (!step1.ok) throw `Server error: ${step1.status}`;
        const videoInfo = await step1.json();
        if (!videoInfo.api || videoInfo.api.status !== 'ok') throw 'Gagal mengambil info video';

        const { title, mediaItems } = videoInfo.api;
        const audios = mediaItems.filter(item => item.type === 'Audio').slice(0, 1);
        if (audios.length === 0) throw 'Audio tidak tersedia';
        const bestAudio = audios[0];

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

            const fileRes = await fetch(downloadStatus.api.fileUrl);
            if (!fileRes.ok) throw 'Gagal mengunduh file audio';
            return await fileRes.buffer();
        };

        const audioBuffer = await downloadMedia(bestAudio.mediaUrl);

        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            fileName: `${title}.mp3`,
            contextInfo: { externalAdReply: {
                title: title,
                body: vid.channel || 'Unknown',
                thumbnailUrl: vid.thumbnail || null,
                mediaType: 1,
                renderLargerThumbnail: true
            }}
        }, { quoted: m });

    } catch(e) {
        console.error('Play command error:', e);
        throw mono('❌ Gagal Play: ' + (e.message || 'Terjadi kesalahan'));
    }
};

handler.help = ['play <judul>'];
handler.tags = ['downloader'];
handler.command = /^play$/i;
handler.limit = true;
handler.register = true;
module.exports = handler;
