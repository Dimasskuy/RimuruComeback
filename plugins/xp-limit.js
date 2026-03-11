let handler = async (m) => {
    let who
    if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
    else who = m.sender
    fdoc = {
  key : {
  remoteJid: 'status@broadcast',
  participant : '0@s.whatsapp.net'
  },
  message: {
  documentMessage: {
  title: wm, 
                            }
                          }
                        }
let user = global.db.data.users[who]
let limitMsg = user.premium ? '*Premium* (Unlimited)' : `${user.limit} Limit Tersisa`
m.reply(`[Limit] — ${limitMsg}`)

}
handler.help = ['limit [@user]']
handler.tags = ['xp']
handler.command = /^(limit)$/i

handler.register = true
module.exports = handler