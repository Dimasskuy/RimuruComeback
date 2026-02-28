let cp = require('child_process')
let { promisify } = require('util')
let exec = promisify(cp.exec).bind(cp)
let handler = async (m, { conn, command, text }) => {
  if (global.conn.user.jid != conn.user.jid) return

  if (!global.security?.allowOwnerExec) {
    return m.reply('Fitur exec dimatikan. Aktifkan dengan ALLOW_OWNER_EXEC=true jika benar-benar diperlukan.')
  }

  const payload = (text || '').trim()
  if (!payload) return m.reply('Contoh: $ ls -la')

  m.reply('Executing...')
  let o
  try {
    o = await exec(payload, { timeout: 15000, maxBuffer: 1024 * 1024 })
  } catch (e) {
    o = e
  } finally {
    let { stdout = '', stderr = '' } = o || {}
    if (stdout.trim()) m.reply(stdout.slice(0, 3500))
    if (stderr.trim()) m.reply(stderr.slice(0, 3500))
  }
}
handler.help = ['$']
handler.tags = ['advanced']
handler.customPrefix = /^[$] /
handler.command = new RegExp
handler.rowner = true

handler.register = true
module.exports = handler
