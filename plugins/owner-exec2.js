let cp = require('child_process')
let { promisify } = require('util')
let exec = promisify(cp.exec).bind(cp)

function isAllowedCommand(input) {
  const allow = global.security?.shellAllowlist || []
  const trimmed = (input || '').trim()
  return allow.some(cmd => trimmed === cmd || trimmed.startsWith(cmd + ' '))
}

let handler = async (m, { conn, text }) => {
  if (global.conn.user.jid != conn.user.jid) return

  if (global.security?.safeMode !== false || global.security?.allowShellExec !== true) {
    throw 'Shell exec dinonaktifkan (SAFE MODE aktif). Aktifkan global.security.allowShellExec=true dan safeMode=false jika yakin.'
  }

  if (!text) throw 'Contoh: $ ls -la'

  if (!isAllowedCommand(text)) {
    throw `Command tidak diizinkan. Allowlist: ${(global.security?.shellAllowlist || []).join(', ')}`
  }

  m.reply('Executing...')
  let o
  try {
    o = await exec(text.trim(), { timeout: 20000, maxBuffer: 1024 * 1024 })
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
