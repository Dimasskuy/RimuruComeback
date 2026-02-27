let handler = async (m, { conn }) => {
    let user = global.db.data.users[m.sender]
    let __timers = (new Date - (user.lasttaxi || 0))
    let _timers = (3600000 - __timers)
    let order = user.taxi || 0
    let timers = clockString(_timers)
    let name = conn.getName(m.sender)
    let id = m.sender
    let kerja = 'taxi'
    conn.misi = conn.misi ? conn.misi : {}
    if (id in conn.misi) {
        conn.reply(m.chat, `Selesaikan orderan taxi kamu ${conn.misi[id][0]} Terlebih Dahulu`, m)
        throw false
    }
    if (new Date - user.lasttaxi > 3600000) {
        let randomaku1 = Math.floor(Math.random() * 1000000)
        let randomaku2 = Math.floor(Math.random() * 10000)

        var njir = `
🚶⬛⬛⬛⬛⬛⬛⬛⬛⬛
⬛⬜⬜⬜⬛⬜⬜⬜⬛⬛
⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛
🏘️🏘️🏘️🏘️🌳  🌳 🏘️       🚕


✔️ Mendapatkan orderan....
`.trim()

        var njirr = `
🚶⬛⬛⬛⬛⬛🚐⬛⬛⬛🚓🚚
🚖⬜⬜⬜⬛⬜⬜⬜🚓⬛🚑
⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🚙
🏘️🏘️🏢️🌳  🌳 🏘️  🏘️🏡


🚖 Mengantar Ke tujuan.....
`.trim()

        var njirrr = `
⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🚓
⬛⬜🚗⬜⬜⬛⬜🚐⬜⬜⬛🚙🚚🚑
⬛⬛⬛⬛🚒⬛⬛⬛⬛⬛⬛🚚
🏘️🏘️🏘️🏘️🌳  🌳 🏘️


🚖 Selesai Mengantar Pelanggan....
`.trim()

        var njirrrr = `
➕ 💹Menerima gaji....
`.trim()

        var hasil = `
*—[ Hasil taxi @${m.sender.split('@')[0]} ]—*
➕ 💹 Uang = [ ${randomaku1} ]
➕ ✨ Exp = [ ${randomaku2} ]
➕ 😍 Order Selesai = +1
➕ 📥Total Order Sebelumnya : ${order}
`.trim()

        user.money += randomaku1
        user.exp += randomaku2
        user.taxi += 1

        conn.misi[id] = [
            kerja,
        setTimeout(() => {
            delete conn.misi[id]
        }, 27000)
        ]

        let arr = [
            '🔍Mencari orderan buat kamu.....',
            njir,
            njirr,
            njirrr,
            njirrrr,
            hasil
        ]

        let { key } = await conn.sendMessage(m.chat, {text: arr[0], mentions: [m.sender]})
        for (let i = 1; i < arr.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            await conn.sendMessage(m.chat, { text: arr[i], edit: key, mentions: [m.sender] });
        }

        user.lasttaxi = new Date * 1
    } else m.reply(`kamu kecapean, istirahat dulu selama ${timers}, baru gas ngorder lagi`)
}
handler.help = ['taxi']
handler.tags = ['rpg']
handler.command = /^(taxi)$/i
handler.group = true
handler.rpg = true

handler.register = true
module.exports = handler;


function clockString(ms) {
    if (ms <= 0) return '00:00:00'
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}