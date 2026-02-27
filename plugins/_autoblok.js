let handler = m => m

const BLOCK_PREFIXES = ['212', '91', '263']

handler.before = async function (m) {
  if (!m?.sender || !global?.db?.data?.users) return

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  const senderNumber = (m.sender || '').split('@')[0]

  // Never auto-block owner/mods
  const ownerNumbers = [
    ...(global.owner || []),
    global.numberowner,
    ...(global.mods || [])
  ].map(v => String(v || '').replace(/[^0-9]/g, '')).filter(Boolean)

  if (ownerNumbers.includes(senderNumber)) return

  if (BLOCK_PREFIXES.some(prefix => senderNumber.startsWith(prefix))) {
    user.banned = true
    user.BannedReason = user.BannedReason || 'Autoblock by country code policy'
  }
}

handler.register = true
module.exports = handler
