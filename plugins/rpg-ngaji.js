let handler = async (m, { conn }) => {
    let lastngaji = global.db.data.users[m.sender]?.lastngaji || 0
    let timers = 600000 - (Date.now() - lastngaji)
    let name = conn.getName(m.sender)
    let user = global.db.data.users[m.sender]

    if (timers <= 0) {
        let randomaku1 = Math.floor(Math.random() * 10)
        let randomaku2 = Math.floor(Math.random() * 10)
        let randomaku4 = Math.floor(Math.random() * 5)
        let randomaku3 = Math.floor(Math.random() * 10)
        let randomaku5 = Math.floor(Math.random() * 10)

        let rbrb1 = randomaku1 * 2
        let rbrb2 = randomaku2 * 10
        let rbrb3 = randomaku3 * 1
        let rbrb4 = randomaku4 * 15729
        let rbrb5 = randomaku5 * 20000

        var dimas = `
Ketemu ustadz...
`

        var dimas2 = `
Mulai mengaji
`

        var dimas3 = `
Diajarin tajwid
`

        var dimas4 = `
Ngasih tau, kalo qalqalah itu dipantulkan
`

        var hsl = `
*—[ Hasil Ngaji ${name} ]—*
➕💹 Uang jajan: ${rbrb4}
➕✨ Exp: ${rbrb5}
➕🤬 Dimarahin: -1
`

        user.warn -= 1
        user.money += rbrb4
        user.exp += rbrb5

        let arr = [
            'Mencari Guru Ngaji.....',
            dimas,
            dimas2,
            dimas3,
            dimas4,
            hsl
        ]

        let { key } = await conn.sendMessage(m.chat, {text: arr[0]})
        for (let i = 1; i < arr.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            await conn.sendMessage(m.chat, { text: arr[i], edit: key });
        }

        user.lastngaji = Date.now()
    } else {
        let clock = clockString(timers)
        conn.reply(m.chat, `Sepertinya Kamu Sudah Kecapekan Silahkan Istirahat Dulu Selama\n*${clock}*`, m)
    }
}
handler.help = ['mengaji', 'ngaji']
handler.tags = ['rpg']
handler.command = /^(mengajikeliling|mengaji|ngaji|ustad|ustadz|ustaz)$/i


handler.register = true
module.exports = handler

function clockString(ms) {
    if (ms <= 0) return '00:00:00'
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}