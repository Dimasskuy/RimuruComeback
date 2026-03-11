const { formatShortId } = require('../lib/economyService')

const DEFAULT_PAGE_SIZE = 50

const categories = {
  money: { name: 'Money', field: 'money' },
  exp: { name: 'Exp', field: 'exp' },
  level: { name: 'Level', field: 'level' },
  limit: { name: 'Limit', field: 'limit' },
  diamond: { name: 'Diamond', field: 'diamond' }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const category = (args[0] || 'level').toLowerCase()
  const page = Math.max(1, Number(args[1]) || 1)

  if (!categories[category]) {
    return conn.reply(m.chat, `[Leaderboard] — Kategori tidak tersedia. Pilihan: ${Object.keys(categories).join(', ')}.`, m)
  }

  const users = Object.entries(global.db.data.users || {})
    .map(([jid, value]) => ({ jid, ...(value || {}) }))
    .filter(user => !isFlagged(user, category))
    .sort((a, b) => (Number(b[categories[category].field]) || 0) - (Number(a[categories[category].field]) || 0))

  const start = (page - 1) * DEFAULT_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(users.length / DEFAULT_PAGE_SIZE))
  const rows = users.slice(start, start + DEFAULT_PAGE_SIZE)

  const lines = rows.map((u, idx) => {
    const rank = start + idx + 1
    const username = `@${u.jid.split('@')[0]}`
    const value = formatShortId(u[categories[category].field] || 0)
    const region = u.region || '-'
    const lastActive = u.lastseen ? new Date(u.lastseen).toLocaleDateString('id-ID') : '-'
    return `${pad(rank, 4)} | ${pad(username, 16)} | ${pad(value, 8)} | ${pad(region, 8)} | ${lastActive}`
  })

  const text = [
    `[Leaderboard] — ${categories[category].name} (Halaman ${page}/${totalPages}).`,
    'Rank | Username         | Level/Score | Region   | Last Active',
    ...lines,
    '',
    `Gunakan: ${usedPrefix + command} ${category} <halaman>.`
  ].join('\n')

  return conn.reply(m.chat, text, m, { mentions: rows.map(row => row.jid) })
}

function isFlagged(user, category) {
  const suspiciousLimit = {
    money: 500_000_000,
    exp: 100_000_000,
    level: 500,
    limit: 10_000,
    diamond: 50_000
  }
  return user.cheatFlagged === true || (Number(user[categories[category].field]) || 0) > (suspiciousLimit[category] || Number.MAX_SAFE_INTEGER)
}

function pad(value, len) {
  return String(value).slice(0, len).padEnd(len, ' ')
}

handler.help = ['leaderboard <category> [halaman]', 'lb <category> [halaman]']
handler.tags = ['rpg', 'info']
handler.command = /^(leaderboard|lb)$/i
handler.group = true
handler.register = true

module.exports = handler
