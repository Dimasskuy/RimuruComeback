let handler = async (m, { conn }) => {
let ye = `@${m.sender.split`@`[0]}`
let esce = `
Hai ${ye} Bot Ini Menggunakan Base :\n• https://github.com/BOTCAHX/RTXZY-MD
`
m.reply(esce)
}
handler.help = ['sc', 'sourcecode']
handler.tags = ['info']
handler.command = /^(sc|sourcecode)$/i


handler.register = true
module.exports = handler