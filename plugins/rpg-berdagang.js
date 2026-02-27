// let pajak = 0.02
let handler = async (m, { conn, text }) => {
let dapat = (Math.floor(Math.random() * 5000))
  let who
  if (m.isGroup) who = m.mentionedJid[0]
  else who = m.chat
  if (!who) throw '• *Example :* .berdagang @user'
  if (typeof db.data.users[who] == 'undefined') throw 'Pengguna tidak ada didalam data base'
  let __timers = (new Date - global.db.data.users[m.sender].lastdagang)
  let _timers = (14400000 - __timers) // 4 hours cooldown
  let timers = clockString(_timers)
  let users = global.db.data.users
  let username = conn.getName(who)
  if (new Date - global.db.data.users[m.sender].lastdagang > 14400000){ // 4 hours
  if (4999 > users[who].money) throw 'Target tidak memiliki modal harap masukkan modal 5000'
  if (4999 > users[m.sender].money) throw 'kamu tidak memiliki modal harap masukkan modal 5000'
  users[who].money -= dapat * 1
 users[m.sender].money -= dapat * 1
  global.db.data.users[m.sender].lastdagang = new Date * 1
  conn.reply(m.chat, `Mohon tunggu kak..\nKamu dan @${who.split`@`[0]} sedang berdagang.. 😅\n\nKamu dan @${who.split`@`[0]} meletakkan modal -${dapat.toLocaleString()} 😅`, m)
  setTimeout(() => {
					conn.reply(m.chat, `💼 Hasil dagang sesi 1:\nKamu: +25.000\n@${who.split`@`[0]}: +25.000`, m)
					users[m.sender].money += 25000
					users[who].money += 25000
					}, 1800000) // 30 min
  setTimeout(() => {
					conn.reply(m.chat, `💼 Hasil dagang sesi 2:\nKamu: +25.000\n@${who.split`@`[0]}: +25.000`, m)
					users[m.sender].money += 25000
					users[who].money += 25000
					}, 3600000) // 1 hour
  setTimeout(() => {
					conn.reply(m.chat, `💼 Hasil dagang sesi 3:\nKamu: +25.000\n@${who.split`@`[0]}: +25.000`, m)
					users[m.sender].money += 25000
					users[who].money += 25000
					}, 5400000) // 1.5 hour
  setTimeout(() => {
					conn.reply(m.chat, `💼 Hasil dagang sesi 4:\nKamu: +50.000\n@${who.split`@`[0]}: +50.000\n\n✅ DAGANG SELESAI!\nTotal profit: +100.000`, m)
					users[m.sender].money += 50000
					users[who].money += 50000
					}, 7200000) // 2 hours
}else conn.reply(m.chat, `Anda Sudah Berdagang, tunggu ${timers} lagi..`, m)
}
handler.help = ['berdagang *@tag*']
handler.tags = ['rpg']
handler.command = /^berdagang$/
handler.group = true


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