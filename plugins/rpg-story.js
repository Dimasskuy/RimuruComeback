// plugins/rpg-story.js

const storyData = [
    {
        chapter: 1,
        title: "Kebangkitan di Hutan Gelap",
        image: "https://telegra.ph/file/0b0d3d5f308899885239a.jpg",
        narasi: `
*Chapter 1: Kebangkitan*

Kau membuka matamu perlahan. Cahaya matahari menembus celah-celah dedaunan rimbun di atasmu. Kepalamu terasa pening, dan kau tidak ingat bagaimana kau bisa sampai di sini.

Di sekelilingmu hanya ada pepohonan raksasa dan suara alam yang asing. Perutmu berbunyi nyaring. Kau sadar, kau harus bertahan hidup.

"Aku butuh sesuatu untuk membela diri... dan mungkin sedikit kayu bakar untuk nanti malam," gumammu pelan.

Kau melihat sebatang kayu kokoh tergeletak tak jauh darimu.
`,
        task: "Kumpulkan 5 Kayu",
        guide: "Ketik *.berburu* untuk mencari sumber daya di sekitar.",
        requirement: (user) => user.kayu >= 5,
        reward: { exp: 500, money: 500, kayu: 5 },
        rewardText: "500 EXP, 500 Money, +5 Kayu (Bonus)"
    },
    {
        chapter: 2,
        title: "Peralatan Pertama",
        image: "https://telegra.ph/file/5450893d5641777555827.jpg",
        narasi: `
*Chapter 2: Peralatan Pertama*

Malam telah berlalu. Kau berhasil membuat api unggun kecil, tapi itu tidak cukup. Hutan ini berbahaya. Kau mendengar lolongan serigala semalam.

Kau menemukan sebuah gua kecil yang sepertinya mengandung bebatuan keras. Jika kau bisa memecahkannya, kau bisa membuat alat yang lebih baik daripada sekadar tangan kosong.

"Aku butuh batu... banyak batu," pikirmu.
`,
        task: "Kumpulkan 5 Batu",
        guide: "Ketik *.berburu* lagi hingga kau mendapatkan cukup Batu.",
        requirement: (user) => user.batu >= 5,
        reward: { exp: 800, money: 1000, batu: 5 },
        rewardText: "800 EXP, 1000 Money, +5 Batu (Bonus)"
    },
    {
        chapter: 3,
        title: "Sang Pengrajin Amatir",
        image: "https://telegra.ph/file/992257544040940555355.jpg",
        narasi: `
*Chapter 3: Sang Pengrajin Amatir*

Dengan kayu dan batu di tanganmu, kau mulai bereksperimen. Kau menajamkan batu dengan batu lain, lalu mengikatnya ke batang kayu menggunakan akar tanaman merambat.

Sebuah Pickaxe (Beliung) kasar terbentuk di tanganmu. Ini bukan karya seni, tapi ini bisa membantumu menggali lebih dalam ke perut bumi.
`,
        task: "Buatlah (Craft) 1 Pickaxe",
        guide: "Ketik *.craft pickaxe* untuk membuat alat tambang pertamamu.",
        requirement: (user) => user.pickaxe > 0,
        reward: { exp: 1000, money: 1500, potion: 1 },
        rewardText: "1000 EXP, 1500 Money, 1 Potion"
    },
    {
        chapter: 4,
        title: "Demam Emas... Atau Besi?",
        image: "https://telegra.ph/file/888555541090008882255.jpg",
        narasi: `
*Chapter 4: Demam Emas... Atau Besi?*

Kau kini memiliki Pickaxe! Dunia bawah tanah terbuka untukmu. Gua yang kau temukan sebelumnya ternyata lebih dalam dari dugaanmu. Dinding-dindingnya berkilauan samar.

Bukan emas, tapi Besi (Iron). Logam yang kuat. Logam yang bisa melindungimu.

Kau mengayunkan beliungmu. *TANG! TANG!* Suara besi beradu menggema di kegelapan gua.
`,
        task: "Tambang 5 Iron",
        guide: "Ketik *.nambang* untuk mulai menambang mineral berharga.",
        requirement: (user) => user.iron >= 5,
        reward: { exp: 1500, money: 2000, iron: 2 },
        rewardText: "1500 EXP, 2000 Money, +2 Iron (Bonus)"
    },
    {
        chapter: 5,
        title: "Bilah Pelindung",
        image: "https://telegra.ph/file/111000222999333888444.jpg",
        narasi: `
*Chapter 5: Bilah Pelindung*

Besi yang kau kumpulkan cukup untuk membuat sesuatu yang tajam. Sesuatu untuk membunuh. Hutan ini semakin liar. Kemarin kau melihat jejak kaki besar—terlalu besar untuk serigala biasa.

Kau memanaskan besi itu, memukulnya, dan membentuknya. Sebuah pedang (Sword). Berat, tajam, dan mematikan. Sekarang, kau bukan lagi mangsa. Kau adalah pemburu.
`,
        task: "Buatlah (Craft) 1 Sword",
        guide: "Ketik *.craft sword* di menu crafting.",
        requirement: (user) => user.sword > 0,
        reward: { exp: 2000, money: 3000, sworddurability: 100 },
        rewardText: "2000 EXP, 3000 Money, Durability Pedang Penuh"
    },
    {
        chapter: 6,
        title: "Panggilan Petualangan",
        image: "https://telegra.ph/file/777222111000999888333.jpg",
        narasi: `
*Chapter 6: Panggilan Petualangan*

Dengan pedang di punggung dan bekal di tas, kau merasa siap. Dunia ini luas. Ada desa di balik bukit, ada reruntuhan kuno di lembah, dan ada rumor tentang Dungeon yang menyimpan harta karun legendaris.

Kau melangkah keluar dari kemah sementaramu. Angin berhembus kencang, membawa aroma petualangan. Saatnya menjelajah.
`,
        task: "Pergilah Berpetualang (Adventure)",
        guide: "Ketik *.adventure* untuk menjelajahi dunia luar.",
        requirement: (user) => user.lastadventure > 0, // Simplified check
        reward: { exp: 3000, money: 5000, common: 1 },
        rewardText: "3000 EXP, 5000 Money, 1 Common Crate (Kunci Dungeon)"
    },
    {
        chapter: 7,
        title: "Gerbang Kegelapan",
        image: "https://telegra.ph/file/666555444333222111000.jpg",
        narasi: `
*Chapter 7: Gerbang Kegelapan*

Dalam petualanganmu, kau menemukan sebuah pintu batu raksasa yang tertutup lumut. Ada celah berbentuk kotak di tengahnya.

Kau teringat kotak "Common Crate" yang kau temukan saat mengalahkan monster di hutan tadi. Bentuknya pas!

Di balik pintu ini... hawa dingin menusuk tulang. Dungeon. Tempat para pahlawan lahir, atau mati.
`,
        task: "Masuk ke Dungeon",
        guide: "Ketik *.dungeon* (Pastikan punya Common Crate & Nyawa Penuh!)",
        requirement: (user) => user.lastdungeon > 0, // Simplified check
        reward: { exp: 5000, money: 10000, mythic: 1, title: "Dungeon Walker" },
        rewardText: "5000 EXP, 10000 Money, 1 Mythic Crate, Title: Dungeon Walker"
    }
]

