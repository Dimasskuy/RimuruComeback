const logger = require('../lib/logger')
const { GUARDED_NUMERIC_FIELDS } = require('../lib/rpgRules')
const { ensureRpgProgress } = require('../lib/rpgProgress')

let handler = m => m

handler.before = async function (m) {
  const users = global.db?.data?.users
  if (!users) return true

  const user = users[m.sender]
  if (!user) return true

  let corrected = []

  for (const [field, range] of Object.entries(GUARDED_NUMERIC_FIELDS)) {
    const raw = user[field]
    if (raw == null) continue
    let val = Number(raw)

    if (!Number.isFinite(val)) {
      user[field] = range.min
      corrected.push(`${field}=NaN->${range.min}`)
      continue
    }

    if (val < range.min) {
      user[field] = range.min
      corrected.push(`${field}<min`)
      continue
    }

    if (val > range.max) {
      user[field] = range.max
      corrected.push(`${field}>max`)
    }
  }

  // Guard progress counters to avoid quest progress tampering
  ensureRpgProgress(user)
  const progressLimits = {
    nambang: 100000,
    hunt: 100000,
    mancing: 100000,
    dungeon: 100000,
    relichunt: 100000,
    worldbossHit: 100000,
    moneyEarned: 1_000_000_000_000
  }

  for (const [key, max] of Object.entries(progressLimits)) {
    let val = Number(user.rpgProgress[key])
    if (!Number.isFinite(val) || val < 0) {
      user.rpgProgress[key] = 0
      corrected.push(`rpgProgress.${key}=reset`)
      continue
    }
    if (val > max) {
      user.rpgProgress[key] = max
      corrected.push(`rpgProgress.${key}>max`)
    }
  }

  if (corrected.length) {
    user.rpgIntegrityFlag = (Number(user.rpgIntegrityFlag) || 0) + 1
    user.lastRpgIntegrityAt = Date.now()
    logger.warn(`[RPG-GUARD] ${m.sender} corrected fields: ${corrected.join(', ')}`)
  }

  return true
}

module.exports = handler
