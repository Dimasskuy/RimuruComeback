const { incrementProgress } = require('../lib/rpgProgress')

function createTambangs() {
    const areaNames = [
        'Emas', 'Perak', 'Berlian', 'Batu Permata', 'Uranium', 'Emas Hitam',
        'Kristal', 'Rubi', 'Safir', 'Topaz', 'Ametis', 'Zamrud', 'Opal', 'Kuarsa',
        'Safir Merah', 'Topaz Biru', 'Ametis Ungu', 'Rubi Merah', 'Emas Putih',
        'Berlian Biru', 'Batu Permata Hitam', 'Uranium Radioaktif', 'Kristal Langka',
        'Pirus', 'Garnet', 'Kalimaya', 'Kuarsit', 'Lapis Lazuli', 'Rodokrosit',
        'Yaspis', 'Malakit', 'Hessonit', 'Peridot', 'Amber', 'Kornerupin',
        'Morganit', 'Labradorit', 'Akuamarin', 'Tanzanite', 'Batu Delima', 'Kunzit',
        'Maw-sit-sit', 'Sphene', 'Kyanite', 'Alexandrite', 'Variscite'
    ]

    return areaNames.map((areaName, i) => ({
        area: `Tambang ${areaName}`,
        txt: areaName.toLowerCase().replace(/ /g, '_'),
        reward: {
            exp: 50 + (i * 20),
            resources: {
                diamond: Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0,
                emerald: Math.random() > 0.65 ? Math.floor(Math.random() * 2) : 0,
                coal: Math.random() > 0.35 ? Math.floor(Math.random() * 6) : 0,
                iron: Math.random() > 0.4 ? Math.floor(Math.random() * 4) : 0,
                emas: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0,
                batu: Math.random() > 0.35 ? Math.floor(Math.random() * 6) : 0
            }
        }
    }))
}

function formatTime(ms) {
    let d = isNaN(ms) ? '--' : Math.floor(ms / 86400000)
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return ['\n' + d, ' *Hari ☀️*\n', h, ' *Jam 🕐*\n', m, ' *Menit ⏰*\n', s, ' *Detik ⏱️*'].map(v => v.toString().padStart(2, 0)).join('')
}

function buildCaption(areaItem, hasilTambang, totalReward, done = false) {
    const reward = areaItem.reward.resources
    const base = `🏞️ *AREA PERTAMBANGAN:* ${areaItem.area}\n\n🪨 Ketik *'${areaItem.txt}'* untuk menambang area ini.\n🔍 Progress hasil tambang: ${hasilTambang}`
    const gain = `\n💰 Exp area ini: ${areaItem.reward.exp}\n💎 Reward area: Diamond ${reward.diamond}, Emerald ${reward.emerald}, Coal ${reward.coal}, Iron ${reward.iron}, Emas ${reward.emas}, Batu ${reward.batu}`
    const total = `\n📦 Total sementara: Diamond ${totalReward.diamond}, Emerald ${totalReward.emerald}, Coal ${totalReward.coal}, Iron ${totalReward.iron}, Emas ${totalReward.emas}, Batu ${totalReward.batu}`
    return done ? `${base}${gain}${total}` : `${base}${gain}${total}\n\n> ketik *stop* untuk berhenti`
}

async function handler(m, { conn, text }) {
    conn.tambang = conn.tambang || {}
    let user = global.db.data.users[m.sender]

    if (m.sender in conn.tambang) {
        return m.reply('⏳ Kamu masih punya sesi tambang aktif. Lanjutkan area berikutnya atau ketik *stop*.')
    }

    if (text !== 'start') {
        return m.reply("🏅 *Mode Pertambangan*\n- Ketik *tambang start* untuk mulai.\n- Ikuti kata kunci area yang diberikan bot.\n- Ketik *stop* untuk berhenti kapan saja.")
    }

    if (!user) return m.reply('📝 Silakan daftar untuk bermain game.')
    if (user.healt <= 0 || user.stamina <= 0) return m.reply('❗ Stamina/healt Anda kurang dari 1.')
    if (typeof user.exp !== 'number') user.exp = 0
    if (typeof user.lastnambang !== 'number') user.lastnambang = 0

    const fields = ['diamond', 'emerald', 'coal', 'iron', 'emas', 'batu']
    for (const f of fields) if (typeof user[f] !== 'number') user[f] = 0

    const cooldown = 5 * 60 * 1000
    let timers = cooldown - (Date.now() - user.lastnambang)
    if (timers > 0) return m.reply(`Silakan tunggu ${formatTime(timers)} lagi sebelum memulai pertambangan baru.`)

    const tambangs = createTambangs()
    const totalReward = { diamond: 0, emerald: 0, coal: 0, iron: 0, emas: 0, batu: 0 }

    conn.tambang[m.sender] = {
        areas: tambangs,
        currentArea: 0,
        hasilTambang: 0,
        totalReward
    }

    return m.reply(buildCaption(tambangs[0], 0, totalReward))
}

handler.before = async function (m, { conn }) {
    conn.tambang = conn.tambang || {}
    if (!(m.sender in conn.tambang)) return
    if (m.isBaileys || !m.text) return

    let state = conn.tambang[m.sender]
    let user = global.db.data.users[m.sender]
    let msg = m.text.toLowerCase().trim()

    if (msg === 'stop') {
        m.reply("❌ Pertambangan dihentikan. Ketik *'tambang start'* untuk memulai lagi.")
        delete conn.tambang[m.sender]
        return false
    }

    const currentArea = state.currentArea
    if (currentArea >= state.areas.length) {
        delete conn.tambang[m.sender]
        return false
    }

    const current = state.areas[currentArea]
    if (current.txt !== msg) return false

    user.exp += current.reward.exp
    for (const [resource, amount] of Object.entries(current.reward.resources)) {
        if (typeof user[resource] !== 'number') user[resource] = 0
        if (typeof state.totalReward[resource] !== 'number') state.totalReward[resource] = 0
        user[resource] += amount
        state.totalReward[resource] += amount
    }

    state.hasilTambang += 1
    incrementProgress(user, 'nambang', 1)
    state.currentArea += 1
    user.lastnambang = Date.now()

    if (state.currentArea >= state.areas.length) {
        m.reply(`🎉 Selamat! Anda menuntaskan semua area pertambangan.\n🔍 Total area selesai: ${state.hasilTambang}\n📦 Total reward: Diamond ${state.totalReward.diamond}, Emerald ${state.totalReward.emerald}, Coal ${state.totalReward.coal}, Iron ${state.totalReward.iron}, Emas ${state.totalReward.emas}, Batu ${state.totalReward.batu}`)
        delete conn.tambang[m.sender]
        return false
    }

    const nextArea = state.areas[state.currentArea]
    m.reply(buildCaption(nextArea, state.hasilTambang, state.totalReward))
    return false
}

handler.help = ['tambang']
handler.tags = ['rpg']
handler.command = /^(tambang)$/i
handler.group = true
handler.register = true

module.exports = handler
