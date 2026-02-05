let handler = async (m, { conn, isROwner }) => {
  if (!isROwner) throw 'Only Owner'
  
  // Reload handler to refresh config
  await global.reloadHandler()
  m.reply('Handler berhasil direload!')
}

handler.help = ['reload']
handler.tags = ['owner']
handler.command = /^reload$/i
handler.rowner = true


handler.register = true
module.exports = handler