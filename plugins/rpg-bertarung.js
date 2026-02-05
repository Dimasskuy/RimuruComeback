let handler = async (m, { conn, text }) => {
  let user = global.db.data.users[m.sender]
  let opponent = m.mentionedJid[0]

  if (!user || !global.db.data.users[opponent]) {
    return conn.reply(m.chat, '• *Example :* .bertarung @user', m)
  }

	conn.sendMessage(m.chat, {
		react: {
			text: '🕒',
			key: m.key,
		}
	})

  let alasanKalah = `${pickRandom(['kamu terlalu lemah untuk menang','kamu kurang latihan','lawanmu lebih kuat dari perkiraan','strategimu tidak efektif','kamu kurang fokus dalam pertandingan'])}`
  let alasanMenang = `${pickRandom(['kamu berhasil menggunakan kekuatan elemental untuk menghancurkan pertahanan lawan dan mendapatkan','kamu berhasil melancarkan serangan mematikan dengan gerakan akrobatik yang membingungkan lawan, dan mendapatkan','kamu menang karena semangat juang yang tinggi','kamu berhasil menang karena kerja keras dan strategi yang matang','kamu berhasil menang karena bot memberimu keberuntungan','kamu berhasil menang karena kamu melawan dengan sepenuh hati'])}`

  let betAmount = Math.floor(Math.random() * (10000000 - 10000 + 1)) + 10000

  if (user.money < betAmount) {
    return conn.reply(m.chat, 'Uang Anda tidak mencukupi', m)
  }

  if (user.lastWar && (new Date - user.lastWar) < 3600000) { // 1 jam dalam milidetik
    let remainingTime = Math.ceil((3600000 - (new Date() - user.lastWar)) / 1000)
    return conn.reply(m.chat, `Anda harus menunggu ${Math.floor(remainingTime/60)} menit ${remainingTime%60} detik sebelum dapat bertarung lagi`, m)
  }

  conn.reply(m.chat, 'Mempersiapkan arena...', m)

  setTimeout(() => {
    conn.reply(m.chat, 'Mendapatkan arena...', m)

    setTimeout(() => {
      conn.reply(m.chat, 'Bertarung...', m)

      setTimeout(() => {
        let result = Math.random() >= 0.5
        let wonAmount = result ? betAmount : -betAmount

        user.money += wonAmount
        global.db.data.users[opponent].money -= wonAmount

        let opponentName = conn.getName(opponent)

        let caption = `❏  *F I G H T*\n\n`
        caption += `Lawan Anda Adalah: ${opponentName}\nLevel: [${global.db.data.users[m.sender].level}]\n\n`

        if (result) {
          caption += `*Menang!*, ${alasanMenang},+${betAmount} Money\n`
          caption += `Uang Anda saat ini: ${user.money}\n`
          conn.sendFile(m.chat, 'https://telegra.ph/file/e3d5059b970d60bc438ac.jpg', 'You_Win.jpg', caption, m)
        } else {
          caption += `*kalah!*, ${alasanKalah},-${betAmount} Money\n`
          caption += `Uang Anda saat ini: ${user.money}\n`
          conn.sendFile(m.chat, 'https://telegra.ph/file/86b2dc906fb444b8bb6f7.jpg', 'You_Lose.jpg', caption, m)
        }

        user.lastWar = new Date()

        setTimeout(() => {
          conn.reply(m.chat, `Anda dapat bertarung lagi setelah 1 jam`, m)
        }, 5000) // https://github.com/SazumiVicky/MakeMeow-Games
      }, 2000)
    }, 2000)
  }, 2000)
}

handler.help = ['bertarung *@user*', 'fight *@user*']
handler.tags = ['rpg']
handler.command = /^(fight|bertarung)$/i
handler.group = true


handler.register = true
module.exports = handler

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}