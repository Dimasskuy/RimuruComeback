let handler = async (m, { conn, args, usedPrefix }) => {
  try {
    global.DATABASE.data.users[m.sender].lastngepet = global.db.data.users[m.sender].lastngepet || 0
    let randomaku = `${Math.floor(Math.random() * 100)}`.trim()
    let randomkamu = `${Math.floor(Math.random() * 100)}`.trim()
    let Aku = (randomaku * 1)
    let Kamu = (randomkamu * 1)

    let __timers = (new Date - global.db.data.users[m.sender].lastngepet)
    let _timers = (3600000 - __timers) // 1 hour cooldown
    let timers = clockString(_timers)
    let user = global.db.data.users[m.sender]
    if (new Date - global.db.data.users[m.sender].lastngepet > 3600000) { // 1 hour
      if (Aku > Kamu) {
        let reward = Math.floor(Math.random() * 500000) + 250000 // 250K-750K
        user.money += reward
        conn.sendMessage(m.chat, {
          text: `Kamu berhasil Ngepet, Dan kamu mendapatkan ${reward.toLocaleString()} rupiah`,
          contextInfo: {
            externalAdReply: {
              title: 'Selamat! Kamu dapat money 💰',
              body: `+${reward.toLocaleString()} Money`,
              thumbnailUrl: 'https://telegra.ph/file/6a6a440d7f123bed78263.jpg',
              mediaType: 1,
              showAdAttribution: false,
              renderLargerThumbnail: true
            }
          }
        })
        global.db.data.users[m.sender].lastngepet = new Date * 1
      } else if (Aku < Kamu) {
        let penalty = Math.floor(Math.random() * 200000) + 100000 // 100K-300K
        user.money -= penalty
        conn.sendMessage(m.chat, {
          text: `Kamu ketahuan saat Ngepet! Kamu kehilangan ${penalty.toLocaleString()} rupiah`,
          contextInfo: {
            externalAdReply: {
              title: 'Yahh.. Kamu ketahuan! 😞',
              body: `-${penalty.toLocaleString()} Money`,
              thumbnailUrl: 'https://telegra.ph/file/d9fdd23790ab42280ca30.jpg',
              mediaType: 1,
              showAdAttribution: false,
              renderLargerThumbnail: true
            }
          }
        })
        global.db.data.users[m.sender].lastngepet = new Date * 1
      } else {
        conn.sendMessage(m.chat, `Kamu berhasil melarikan diri tanpa mendapatkan atau kehilangan apapun!`, m)
        global.db.data.users[m.sender].lastngepet = new Date * 1
      }
    } else conn.sendMessage(m.chat, {
      text: `Kamu sudah melakukan *ngepet*\nDan kamu harus menunggu selama ${timers} lagi`,
      contextInfo: {
        externalAdReply: {
          title: 'C O O L D O W N',
          body: `${timers}`,
          thumbnailUrl: 'https://telegra.ph/file/295949ff5494f3038f48c.jpg',
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: true
        }
      }
    })
  } catch (e) {
    throw `${e}`
  }
}

handler.help = ['ngepet']
handler.tags = ['rpg']
handler.command = /^(ngepet|ngefet)$/i
handler.premium = false
handler.group = true

handler.fail = null
handler.register = true
module.exports = handler

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}
function clockString(ms) {
  if (ms <= 0) return '00:00:00'
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}
