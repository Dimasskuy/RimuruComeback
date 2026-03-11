const fsEnv = require('fs')
const path = require('path')

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env')
  if (!fsEnv.existsSync(envPath)) return
  const rows = fsEnv.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const row of rows) {
    const line = row.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] == null) process.env[key] = value
  }
}

loadEnvFile()
const chalk = require('chalk')
const toList = (value, fallback = '') => (value || fallback).split(',').map(v => v.trim()).filter(Boolean)

global.owner = toList(process.env.OWNER_NUMBERS, '6282257529886') // wajib di isi tidak boleh kosong
global.mods  = toList(process.env.MOD_NUMBERS, global.owner.join(',')) // wajib di isi tidak boleh kosong
global.prems = toList(process.env.PREM_NUMBERS, global.owner.join(',')) // wajib di isi tidak boleh kosong
global.nameowner = process.env.OWNER_NAME || 'dmss' // wajib di isi tidak boleh kosong
global.numberowner = process.env.OWNER_NUMBER || '6282257529886' // wajib di isi tidak boleh kosong
global.pairingNumber = process.env.PAIRING_NUMBER || '6285196174124' // nomor bot untuk pairing code
global.mail = process.env.OWNER_EMAIL || 'rimurubetaa@gmail.com' // wajib di isi tidak boleh kosong
global.gc = process.env.GROUP_LINK || 'https://chat.whatsapp.com/DXPU5F2cePXEaysvcImdUy' // wajib di isi tidak boleh kosong
global.instagram = process.env.INSTAGRAM_LINK || 'https://instagram.com/prm2.0' // wajib di isi tidak boleh kosong
global.wm = process.env.BOT_WM || 'Rimuru Assistant' // isi nama bot atau nama kalian
global.eror = 'Server Error' // ini pesan saat terjadi kesalahan
global.packname = process.env.STICKER_PACKNAME || 'Made With' // watermark stikcker packname
global.author = process.env.STICKER_AUTHOR || 'Rimuru Assistant' // watermark stikcker author
global.maxwarn = process.env.MAX_WARN || '5' // Peringatan maksimum Warn
global.urlMongo = process.env.MONGODB_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rimurucomeback'

global.autobio = false // Set true/false untuk mengaktifkan atau mematikan autobio (default: false)
global.antiporn = false // Set true/false untuk Auto delete pesan porno (bot harus admin) (default: false)
global.spam = false // Set true/false untuk anti spam (default: false)
global.gcspam = false // Set true/false untuk menutup grup ketika spam (default: false)

// ==========================================
// LOGGING CONFIGURATION
// ==========================================
// Log levels: 'error' | 'warn' | 'info' | 'debug'
// - error: Hanya error kritis
// - warn: Error + warning
// - info: Error + warning + info (default)
// - debug: Semua log (untuk development)
global.logging = {
    level: 'info',      // Log level
    colors: true,       // Enable colors di terminal
    timestamp: true     // Show timestamp
};

// ==========================================
// PERFORMANCE CONFIGURATION
// ==========================================
global.performance = {
    autoRestartMemory: process.env.AUTO_RESTART_MEMORY !== 'false', // Auto restart jika memory > threshold
    memoryThreshold: Number(process.env.MEMORY_THRESHOLD || 90),     // Persentase memory untuk trigger restart
    dbWriteDebounce: Number(process.env.DB_WRITE_DEBOUNCE || 5000),  // Delay write database (ms)
    cacheEnabled: process.env.CACHE_ENABLED !== 'false'              // Enable LRU cache
};

// Security feature flags
global.security = {
    allowOwnerExec: process.env.ALLOW_OWNER_EXEC === 'true'
};


// Gameplay & economy configuration
const limitMethods = toList(process.env.LIMIT_ACQUISITION_METHODS, 'purchase,referral,daily-quest')
global.gameplay = {
    limits_tradable: process.env.LIMITS_TRADABLE === 'true' ? true : false,
    limit_acquisition_methods: limitMethods,
    cooldown_default: Number(process.env.COOLDOWN_DEFAULT || 60 * 60 * 1000),
    economy: {
        BUY_MARKUP: Number(process.env.BUY_MARKUP || 1.25),
        SELL_FACTOR: Number(process.env.SELL_FACTOR || 0.5),
        reward_cap: Number(process.env.REWARD_CAP || 5000)
    }
};

if (!process.env.MONGODB_URL && !process.env.MONGO_URI) {
    console.log(chalk.yellow('[Config] MONGODB_URL tidak ditemukan, memakai default lokal mongodb://127.0.0.1:27017/rimurucomeback'));
}

let fs = require('fs')
let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  delete require.cache[file]
  require(file)
})
