const { incrementProgress } = require('../lib/rpgProgress')

const HIT_COOLDOWN = 60 * 1000
const MAX_DAMAGE_PER_HIT = 10000

function ensureWorldState() {
  if (!global.db.data.rpgWorld || typeof global.db.data.rpgWorld !== 'object') global.db.data.rpgWorld = {}
  const now = Date.now()
  if (!global.db.data.rpgWorld.worldBoss || global.db.data.rpgWorld.worldBoss.endsAt < now) {
    const hp = 1_000_000
    global.db.data.rpgWorld.worldBoss = {
      id: `boss-${now}`,
      name: 'Ancient Titan',
      maxHp: hp,
      hp,
      startedAt: now,
      endsAt: now + 24 * 60 * 60 * 1000,
      defeated: false,
      contributions: {},
      claimed: {}
    }
  }
  return global.db.data.rpgWorld.worldBoss
}

function fmt(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

let handler = async (m, { conn, args }) => {
  const boss = ensureWorldState()
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('Data user tidak ditemukan.')

  if (typeof user.lastWorldBossHit !== 'number') user.lastWorldBossHit = 0

  const sub = (args[0] || '').toLowerCase()

  if (sub === 'hit') {
    const remain = HIT_COOLDOWN - (Date.now() - user.lastWorldBossHit)
    if (remain > 0) return m.reply(`⏳ Cooldown serangan boss: *${fmt(remain)}*`)
    if (boss.defeated || boss.hp <= 0) return m.reply('Boss sudah dikalahkan. Gunakan *.worldboss claim* jika kamu punya kontribusi.')

    const level = Math.min(Number(user.level) || 0, 1000)
    const attack = Math.min(Number(user.attack) || 0, 1000)
    const strength = Math.min(Number(user.strength) || 0, 1000)

    const base = 500 + level * 30 + attack * 50 + strength * 40
    const dmgRoll = Math.max(250, Math.floor(base * (0.8 + Math.random() * 0.4)))
    const dmg = Math.min(dmgRoll, MAX_DAMAGE_PER_HIT)

    boss.hp = Math.max(0, boss.hp - dmg)
    boss.contributions[m.sender] = (boss.contributions[m.sender] || 0) + dmg
    user.lastWorldBossHit = Date.now()
    incrementProgress(user, 'worldbossHit', 1)

    if (boss.hp <= 0) boss.defeated = true

    return conn.reply(
      m.chat,
      `⚔️ Serangan berhasil!\nKamu memberi *${dmg} damage* ke *${boss.name}*.\nHP Boss sekarang: *${boss.hp}/${boss.maxHp}*${boss.defeated ? '\n\n🏆 Boss dikalahkan! Gunakan *.worldboss claim*' : ''}`,
      m
    )
  }

  if (sub === 'claim') {
    if (!boss.defeated) return m.reply('Boss belum dikalahkan. Serang dulu dengan *.worldboss hit*.')

    const contrib = boss.contributions[m.sender] || 0
    if (contrib <= 0) return m.reply('Kamu belum punya kontribusi pada boss ini.')
    if (boss.claimed[m.sender]) return m.reply('Reward boss untuk event ini sudah kamu ambil.')

    const ratio = contrib / boss.maxHp
    const money = Math.floor(20000 + ratio * 500000)
    const exp = Math.floor(500 + ratio * 10000)
    const shard = ratio >= 0.05 ? 1 : 0

    user.money += money
    user.exp += exp
    user.relicshard = (user.relicshard || 0) + shard
    boss.claimed[m.sender] = true

    return conn.reply(
      m.chat,
      `🎁 *Reward World Boss*\n+${money} Money\n+${exp} EXP\n+${shard} Relic Shard\n\nKontribusi kamu: *${contrib} damage*`,
      m
    )
  }

  const top = Object.entries(boss.contributions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([jid, val], i) => `${i + 1}. @${jid.split('@')[0]} - ${val} damage`)
    .join('\n') || '-'

  return conn.reply(
    m.chat,
    `👹 *WORLD BOSS*\nNama: ${boss.name}\nHP: ${boss.hp}/${boss.maxHp}\nStatus: ${boss.defeated ? 'DEFEATED' : 'ALIVE'}\nSisa event: ${fmt(boss.endsAt - Date.now())}\n\nTop kontribusi:\n${top}\n\nPerintah:\n- *.worldboss hit* (serang boss)\n- *.worldboss claim* (ambil reward jika boss sudah kalah)`,
    m,
    { mentions: Object.keys(boss.contributions).slice(0, 5) }
  )
}

handler.help = ['worldboss', 'worldboss hit', 'worldboss claim']
handler.tags = ['rpg']
handler.command = /^worldboss$/i
handler.register = true

module.exports = handler
