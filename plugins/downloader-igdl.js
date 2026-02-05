const axios = require('axios');

const mono = (text) => "```" + text + "```";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Link Instagram!\n\nContoh:\n${usedPrefix}${command} https://www.instagram.com/p/C-XXXXX/`);

    m.reply(global.wait);

    try {
        const res = await axios.get(`https://api.vreden.my.id/api/v1/download/instagram?url=${text}`, {
            timeout: 15000
        });
        if (!res.data.status) throw new Error("Gagal mengambil data");

        const result = res.data.result;
        const medias = result.data;
        const profile = result.profile;
        const caption = result.caption;

        let infoText = mono(`📸 Instagram Downloader\n\n👤 User: ${profile.full_name} (@${profile.username})\n📝 Caption: ${caption ? caption.text : '-'}\n\n🔗 Link: ${text}`);

        for (let i = 0; i < Math.min(medias.length, 5); i++) {
            const media = medias[i];
            if (media.type === 'video') {
                await conn.sendMessage(m.chat, { video: { url: media.url }, caption: i === 0 ? infoText : '' }, { quoted: m });
            } else if (media.type === 'image') {
                await conn.sendMessage(m.chat, { image: { url: media.url }, caption: i === 0 ? infoText : '' }, { quoted: m });
            }
        }
    } catch (e) {
        console.error('Instagram DL Error:', e);
        throw mono('❌ Instagram Error (Link private atau tidak valid).');
    }
};

handler.help = ['instagram <url>', 'ig <url>', 'igdl <url>'];
handler.tags = ['downloader'];
handler.command = /^(instagram|ig|igdl)$/i;
handler.limit = true;

module.exports = handler;
