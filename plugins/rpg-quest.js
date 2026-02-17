let handler = async (m, { conn, usedPrefix, command, args }) => {
    let user = global.db.data.users[m.sender]
    if (typeof user.quest_progress !== 'number') user.quest_progress = 0

    let quests = [
        {
            title: "Penebang Kayu",
            desc: "Kumpulkan 10 Kayu dengan cara *.berburu* atau *.bansos* (jika beruntung).",
            check: (user) => user.kayu >= 10,
            reward: (user) => { user.exp += 1000; user.money += 1000 },
            rewardText: "1000 XP & 1000 Money"
        },
        {
            title: "Penambang",
            desc: "Buatlah Pickaxe dengan mengetik *.craft pickaxe* (Butuh Kayu & Batu).",
            check: (user) => user.pickaxe > 0,
            reward: (user) => { user.money += 2000; user.potion += 1 },
            rewardText: "2000 Money & 1 Potion"
        },
        {
            title: "Besi Berharga",
            desc: "Kumpulkan 5 Iron dengan cara *.nambang*.",
            check: (user) => user.iron >= 5,
            reward: (user) => { user.exp += 2000 },
            rewardText: "2000 XP"
        },
        {
            title: "Persiapan Tempur",
            desc: "Buatlah Sword dengan mengetik *.craft sword*.",
            check: (user) => user.sword > 0,
            reward: (user) => { user.potion += 2; user.common += 1 },
            rewardText: "2 Potion & 1 Common Crate (Kunci Dungeon)"
        },
        {
            title: "Petualang Pemula",
            desc: "Pergilah berpetualang dengan ketik *.adventure*. Pastikan nyawa penuh!",
            check: (user) => user.lastadventure > 0,
            reward: (user) => { user.money += 5000; user.diamond += 1 },
            rewardText: "5000 Money & 1 Diamond"
        },
        {
            title: "Penjelajah Dungeon",
            desc: "Masuklah ke Dungeon dengan ketik *.dungeon* (Butuh Common Crate).",
            check: (user) => user.lastdungeon > 0,
            reward: (user) => { user.money += 10000; user.mythic += 1 },
            rewardText: "10000 Money & 1 Mythic Crate"
        },
        {
            title: "Tamat (Sementara)",
            desc: "Nantikan update selanjutnya!",
            check: (user) => false,
            reward: (user) => {},
            rewardText: "-"
        }
    ]

    let current = quests[user.quest_progress]
    if (!current) return m.reply("Selamat! Kamu telah menyelesaikan semua quest.")

    let caption = `
📚 *QUEST LOG* 📚
Chapter: ${user.quest_progress + 1}
Judul: *${current.title}*

📜 *Misi:*
${current.desc}

🎁 *Hadiah:*
${current.rewardText}

Ketik *${usedPrefix}${command} claim* untuk mengambil hadiah jika sudah selesai.
`.trim()

    if (args[0] === 'claim') {
        if (current.check(user)) {
            current.reward(user)
            user.quest_progress += 1
            m.reply(`🎉 *QUEST COMPLETED!* 🎉\n\nKamu menerima:\n${current.rewardText}`)
        } else {
            m.reply("❌ Syarat belum terpenuhi! Baca misi dengan teliti.")
        }
    } else {
        m.reply(caption)
    }
}

handler.help = ['quest', 'story']
handler.tags = ['rpg']
handler.command = /^(quest|story|misi)$/i
handler.register = true

module.exports = handler
