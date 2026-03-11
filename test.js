const assert = require('assert')
global.gameplay = {
  limits_tradable: false,
  limit_acquisition_methods: ['purchase', 'referral', 'daily-quest'],
  cooldown_default: 3600000,
  economy: { BUY_MARKUP: 1.25, SELL_FACTOR: 0.5, reward_cap: 5000 }
}

const economy = require('./lib/economyService')

assert.strictEqual(economy.buyPrice(100), 125)
assert.strictEqual(economy.sellPrice(100), 50)
assert.strictEqual(economy.normalizeReward(9000), 5000)
assert.strictEqual(economy.resolveCooldown(), 3600000)
assert.strictEqual(economy.formatShortId(1_200), '1.2rb')
assert.strictEqual(economy.formatShortId(2_500_000), '2.5j')
assert.strictEqual(economy.formatShortId(3_000_000_000), '3m')

let called = 0
const result1 = economy.transact({ idempotencyKey: 'abc', actor: 'u1', action: 'buy', perform: () => (++called) })
const result2 = economy.transact({ idempotencyKey: 'abc', actor: 'u1', action: 'buy', perform: () => (++called) })
assert.strictEqual(result1.skipped, false)
assert.strictEqual(result2.skipped, true)
assert.strictEqual(called, 1)

const lastAudit = economy.getAuditTrail().slice(-1)[0]
assert.strictEqual(lastAudit.user, 'u1')
assert.strictEqual(lastAudit.action, 'buy')

console.log('All tests passed')
