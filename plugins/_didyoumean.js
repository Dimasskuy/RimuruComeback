// Thanks To Kasan

let didyoumean = require('didyoumean')
let similarity = require('similarity')

let handler = m => m

handler.before = function (m, { match, usedPrefix, text, args, command }) {
	if ((usedPrefix = (match[0] || '')[0])) {
		let noPrefix = m.text.replace(usedPrefix, '').trim().split` `[0].toLowerCase()
		let alias = Object.values(global.plugins).filter(v => v.help && !v.disabled).map(v => v.help).flat(1)
		
		// Jika command valid/persis sama, jangan tampilkan saran
		if (alias.includes(noPrefix)) return
		
		// Cek apakah command yang diketik match dengan regex command manapun
		const isCommandValid = Object.values(global.plugins).some(v => {
			if (!v.command || v.disabled) return false
			if (typeof v.command === 'string') return v.command === noPrefix
			if (Array.isArray(v.command)) return v.command.some(cmd => cmd === noPrefix || (cmd instanceof RegExp && cmd.test(noPrefix)))
			if (v.command instanceof RegExp) return v.command.test(noPrefix)
			return false
		})
		
		if (isCommandValid) return
		
		let mean = didyoumean(noPrefix, alias)
		if (!mean) return
		
		let sim = similarity(noPrefix, mean)
		let som = sim * 100
		
		// Hanya tampilkan saran jika similarity >= 50%
		if (som < 50) return
		
		let tio = `• Halo Kak @${m.sender.split`@`[0]}  Apakah Anda sedang mencari ${usedPrefix + mean} ?

 ◦ Nama menu: *${usedPrefix + mean}*
 ◦ Kempiripan: *${parseInt(som)}%*`
		
		if (mean) this.relayMessage(m.chat,  {
    requestPaymentMessage: {
      currencyCodeIso4217: 'IDR',
      requestFrom: '0@s.whatsapp.net',
      noteMessage: {
      extendedTextMessage: {
      text: tio,
      contextInfo: {
      mentionedJid: [m.sender],
      externalAdReply: {
      showAdAttribution: false
      }}}}}}, {})
	}
  }


handler.register = true
module.exports = handler
