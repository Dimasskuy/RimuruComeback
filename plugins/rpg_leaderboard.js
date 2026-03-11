const { formatShortId } = require('../lib/economyService')

const PAGE_SIZE = 50

const categories = {
  money: { name: 'Money', field: 'money', icon: '💰' },
  exp: { name: 'Exp', field: 'exp', icon: '✨' },
  level: { name: 'Level', field: 'level', icon: '🎚️' },
  limit: { name: 'Limit', field: 'limit', icon: '🎫' },
  diamond: { name: 'Diamond', field: 'diamond', icon: '💎' }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const category = (args[0] || 'level').toLowerCase()
  const page = Math.max(1, Number(args[1]) || 1)

  if (!categories[category]) {
    return conn.reply(m.chat, `[Leaderboard] — Kategori tidak tersedia. Pilihan: ${Object.keys(categories).join(', ')}.`, m)
  }

  const cat = categories[category]
  const users = Object.entries(global.db.data.users || {})
    .map(([jid, value]) => ({ jid, ...(value || {}) }))
    .filter(user => !isFlagged(user, category))
    .sort((a, b) => (Number(b[cat.field]) || 0) - (Number(a[cat.field]) || 0))

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const rows = users.slice(start, start + PAGE_SIZE)

  const header = [`┌─⊷ *${cat.icon} LEADERBOARD ${cat.name.toUpperCase()}*`, `┃Halaman: ${safePage}/${totalPages} | Total: ${users.length}`, '┃']
  const body = rows.map((u, idx) => {
    const rank = start + idx + 1
    const score = formatShortId(u[cat.field] || 0)
    const region = u.region || '-'
    const active = u.lastseen ? new Date(u.lastseen).toLocaleDateString('id-ID') : '-'
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '▫️'
    return `┃${medal} *#${rank}* @${u.jid.split('@')[0]}\n┃   ${cat.icon} ${cat.name}: *${score}* | Region: ${region} | Aktif: ${active}`
  })

  const footer = ['┃', `┃Next: *${usedPrefix + command} ${category} ${safePage + 1}*`, '└──────────────']
  const text = [...header, ...body, ...footer].join('\n')

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

handler.help = ['leaderboard <category> [halaman]', 'lb <category> [halaman]']
handler.tags = ['rpg', 'info']
handler.command = /^(leaderboard|lb)$/i
handler.group = true
handler.register = true

module.exports = handler
