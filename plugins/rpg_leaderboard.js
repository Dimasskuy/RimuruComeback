let handler = async (m, { conn, args, usedPrefix, command }) => {
    let users = Object.entries(global.db.data.users).map(([key, value]) => {
        return { ...value, jid: key }
    })

    // Available categories
    const categories = {
        money: { name: 'Money', icon: '💰', field: 'money' },
        exp: { name: 'Exp', icon: '⚜️', field: 'exp' },
        level: { name: 'Level', icon: '🎚️', field: 'level' },
        limit: { name: 'Limit', icon: '🎫', field: 'limit' },
        diamond: { name: 'Diamond', icon: '💎', field: 'diamond' },
        bank: { name: 'Bank', icon: '🏦', field: 'bank' },
        nabung: { name: 'Nabung', icon: '💵', field: 'nabung' },
        strength: { name: 'Strength', icon: '💪', field: 'strength' },
        attack: { name: 'Attack', icon: '⚔️', field: 'attack' },
        defense: { name: 'Defense', icon: '🛡️', field: 'defense' },
        potion: { name: 'Potion', icon: '🧪', field: 'potion' },
        common: { name: 'Common Crate', icon: '📦', field: 'common' },
        uncommon: { name: 'Uncommon Crate', icon: '🎁', field: 'uncommon' },
        mythic: { name: 'Mythic Crate', icon: '🎁', field: 'mythic' },
        legendary: { name: 'Legendary Crate', icon: '🗃️', field: 'legendary' },
        pet: { name: 'Pet Token', icon: '🎫', field: 'pet' },
        kucing: { name: 'Kucing', icon: '🐱', field: 'kucing' },
        anjing: { name: 'Anjing', icon: '🐶', field: 'anjing' },
        rubah: { name: 'Rubah', icon: '🦊', field: 'rubah' },
        serigala: { name: 'Serigala', icon: '🐺', field: 'serigala' },
        kuda: { name: 'Kuda', icon: '🐴', field: 'kuda' },
        phonix: { name: 'Phonix', icon: '🐦‍🔥', field: 'phonix' },
        emerald: { name: 'Emerald', icon: '❇️', field: 'emerald' },
        iron: { name: 'Iron', icon: '⛓️', field: 'iron' },
        gold: { name: 'Gold', icon: '🪙', field: 'emas' },
        diamond: { name: 'Diamond', icon: '💎', field: 'diamond' },
        sampah: { name: 'Sampah', icon: '🗑️', field: 'sampah' },
        kayu: { name: 'Kayu', icon: '🪵', field: 'kayu' },
        batu: { name: 'Batu', icon: '🪨', field: 'batu' },
        string: { name: 'String', icon: '🧵', field: 'string' }
    }

    // Check for help command
    if (args[0] === 'help' || args[0] === 'h' || args[0] === '?') {
        let categoryList = Object.keys(categories).map(c => `• ${c}`).join('\n')
        return conn.reply(m.chat, `
╭━━━〔 *LEADERBOARD GUIDE* 〕━━━┈⊷
┃
┃ 📋 *Available Categories:*
┃ ${categoryList}
┃
┃ 💡 *How to Use:*
┃ ${usedPrefix + command} <category> [top]
┃
┃ 📝 *Examples:*
┃ ${usedPrefix + command} money      → Top 5 Money
┃ ${usedPrefix + command} money 10   → Top 10 Money
┃ ${usedPrefix + command} exp        → Top 5 Exp
┃ ${usedPrefix + command} level 15   → Top 15 Level
┃ ${usedPrefix + command} diamond    → Top 5 Diamond
┃ ${usedPrefix + command} limit      → Top 5 Limit
┃
┃ 🏆 *Quick Commands:*
┃ ${usedPrefix + command}            → All categories (Top 5)
┃ ${usedPrefix + command} help       → Show this guide
┃
╰────────────────┈⊷
        `.trim(), m)
    }

    // Get category from args
    let category = args[0] ? args[0].toLowerCase() : null
    
    // If no category, show all categories top 5
    if (!category) {
        let mainCategories = ['money', 'exp', 'level', 'limit', 'diamond', 'bank']
        let text = `╭━━━〔 *🏆 GLOBAL LEADERBOARD* 〕━━━┈⊷
┃
┃ 👋 Hai @${m.sender.split`@`[0]}!
┃ Berikut Top 5 untuk setiap kategori:
┃
`
        let mentions = []
        
        for (let catKey of mainCategories) {
            let cat = categories[catKey]
            let sorted = users.map(toNumber(cat.field)).sort(sort(cat.field))
            let top = 5
            let userRank = sorted.map(u => u.jid).indexOf(m.sender) + 1
            let userValue = global.db.data.users[m.sender][cat.field] || 0
            
            let leaderboardText = sorted.slice(0, top).map(({ jid, [cat.field]: value }, i) => {
                let rank = i + 1
                let medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
                mentions.push(jid)
                let suspicious = isSuspicious(value, catKey) ? ' ⚠️' : ''
                return `${medal} @${jid.split`@`[0]}${suspicious}\n   ${cat.icon} ${formatNumber(value)} ${cat.name}`
            }).join('\n\n')
            
            text += `
┃ ──────────────────
┃ ${cat.icon} *${cat.name} TOP 5*
┃
${leaderboardText}
┃
┃ 👤 *Your Rank:* #${userRank} (${formatNumber(userValue)} ${cat.name})
`
        }
        
        text += `
┃ ──────────────────
┃
┃ 💡 Ketik: *${usedPrefix + command} help*
┃ Untuk melihat semua kategori
┃
┃ ⚠️ = Nilai mencurigakan (possible cheat)
┃
╰────────────────┈⊷
`
        
        return conn.reply(m.chat, text, m, { mentions })
    }
    
    if (!categories[category]) {
        let categoryList = Object.keys(categories).map(c => `• ${c}`).join('\n')
        return conn.reply(m.chat, `
╭━━━〔 *LEADERBOARD CATEGORIES* 〕━━━┈⊷
┃
┃ Available Categories:
┃ ${categoryList}
┃
┃ *Usage:*
┃ ${usedPrefix + command} <category> [top]
┃
┃ *Example:*
┃ ${usedPrefix + command} money 10
┃ ${usedPrefix + command} exp
┃ ${usedPrefix + command} level 5
┃
┃ Ketik: *${usedPrefix + command} help*
┃ Untuk panduan lengkap
┃
╰────────────────┈⊷
        `.trim(), m)
    }

    let cat = categories[category]
    let sorted = users.map(toNumber(cat.field)).sort(sort(cat.field))
    let usersList = sorted.map(enumGetKey)
    
    // Get user rank
    let userRank = usersList.indexOf(m.sender) + 1
    let totalUsers = usersList.length
    
    // Pagination parameters
    let itemsPerPage = 10
    let page = args[1] && args[1].length > 0 ? Math.max(parseInt(args[1]), 1) : 1
    let totalPages = Math.ceil(sorted.length / itemsPerPage)
    page = Math.min(page, totalPages)

    let startIndex = (page - 1) * itemsPerPage
    let endIndex = startIndex + itemsPerPage

    // Get user value for the category
    let userValue = global.db.data.users[m.sender][cat.field] || 0

    // Format leaderboard text
    let leaderboardText = sorted.slice(startIndex, endIndex).map(({ jid, [cat.field]: value }, i) => {
        let name = conn.getName(jid)
        let rank = startIndex + i + 1
        let medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
        let suspicious = isSuspicious(value, category) ? ' ⚠️' : ''
        return `${medal} @${jid.split`@`[0]}${suspicious}\n   ${cat.icon} ${formatNumber(value)} ${cat.name}`
    }).join('\n\n')

    let text = `
╭━━━〔 *${cat.icon} ${cat.name} LEADERBOARD* 〕━━━┈⊷
┃
┃ 🏆 *Halaman ${page} / ${totalPages}*
┃
${leaderboardText}
┃
┃ ──────────────────
┃
┃ 👤 *YOUR RANK*
┃ ${cat.icon} ${formatNumber(userValue)} ${cat.name}
┃ 🏅 Rank: #${userRank} / ${totalUsers}
┃
┃ ──────────────────
┃
┃ 💡 Ketik: *${usedPrefix + command} ${category} ${page + 1}* untuk halaman selanjutnya
┃ Ketik: *${usedPrefix + command} help* untuk panduan lengkap
┃
┃ ⚠️ = Nilai mencurigakan (possible cheat)
┃
╰────────────────┈⊷
    `.trim()

    conn.reply(m.chat, `[Leaderboard] — ${cat.name}\n\n${text}`, m, {
        mentions: sorted.slice(startIndex, endIndex).map(u => u.jid)
    })
}

