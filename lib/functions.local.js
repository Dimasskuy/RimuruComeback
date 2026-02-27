const cfonts = require('cfonts')
const spin = require('spinnies')
const Crypto = require('crypto')

const h2k = (number) => {
  const SI_POSTFIXES = ['', ' K', ' M', ' G', ' T', ' P', ' E']
  const tier = Math.log10(Math.abs(number)) / 3 | 0
  if (tier === 0) return number
  const postfix = SI_POSTFIXES[tier]
  const scale = Math.pow(10, tier * 3)
  const scaled = number / scale
  let formatted = scaled.toFixed(1) + ''
  if (/\.0$/.test(formatted)) formatted = formatted.substring(0, formatted.length - 2)
  return formatted + postfix
}

const randomBytes = (length) => Crypto.randomBytes(length)

const generateMessageID = () => randomBytes(10).toString('hex').toUpperCase()

const getGroupAdmins = (participants) => {
  const admins = []
  for (const participant of participants) {
    if (participant.isAdmin) admins.push(participant.jid)
  }
  return admins
}

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

const spinner = {
  interval: 120,
  frames: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛']
}

let globalSpinner

const getGlobalSpinner = (disableSpins = false) => {
  if (!globalSpinner) {
    globalSpinner = new spin({ color: 'blue', succeedColor: 'green', spinner, disableSpins })
  }
  return globalSpinner
}

const spins = getGlobalSpinner(false)

const start = (id, text) => spins.add(id, { text })
const info = (id, text) => spins.update(id, { text })
const success = (id, text) => spins.succeed(id, { text })
const close = (id, text) => spins.fail(id, { text })

const banner = cfonts.render('LOADING...', {
  font: 'chrome',
  color: 'candy',
  align: 'center',
  gradient: ['red', 'yellow'],
  lineHeight: 3
})

module.exports = {
  h2k,
  generateMessageID,
  getGroupAdmins,
  getRandom,
  pickRandom,
  start,
  info,
  success,
  close,
  banner
}
