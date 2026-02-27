let handler = async (m, { conn, text }) => {
if (!text) throw `[!] Masukan textnya`
// Simple base64 encoding (replaced javascript-obfuscator)
let res = Buffer.from(text).toString('base64')
conn.reply(m.chat, `// Encoded (base64)\n${res}`, m)
}
handler.help = ['enc']
handler.tags = ['tools']
handler.command = /^enc$/i


handler.register = true
module.exports = handler