let handler = async (m, { conn, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender]
    if (typeof user.story_chapter !== 'number') user.story_chapter = 0

    let currentChapterIndex = user.story_chapter
    let story = storyData[currentChapterIndex]

    if (!story) {
        return m.reply(`
🎉 *SELAMAT!* 🎉

Kamu telah menyelesaikan semua Chapter Cerita yang tersedia saat ini!
Nantikan update cerita selanjutnya dari Developer.

Teruslah berlatih, kumpulkan harta, dan jadilah yang terkuat!
`.trim())
    }

    // Logic Claim / Next
    if (m.text.toLowerCase().includes('next') || m.text.toLowerCase().includes('lanjut')) {
        if (story.requirement(user)) {
            // Berikan Hadiah
            for (let [key, value] of Object.entries(story.reward)) {
                if (key === 'title') user.title = value
                else user[key] = (user[key] || 0) + value
            }

            user.story_chapter += 1
            m.reply(`
✅ *MISI SELESAI!*

Kamu mendapatkan:
${story.rewardText}

Ketik *${usedPrefix}${command}* untuk melanjutkan ke Chapter berikutnya!
`.trim())
        } else {
            m.reply(`
❌ *SYARAT BELUM TERPENUHI*

Tugasmu: *${story.task}*
Petunjuk: _${story.guide}_

Selesaikan tugas tersebut lalu ketik *${usedPrefix}${command} next* lagi.
`.trim())
        }
        return
    }

    // Tampilan Story
    let caption = `
━━━━━━━━━━━━━━━━━━━
📖 *S T O R Y - M O D E*
━━━━━━━━━━━━━━━━━━━

${story.narasi}

━━━━━━━━━━━━━━━━━━━
🎯 *MISI SAAT INI:*
${story.task}

💡 *PETUNJUK:*
${story.guide}

🎁 *HADIAH:*
${story.rewardText}
━━━━━━━━━━━━━━━━━━━

Ketik *${usedPrefix}${command} next* jika sudah menyelesaikan misi.
`.trim()

    await conn.sendMessage(m.chat, {
        image: { url: story.image },
        caption: caption
    }, { quoted: m })
}

handler.help = ['story', 'petualangan']
handler.tags = ['rpg']
handler.command = /^(story|petualangan|cerita)$/i
handler.register = true

module.exports = handler
