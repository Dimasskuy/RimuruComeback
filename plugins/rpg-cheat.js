const economyService = require('../lib/economyService')

let handler = async (m, { conn }) => {
  economyService.recordAudit({
    user: m.sender,
    action: 'cheat.command.blocked',
    status: 'blocked'
  })
  return conn.reply(m.chat, '[Security] — Fitur cheat telah dinonaktifkan permanen.', m)
}

handler.command = /^(cheat)$/i
handler.owner = false
handler.premium = false
handler.register = true
handler.disabled = true

module.exports = handler
