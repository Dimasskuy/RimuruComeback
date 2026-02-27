let handler = async (m, { conn }) => {
    let __timers = (new Date - global.db.data.users[m.sender].kerjaempat)
    let _timers = (3600000 - __timers)
    let name = conn.getName(m.sender)
    let user = global.db.data.users[m.sender]
    let id = m.sender
	let kerja = 'Bunuh'
    conn.misi = conn.misi ? conn.misi : {}
    if (id in conn.misi) {
        conn.reply(m.chat, `Selesaikan Misi ${conn.misi[id][0]} Terlebih Dahulu`, m)
        throw false
    }
    if (new Date - global.db.data.users[m.sender].kerjaempat > 3600000) {
        let randomaku4 = Math.floor(Math.random() * 10)
        let randomaku5 = Math.floor(Math.random() * 10)

        let rbrb4 = (randomaku4 * 100000)
        let rbrb5 = (randomaku5 * 1000)

        var dimas = `
🕵️ Mendapatkan Target.....
`.trim()

        var dimas2 = `
⚔️ Menusuk Tubuhnya.....
`.trim()

        var dimas3 = `
☠️ Target meninggal\nDan kamu mengambil barang² nya
`.trim()

        var dimas4 = `
💼 Hasil dari membunuh....
`.trim()

        var hsl = `
*—[ Hasil @${m.sender.split('@')[0]} ]—*
➕ 💹 Uang = [ ${rbrb4} ]
➕ ✨ Exp = [ ${rbrb5} ]
➕ 👮 Pelanggaran +1
➕ ☑️ Misi Berhasil = +1
`.trim()

		user.money += rbrb4
        user.exp += rbrb5
        user.warn += 1

		conn.misi[id] = [
        	kerja,
        setTimeout(() => {
            delete conn.misi[id]
        }, 27000)
    	]

        let arr = [
            '🔍Mencari Target pembunuhan.....',
            dimas,
            dimas2,
            dimas3,
            dimas4,
            hsl
        ]

        let { key } = await conn.sendMessage(m.chat, {text: arr[0], mentions: [m.sender]})
        for (let i = 1; i < arr.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            await conn.sendMessage(m.chat, { text: arr[i], edit: key, mentions: [m.sender] });
        }

        user.kerjaempat = new Date * 1
    } else {
        let timers = clockString(_timers)
        m.reply(`Silahkan Menunggu Selama ${timers}, Untuk Menyelesaikan Misi Kembali`)
    }
}
handler.help = ['hitman']
handler.tags = ['rpg']
handler.command = /^(bunuh|hitman)$/i
handler.group = true
handler.level = 10

handler.register = true
module.exports = handler

function clockString(ms) {
    if (ms <= 0) return '00:00:00'
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}