handler.help = ['leaderboard <category> [page]', 'lb <category> [page]']
handler.tags = ['rpg', 'info']
handler.command = /^(leaderboard|lb)$/i
handler.group = true
handler.register = true

module.exports = handler

function sort(property, ascending = true) {
    if (property) return (...args) => args[ascending & 1][property] - args[!ascending & 1][property]
    else return (...args) => args[ascending & 1] - args[!ascending & 1]
}

function toNumber(property, _default = 0) {
    if (property) return (a, i, b) => {
        return { ...b[i], [property]: a[property] === undefined ? _default : a[property] }
    }
    else return a => a === undefined ? _default : a
}

function enumGetKey(a) {
    return a.jid
}

function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, '') + 'T'
    if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, '') + 'm'
    if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'j'
    if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, '') + 'rb'
    return num.toLocaleString('id-ID')
}

// Check for suspicious values (anti-cheat)
function isSuspicious(value, category) {
    const limits = {
        money: 500000000,      // 500M - reasonable max
        exp: 100000000,        // 100M
        level: 500,            // Level 500
        limit: 10000,          // 10K limit
        diamond: 50000,        // 50K diamond
        bank: 1000000000,      // 1B bank
        nabung: 500000000,     // 500M nabung
        strength: 10000,       // 10K strength
        attack: 10000,         // 10K attack
        defense: 10000         // 10K defense
    }
    return limits[category] && value > limits[category]
}