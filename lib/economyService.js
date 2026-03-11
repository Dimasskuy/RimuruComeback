const { EventEmitter } = require('events')
const logger = require('./logger')

const MAX_AUDIT_LOG = 5000
const IDEMPOTENCY_TTL = 6 * 60 * 60 * 1000

const emitter = new EventEmitter()
emitter.setMaxListeners(50)

const auditTrail = []
const seenIdempotency = new Map()

function cfg() {
  const gameplay = global.gameplay || {}
  const economy = gameplay.economy || {}
  return {
    buyMarkup: Number(economy.BUY_MARKUP || 1.25),
    sellFactor: Number(economy.SELL_FACTOR || 0.5),
    rewardCap: Number(economy.reward_cap || 5000),
    cooldownDefault: Number(gameplay.cooldown_default || 60 * 60 * 1000)
  }
}

function round(value) {
  return Math.round(Number(value) || 0)
}

function buyPrice(basePrice) {
  return round((Number(basePrice) || 0) * cfg().buyMarkup)
}

function sellPrice(basePrice) {
  return round((Number(basePrice) || 0) * cfg().sellFactor)
}

function normalizeReward(amount) {
  return Math.min(round(amount), cfg().rewardCap)
}

function resolveCooldown(abilityCooldown) {
  return Number(abilityCooldown) > 0 ? Number(abilityCooldown) : cfg().cooldownDefault
}

function formatShortId(value) {
  const num = Number(value) || 0
  if (num >= 1e12) return `${trim(num / 1e12)}T`
  if (num >= 1e9) return `${trim(num / 1e9)}m`
  if (num >= 1e6) return `${trim(num / 1e6)}j`
  if (num >= 1e3) return `${trim(num / 1e3)}rb`
  return `${num}`
}

function trim(num) {
  return Number(num.toFixed(2)).toString().replace(/\.0+$/,'')
}

function publishEvent(eventName, payload) {
  emitter.emit(eventName, payload)
}

function recordAudit(entry) {
  const logEntry = {
    user: entry.user,
    action: entry.action,
    timestamp: entry.timestamp || Date.now(),
    status: entry.status || 'success',
    meta: entry.meta || {}
  }
  auditTrail.push(logEntry)
  if (auditTrail.length > MAX_AUDIT_LOG) auditTrail.shift()
  logger.info(`[Audit] ${logEntry.action}`, { user: logEntry.user, status: logEntry.status, timestamp: logEntry.timestamp })
  publishEvent('economy.audit', logEntry)
  return logEntry
}

function cleanupIdempotency(now = Date.now()) {
  for (const [key, ts] of seenIdempotency.entries()) {
    if (now - ts > IDEMPOTENCY_TTL) seenIdempotency.delete(key)
  }
}

function transact({ idempotencyKey, actor, action, perform }) {
  cleanupIdempotency()
  if (idempotencyKey && seenIdempotency.has(idempotencyKey)) {
    return { skipped: true, reason: 'duplicate' }
  }

  const result = perform()
  if (idempotencyKey) seenIdempotency.set(idempotencyKey, Date.now())
  recordAudit({
    user: actor,
    action,
    status: 'success',
    meta: { idempotencyKey }
  })
  publishEvent('economy.transaction', { actor, action, result, idempotencyKey, timestamp: Date.now() })
  return { skipped: false, result }
}

module.exports = {
  buyPrice,
  sellPrice,
  normalizeReward,
  resolveCooldown,
  formatShortId,
  recordAudit,
  transact,
  events: emitter,
  getAuditTrail: () => auditTrail.slice(-200)
}
