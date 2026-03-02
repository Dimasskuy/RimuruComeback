let handler = async (m, { conn }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('Data user tidak ditemukan.')

  if (typeof user.relicshard !== 'number') user.relicshard = 0
  if (typeof user.ancientrelic !== 'number') user.ancientrelic = 0

  const need = 10
  if (user.relicshard < need) {
    return m.reply(`Relic Shard kamu belum cukup. Butuh *${need}* shard untuk 1 Ancient Relic.\nShard kamu: *${user.relicshard}*`)
  }

  user.relicshard -= need
  user.ancientrelic += 1

  return conn.reply(m.chat, `✨ Craft sukses!\n- ${need} Relic Shard\n+ 1 Ancient Relic\n\nAncient Relic kamu: *${user.ancientrelic}*`, m)
}

handler.help = ['reliccraft']
handler.tags = ['rpg']
handler.command = /^reliccraft$/i
handler.register = true

module.exports = handler
