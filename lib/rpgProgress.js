function dateKey(ts = Date.now()) {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function weekKey(ts = Date.now()) {
  const d = new Date(ts)
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const day = Math.floor((d - onejan) / 86400000)
  const week = Math.ceil((day + onejan.getUTCDay() + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function ensureRpgProgress(user) {
  if (!user.rpgProgress || typeof user.rpgProgress !== 'object') {
    user.rpgProgress = {
      nambang: 0,
      hunt: 0,
      mancing: 0,
      dungeon: 0,
      relichunt: 0,
      worldbossHit: 0,
      moneyEarned: 0
    }
  }
  for (const key of ['nambang', 'hunt', 'mancing', 'dungeon', 'relichunt', 'worldbossHit', 'moneyEarned']) {
    if (typeof user.rpgProgress[key] !== 'number') user.rpgProgress[key] = 0
  }
}

function incrementProgress(user, key, amount = 1) {
  ensureRpgProgress(user)
  if (!Object.prototype.hasOwnProperty.call(user.rpgProgress, key)) user.rpgProgress[key] = 0
  const inc = Number(amount) || 0
  user.rpgProgress[key] = Math.max(0, (Number(user.rpgProgress[key]) || 0) + inc)
}

function ensureQuest(user) {
  if (!user.dailyQuest || typeof user.dailyQuest !== 'object') user.dailyQuest = {}
  if (!user.weeklyQuest || typeof user.weeklyQuest !== 'object') user.weeklyQuest = {}
}

module.exports = {
  dateKey,
  weekKey,
  ensureRpgProgress,
  incrementProgress,
  ensureQuest
}
