const { dateKey, weekKey, ensureRpgProgress, ensureQuest } = require('../lib/rpgProgress')

const DAILY_POOL = [
  { key: 'nambang', min: 2, max: 6, label: 'Selesaikan aktivitas tambang (nambang/tambang)' },
  { key: 'hunt', min: 2, max: 5, label: 'Selesaikan aktivitas berburu' },
  { key: 'relichunt', min: 1, max: 2, label: 'Jalankan relic hunt' },
  { key: 'worldbossHit', min: 1, max: 4, label: 'Serang world boss' }
]

function pickTasks(pool, count = 3) {
  const arr = [...pool].sort(() => Math.random() - 0.5).slice(0, count)
  return arr.map(it => ({
    key: it.key,
    target: Math.floor(Math.random() * (it.max - it.min + 1)) + it.min,
    label: it.label
  }))
}

function renderTasks(title, tasks, progress, claimed) {
  const lines = tasks.map((t, i) => {
    const cur = progress[t.key] || 0
    const done = cur >= t.target ? '✅' : '⏳'
    return `${i + 1}. ${done} ${t.label}\n   Progress: ${cur}/${t.target}`
  }).join('\n')
  return `🏆 *${title}*\n\n${lines}\n\nStatus klaim: ${claimed ? '✅ Sudah diambil' : '⏳ Belum diambil'}`
}

function ensureQuestRotation(user) {
  const day = dateKey()
  const week = weekKey()

  if (user.dailyQuest.key !== day) {
    user.dailyQuest = { key: day, tasks: pickTasks(DAILY_POOL, 3), claimed: false }
  }

  if (user.weeklyQuest.key !== week) {
    user.weeklyQuest = { key: week, tasks: pickTasks(DAILY_POOL, 4).map(t => ({ ...t, target: t.target * 4 })), claimed: false }
  }
}

let handler = async (m, { conn, args }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('Data user tidak ditemukan. Silakan daftar akun RPG terlebih dahulu.')

  ensureRpgProgress(user)
  ensureQuest(user)
  ensureQuestRotation(user)

  const mode = (args[0] || '').toLowerCase()
  const progress = user.rpgProgress

  if (mode === 'claim') {
    // lightweight lock to avoid double-claim race from duplicated messages
    if (user._questClaimLock && Date.now() - user._questClaimLock < 5000) {
      return m.reply('Permintaan klaim sedang diproses. Tunggu sebentar lalu coba lagi.')
    }
    user._questClaimLock = Date.now()

    try {
      const dailyDone = user.dailyQuest.tasks.every(t => (progress[t.key] || 0) >= t.target)
      const weeklyDone = user.weeklyQuest.tasks.every(t => (progress[t.key] || 0) >= t.target)

      let rewards = []
      if (dailyDone && !user.dailyQuest.claimed) {
        user.dailyQuest.claimed = true
        user.money += 100000
        user.exp += 2500
        user.limit += 10
        rewards.push('Daily Quest: +100000 Money, +2500 EXP, +10 Limit')
      }

      if (weeklyDone && !user.weeklyQuest.claimed) {
        user.weeklyQuest.claimed = true
        user.money += 500000
        user.exp += 10000
        user.legendary += 1
        rewards.push('Weekly Quest: +500000 Money, +10000 EXP, +1 Legendary Crate')
      }

      if (!rewards.length) return m.reply('Belum ada reward quest yang bisa diambil, atau reward sudah diambil sebelumnya.')
      return conn.reply(m.chat, `🎉 *Reward Quest Berhasil Diambil*\n\n${rewards.join('\n')}`, m)
    } finally {
      user._questClaimLock = 0
    }
  }

  const txt = [
    renderTasks(`Daily Quest (${user.dailyQuest.key})`, user.dailyQuest.tasks, progress, user.dailyQuest.claimed),
    '',
    renderTasks(`Weekly Quest (${user.weeklyQuest.key})`, user.weeklyQuest.tasks, progress, user.weeklyQuest.claimed),
    '',
    'Cara pakai:',
    '- *.quest* (lihat progress)',
    '- *.quest claim* (ambil reward yang sudah selesai)'
  ].join('\n')

  return conn.reply(m.chat, txt, m)
}

handler.help = ['quest', 'quest claim']
handler.tags = ['rpg']
handler.command = /^quest$/i
handler.register = true

module.exports = handler
