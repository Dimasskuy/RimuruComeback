const axios = require('axios');

const mono = (text) => "```" + text + "```";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Link YouTube!\n\nContoh:\n${usedPrefix}${command} https://youtu.be/xxxx`);
    if (!text.match(/youtu\.be|youtube\.com/i)) throw mono('URL YouTube tidak valid!');

    m.reply(global.wait);

    const headers = {
        "accept": "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "Referer": "https://id.ytmp3.mobi/",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    };

    let initRes = null;
    let initData = null;
    let convertRes = null;
    let convertData = null;
    let progressRes = null;
    let info = {};

    try {
        initRes = await axios.get(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers, timeout: 10000 });
        initData = initRes.data;

        const id = text.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?/]+)/)?.[1];
        if (!id) throw new Error('Gagal mendapatkan ID video');

        const convertURL = initData.convertURL + `&v=${id}&f=mp4&_=${Math.random()}`;
        convertRes = await axios.get(convertURL, { headers, timeout: 10000 });
        convertData = convertRes.data;

        info = {};
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                progressRes = await axios.get(convertData.progressURL, { headers, timeout: 5000 });
                info = progressRes.data;
                if (info.progress === 3) break;
            } catch (e) {
                // Ignore errors during polling
            }
        }

        if (!info.title || !convertData.downloadURL) throw new Error('Konversi gagal atau server sibuk');

        await conn.sendMessage(
            m.chat,
            {
                video: { url: convertData.downloadURL },
                caption: mono(`🎬 YOUTUBE MP4\n\nJudul: ${info.title}\nLink: ${text}`),
                mimetype: 'video/mp4'
            },
            { quoted: m }
        );

    } catch (error) {
        console.error('YT MP4 Error:', error);
        throw mono(`Error: ${error.message || 'Gagal download video.'}`);
    } finally {
        initRes = null;
        initData = null;
        convertRes = null;
        convertData = null;
        progressRes = null;
        info = null;
    }
};

handler.help = ['ytmp4 <url>', 'ytv <url>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv|ytm4)$/i;
handler.limit = true;

handler.register = true
module.exports = handler;
