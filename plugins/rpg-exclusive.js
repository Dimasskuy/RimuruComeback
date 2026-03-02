const { EXCLUSIVE_ITEMS } = require('../lib/rpgRules')

let handler = async (m, { conn }) => {
  const lines = Object.entries(EXCLUSIVE_ITEMS).map(([key, item], i) => {
    return `${i + 1}. *${item.name}* (${key})\n   Cara dapat: ${item.obtain}\n   Status: *Tidak bisa dibeli di shop*`
  })

  const txt = `🏆 *RPG Exclusive Items*\n\n${lines.join('\n\n')}\n\nGunakan *.relichunt* dan *.reliccraft* untuk memulai progres item eksklusif.`
  return conn.reply(m.chat, txt, m)
}

handler.help = ['exclusiveitem', 'rpgexclusive']
handler.tags = ['rpg']
handler.command = /^(exclusiveitem|rpgexclusive)$/i
handler.register = true

module.exports = handler
