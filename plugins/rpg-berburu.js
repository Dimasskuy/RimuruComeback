const { incrementProgress } = require('../lib/rpgProgress')
let handler = async (m, { conn }) => {
    let __timers = (new Date - global.db.data.users[m.sender].lastberburu)
    let _timers = (3600000 - __timers)
    let timers = clockString(_timers)
    let user = global.db.data.users[m.sender]

    if (new Date - global.db.data.users[m.sender].lastberburu > 3600000) {
        let randomaku1 = `${Math.floor(Math.random() * 10)}`
        let randomaku2 = `${Math.floor(Math.random() * 10)}`
        let randomaku4 = `${Math.floor(Math.random() * 10)}`
        let randomaku3 = `${Math.floor(Math.random() * 10)}`
        let randomaku5 = `${Math.floor(Math.random() * 10)}`
        let randomaku6 = `${Math.floor(Math.random() * 10)}`
        let randomaku7 = `${Math.floor(Math.random() * 10)}`
        let randomaku8 = `${Math.floor(Math.random() * 10)}`
        let randomaku9 = `${Math.floor(Math.random() * 10)}`
        let randomaku10 = `${Math.floor(Math.random() * 10)}`
        let randomaku11 = `${Math.floor(Math.random() * 10)}`
        let randomaku12 = `${Math.floor(Math.random() * 10)}`.trim()

        let rbrb1 = (randomaku1 * 1)
        let rbrb2 = (randomaku2 * 1)
        let rbrb3 = (randomaku3 * 1)
        let rbrb4 = (randomaku4 * 1)
        let rbrb5 = (randomaku5 * 1)
        let rbrb6 = (randomaku6 * 1)
        let rbrb7 = (randomaku7 * 1)
        let rbrb8 = (randomaku8 * 1)
        let rbrb9 = (randomaku9 * 1)
        let rbrb10 = (randomaku10 * 1)
        let rbrb11 = (randomaku11 * 1)
        let rbrb12 = (randomaku12 * 1)

        let hsl = `
• *Hasil Berburu*

 *🐂 = [ ${rbrb1} ]*         *🐃 = [ ${rbrb7} ]*
 *🐅 = [ ${rbrb2} ]*         *🐮 = [ ${rbrb8} ]*
 *🐘 = [ ${rbrb3} ]*         *🐒 = [ ${rbrb9} ]*
 *🐐 = [ ${rbrb4} ]*         *🐗 = [ ${rbrb10} ]*
 *🐼 = [ ${rbrb5} ]*         *🐖 = [ ${rbrb11} ]*
 *🐊 = [ ${rbrb6} ]*         *🐓 = [ ${rbrb12} ]*
`
        global.db.data.users[m.sender].banteng += rbrb1
        global.db.data.users[m.sender].harimau += rbrb2
        global.db.data.users[m.sender].gajah += rbrb3
        global.db.data.users[m.sender].kambing += rbrb4
        global.db.data.users[m.sender].panda += rbrb5
        global.db.data.users[m.sender].buaya += rbrb6
        global.db.data.users[m.sender].kerbau += rbrb7
        global.db.data.users[m.sender].sapi += rbrb8
        global.db.data.users[m.sender].monyet += rbrb9
        global.db.data.users[m.sender].babihutan += rbrb10
        global.db.data.users[m.sender].babi += rbrb11
        global.db.data.users[m.sender].ayam += rbrb12

        // Set cooldown immediately
        user.lastberburu = new Date * 1
        incrementProgress(user, 'hunt', 1)

        let { key } = await conn.sendMessage(m.chat, { text: 'Sedang mencari mangsa...' })
        await delay(4000)
        await conn.sendMessage(m.chat, { text: 'Mendapatkan sasaran!', edit: key })
        await delay(4000)
        await conn.sendMessage(m.chat, { text: hsl, edit: key })
    } else {
        m.reply(`\nKamu sudah berburu sebelumnya.
Istirahat dulu selama *${timers}* sebelum berburu lagi.`)
    }
}

handler.help = ['berburu']
handler.tags = ['rpg']
handler.command = /^(berburu|hunt)$/i
handler.register = true
module.exports = handler

function clockString(ms) {
    if (ms <= 0) return '00:00:00'
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
