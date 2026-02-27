let handler = async (m, {
conn,
usedPrefix
}) => {
    let __timers = (new Date - global.db.data.users[m.sender].kerjatiga)
    let _timers = (9000000 - __timers)
    let order = global.db.data.users[m.sender].ojek
    let timers = clockString(_timers)
    let user = global.db.data.users[m.sender]
    if (new Date - global.db.data.users[m.sender].kerjatiga > 300000) {
let rndm1 = `${Math.floor(Math.random() * 10)}`
let rndm2 = `${Math.floor(Math.random() * 10)}`
.trim()

let ran1 = (rndm1 * 1000)
let ran2 = (rndm2 * 10)

let hmsil1 = `${ran1}`
let hmsil2 = `${ran2}`

let jln = `
🚶         🚕

✔️ Mengincar target....
`

let jln2 = `
🚶     🚶

➕ Memulai aksi....
`

let jln3 = `
🚶

➕ Merampok....
`

let jln4 = `
         🚕



🚶

➕ 💹Berhasil kabur....
`

let hsl = `
*—[ Hasil rob ]—*

 ➕ 💹 Uang = [ ${hmsil1} ]
 ➕ ✨ Exp = [ ${hmsil2} ]
 ➕ 📦 Copet Selesai = +1

Dan stamina anda berkurang -20
`
user.money += ran1
user.exp += ran2
user.stamina -= 20
user.warn += 1

let arr = [
    '🔍Mencari orang.....',
    jln,
    jln2,
    jln3,
    jln4,
    hsl
]

let { key } = await conn.sendMessage(m.chat, {text: arr[0]})
for (let i = 1; i < arr.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    await conn.sendMessage(m.chat, { text: arr[i], edit: key });
}

  user.kerjatiga = new Date * 1
                    }
                    else m.reply(`Sepertinya anda sudah kecapekan silahkan istirahat dulu sekitar\n*${timers}*`)
}
handler.help = ['copet']
handler.tags = ['rpg']
handler.command = /^(copet)$/i
handler.group = true

handler.register = true
module.exports = handler

function clockString(ms) {
  if (ms <= 0) return '00:00:00'
  let d = isNaN(ms) ? '--' : Math.floor(ms / 86400000)
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return ['\n' + d, ' *Days ☀️*\n ', h, ' *Hours 🕐*\n ', m, ' *Minute ⏰*\n ', s, ' *Second ⏱️* '].map(v => v.toString().padStart(2, 0)).join('')
}