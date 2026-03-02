const { incrementProgress } = require('../lib/rpgProgress')

const COOLDOWN = 6 * 60 * 60 * 1000

function clockString(ms) {
  if (ms <= 0) return '00:00:00'
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

let handler = async (m, { conn }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('Data user tidak ditemukan. Silakan daftar akun RPG terlebih dahulu.')

  if (typeof user.lastrelichunt !== 'number') user.lastrelichunt = 0
  if (typeof user.relicshard !== 'number') user.relicshard = 0

  const remain = COOLDOWN - (Date.now() - user.lastrelichunt)
  if (remain > 0) return m.reply(`Relic Hunt masih cooldown. Coba lagi dalam *${clockString(remain)}*.`)

  user.lastrelichunt = Date.now()

  // peluang shard + bonus material supaya tetap berguna
  const shardDrop = Math.random() < 0.45 ? 1 : 0
  const expGain = Math.floor(Math.random() * 250) + 150
  const moneyGain = Math.floor(Math.random() * 4500) + 1500

  user.exp += expGain
  user.money += moneyGain
  user.relicshard += shardDrop
  incrementProgress(user, 'relichunt', 1)

  const text = `🗺️ *Relic Hunt Selesai*\n\n+${expGain} EXP\n+${moneyGain} Money\n+${shardDrop} Relic Shard\n\nRelic Shard saat ini: *${user.relicshard}*\nGunakan *.reliccraft* untuk merakit Ancient Relic.`
  return conn.reply(m.chat, text, m)
}

handler.help = ['relichunt']
handler.tags = ['rpg']
handler.command = /^relichunt$/i
handler.register = true

module.exports = handler
