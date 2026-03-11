let handler = async (m) => {
    let who
    if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
    else who = m.sender
    const user = global.db.data.users[who]
    const isPremium = Boolean(user.premium || user.premiumTime > Date.now())
    const limitText = isPremium ? 'Tak terbatas (**Premium**)' : `${user.limit} tersisa`
    m.reply(`[Limit] — ${limitText}.`)
}
handler.help = ['limit [@user]']
handler.tags = ['xp']
handler.command = /^(limit)$/i

handler.register = true
module.exports = handler
