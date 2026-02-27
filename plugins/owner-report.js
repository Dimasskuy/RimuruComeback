let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `❌ Masukkan laporan!\n\nContoh:\n${usedPrefix}${command} Fitur tiktok error saat download video`

    // Get all owners
    let owners = global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
    
    // Get chat info (group name or private chat)
    let chatInfo
    if (m.chat.endsWith('@g.us')) {
        try {
            let groupMetadata = await conn.groupMetadata(m.chat)
            chatInfo = groupMetadata.subject
        } catch {
            chatInfo = 'Group Chat'
        }
    } else {
        chatInfo = 'Private Chat'
    }
    
    // Format report message
    let reportText = `*🚨 LAPORAN ERROR*\n\n`
    reportText += `👤 *Pelapor:* @${m.sender.split('@')[0]}\n`
    reportText += `📅 *Tanggal:* ${new Date().toLocaleString('id-ID')}\n`
    reportText += `💬 *Laporan:*\n${text}\n\n`
    reportText += `📎 *Dari Chat:* ${chatInfo}`
    
    // Forward to all owners
    for (let owner of owners) {
        await conn.sendMessage(owner, { 
            text: reportText,
            mentions: [m.sender]
        }, { quoted: m })
    }
    
    m.reply('✅ Laporan berhasil dikirim ke Owner!\n\nTunggu konfirmasi selanjutnya.')
}

handler.help = ['report <laporan>', 'lapor <laporan>']
handler.tags = ['info']
handler.command = /^(report|lapor)$/i
handler.owner = false
handler.mods = false
handler.premium = false
handler.group = false
handler.private = false
handler.register = true
handler.limit = false

module.exports = handler
