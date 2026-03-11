let PhoneNumber = require('awesome-phonenumber')
let levelling = require('../lib/levelling')
const { createHash } = require('crypto')

let handler = async (m, { conn, text }) => {
  let who
  if (m.quoted) who = m.quoted.sender
  else if (m.mentionedJid?.[0]) who = m.mentionedJid[0]
  else if (text) {
    const input = text.replace(/[^0-9]/g, '')
    if (input.length > 5 && input.length < 20) who = input + '@s.whatsapp.net'
  }

  if (!who) who = m.sender
  who = resolveCanonicalUserJid(conn, who)
  if (!who.includes('@')) who += '@s.whatsapp.net'

  if (!global.db.data.users[who]) {
    global.db.data.users[who] = {
      exp: 0,
      limit: 10,
      lastclaim: 0,
      registered: false,
      name: '',
      age: -1,
      regTime: -1,
      premium: false,
      premiumDate: 0,
      level: 0,
      money: 0,
      pasangan: '',
      role: 'Newbie',
      banned: false
    }
  }

  const user = global.db.data.users[who]
  const { name, limit, exp, money, lastclaim, premiumTime, premium, registered, age, level, pasangan } = user

  let pp = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXIdvC1Q4WL7_zA6cJm3yileyBT2OsWhBb9Q&usqp=CAU'
  try { pp = await conn.profilePictureUrl(who, 'image') } catch {}

  let about = ''
  try {
    const status = await conn.fetchStatus(who)
    about = status.status || ''
  } catch {}

  const username = await conn.getName(who)
  const rawNumber = who.split('@')[0]
  const hasPhone = who.endsWith('@s.whatsapp.net') && /^\d+$/.test(rawNumber)
  const readableNumber = hasPhone ? PhoneNumber('+' + rawNumber).getNumber('international') : 'Private/Unknown'
  const waLink = hasPhone ? `https://wa.me/${rawNumber}` : '-'

  const role = user.role || 'Newbie'
  const { min, xp, max } = levelling.xpRange(level, global.multiplier)
  const math = max - xp
  const sn = createHash('md5').update(who).digest('hex')

  const str = `
┌─⊷ *PROFILE*
┃👤 • *Name:* ${readableNumber} ${registered ? `(${name || username})` : ''}
┃@${rawNumber}
┃📝 • *About:* ${about || 'Tidak ada bio'}
┃❤️ • *Pasangan:* ${pasangan ? `@${pasangan.split('@')[0]}` : 'Jomblo'}
┃📞 • *Number:* ${readableNumber}
┃🔗 • *Link:* ${waLink}
┃🔢 • *Serial:* ${sn}
┃🎂 • *Umur:* ${registered ? age + ' tahun' : '-'}
└──────────────

┌─⊷ *RPG INFO*
┃📊 • *Level:* ${level}
┃🔰 • *Role:* ${role}
┃✨ • *XP:* ${exp} (${exp - min} / ${xp})
┃   ${math <= 0 ? 'Siap *levelup*' : `${math} XP lagi`}
┃💰 • *Money:* ${money}
┃💎 • *Limit:* ${premium || premiumTime > Date.now() ? 'Tak terbatas (**Premium**)' : limit}
└──────────────

┌─⊷ *STATUS*
┃📌 • *Registered:* ${registered ? 'Yes' : 'No'}
┃⭐ • *Premium:* ${premium ? 'Yes (**Premium**)' : 'No'}
┃⏳ • *Premium Expired:* ${premium ? msToDate(premiumTime - Date.now()) : '-'}
┃🕐 • *Last Claim:* ${lastclaim > 0 ? new Date(lastclaim).toLocaleString('id-ID') : 'Tidak Pernah'}
└──────────────
`.trim()

  const mentionedJid = [who]
  if (pasangan) mentionedJid.push(pasangan)

  await conn.sendFile(m.chat, pp, 'profile.jpg', str, m, false, {
    contextInfo: { mentionedJid }
  })
}

handler.help = ['profile', 'profil [@user]']
handler.tags = ['info']
handler.command = /^profile?|profil$/i
handler.register = true
module.exports = handler

function resolveCanonicalUserJid(conn, jid) {
  const decoded = conn.decodeJid(jid)
  if (!decoded) return jid
  if (!decoded.endsWith('@lid')) return decoded
  const mapped = global.db.data?.isLid?.[decoded] || conn.getJid(decoded)
  return mapped && !String(mapped).endsWith('@lid') ? mapped : decoded
}

function msToDate(ms) {
  if (ms <= 0) return 'Sudah habis'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor(ms / 3600000) % 24
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  return [d ? `${d} hari` : '', h ? `${h} jam` : '', m ? `${m} menit` : '', s ? `${s} detik` : '']
    .filter(v => v).join(' ')
}
