global.owner = ['6282257529886'] // wajib di isi tidak boleh kosong
global.mods  = ['6282257529886'] // wajib di isi tidak boleh kosong
global.prems = ['6282257529886'] // wajib di isi tidak boleh kosong
global.nameowner = 'dmss' // wajib di isi tidak boleh kosong
global.numberowner = '6282257529886' // wajib di isi tidak boleh kosong
global.mail = 'rimurubetaa@gmail.com' // wajib di isi tidak boleh kosong
global.gc = 'https://chat.whatsapp.com/DXPU5F2cePXEaysvcImdUy' // wajib di isi tidak boleh kosong
global.instagram = 'https://instagram.com/prm2.0' // wajib di isi tidak boleh kosong
global.wm = 'Rimuru Assistant' // isi nama bot atau nama kalian
global.wait = 'sedang di proses' // ini pesan simulasi loading
global.eror = 'Server Error' // ini pesan saat terjadi kesalahan
global.stiker_wait = 'Stiker sedang dibuat' // ini pesan simulasi saat loading pembuatan sticker
global.packname = 'Made With' // watermark stikcker packname
global.author = 'Rimuru Assistant' // watermark stikcker author
global.maxwarn = '5' // Peringatan maksimum Warn

global.autobio = false // Set true/false untuk mengaktifkan atau mematikan autobio (default: false)
global.antiporn = false // Set true/false untuk Auto delete pesan porno (bot harus admin) (default: false)
global.spam = false // Set true/false untuk anti spam (default: false)
global.gcspam = false // Set true/false untuk menutup grup ketika spam (default: false)
    

let fs = require('fs')
let chalk = require('chalk')
let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  delete require.cache[file]
  require(file)
})
