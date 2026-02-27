
async function handler(m, { conn, usedPrefix, command, text }) {
  
  let user = global.db.data.users[m.sender]
  let SWORD = user.sword < 1
  let ARMOR = user.armor < 1
  let HEALT = user.healt < 90
  let prefix = usedPrefix
  
  if (SWORD || ARMOR || HEALT) {
    const danzz = []
    let thumb = 'https://telegra.ph/file/e7e06f759a0549bff9a64.jpg'
    let kemii = `${prefix}shop buy armor\n\nUntuk membeli armor kamu!`
    let anjy = `${prefix}shop buy sword\n\nUntuk membeli pedang kamu!`
    let kemii1 = `${prefix} heal\n\nUntuk menambah darah kamu!`
    if (SWORD) return conn.sendMessage(m.chat, {
      text: anjy,
      contextInfo: {
      externalAdReply: {
      title: 'D u n g e o n',
      thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg',
      mediaType: 1,
      renderLargerThumbnail: true
      }}})
    if (ARMOR) return conn.sendMessage(m.chat, {
      text: kemii,
      contextInfo: {
      externalAdReply: {
      title: 'D u n g e o n',
      thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg',
      mediaType: 1,
      renderLargerThumbnail: true
      }}})
    if (HEALT) return conn.sendMessage(m.chat, {
      text: kemii1,
      contextInfo: {
      externalAdReply: {
      title: 'D u n g e o n',
      thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg',
      mediaType: 1,
      renderLargerThumbnail: true
      }}})

    let lmao = item(user.sword * 1, user.armor * 1, user.healt * 1, usedPrefix)
    if (danzz.length == 0) return conn.sendMessage(m.chat, {
      text: lmao,
      contextInfo: {
      externalAdReply: {
      title: 'D u n g e o n',
      thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg',
      mediaType: 1,
      renderLargerThumbnail: true
      }}})
  }
  
  global.dungeon = global.dungeon ? global.dungeon : {}
  if (Object.values(global.dungeon).find(room => room.id.startsWith('dungeon') && [room.game.player1, room.game.player2, room.game.player3, room.game.player4].includes(m.sender))) return conn.reply(m.chat, 'Kamu masih di dalam Dungeon', m)
  let timing = (new Date - (user.lastdungeon * 1)) * 1
  if (timing < 100) return conn.reply(m.chat, `Silahkan tunggu ${clockString(100 - timing)} untuk bisa ke Dungeon`, m)
  let room = Object.values(global.dungeon).find(room => room.state === 'WAITING' && (text ? room.name === text : true))
  
  if (room) {
    // Biar simple :v
    let p1 = room.game.player1 || ''
    let p2 = room.game.player2 || ''
    let p3 = room.game.player3 || ''
    let p4 = room.game.player4 || ''
    let c1 = room.player1 || ''
    let c2 = room.player2 || ''
    let c3 = room.player3 || ''
    let c4 = room.player4 || ''

    if (!p2) {
      room.player2 = m.chat
      room.game.player2 = m.sender
    } else if (!p3) {
      room.player3 = m.chat
      room.game.player3 = m.sender
    } else if (!p4) {
      room.player4 = m.chat
      room.game.player4 = m.sender
      room.state = 'PLAYING'
    }

     const buttons = [
         {buttonId: 'gass..', buttonText: {displayText: 'gass..'}, type: 1}
     ]

      let lmao = `${!room.game.player4 ? `Menunggu ${!room.game.player3 && !room.game.player4 ? '2' : '1'} Partner lagi... ${room.name ? `mengetik command dibawah ini *${usedPrefix}${command} ${room.name}*` : ''}` : 'Semua partner telah lengkap...'}`
      conn.sendMessage(m.chat, {
        text: lmao,
        contextInfo: {
        externalAdReply: {
        title: 'D u n g e o n',
        thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg',
        mediaType: 1,
        renderLargerThumbnail: true
        }}})

      if (room.game.player1 && room.game.player2 && room.game.player3 && room.game.player4) {
      // Hadiah ben do seneng :v
      room.price.money += (Math.floor(Math.random() * 1000001)) * 1
      room.price.exp += (Math.floor(Math.random() * 500001)) * 1
      room.price.iron += (pickRandom([0, 0, 0, 0, 1, 0, 0, 0])) * 1
      room.game.diamond += (pickRandom([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0])) * 1
      room.game.sampah += (Math.floor(Math.random() * 101)) * 1
      room.price.string += (Math.floor(Math.random() * 2)) * 1
      room.price.kayu += (Math.floor(Math.random() * 2)) * 1
      room.price.batu += (Math.floor(Math.random() * 2)) * 1
      room.game.makananPet += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0])) * 1
      room.game.common += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0])) * 1
      room.game.uncommon += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0])) * 1

      let str = `
Room ID: ${room.id}

${M(p1)}, ${M(p2)}, ${M(p3)} dan ${M(p4)}

Sedang berperang di dungeon...
`.trim()

      await m.reply(str, c1, {
        contextInfo: {
          mentionedJid: conn.parseMention(str)
        }
      })
      if (![c1, c3, c4].includes(c2)) m.reply(str, c2, {
          contextInfo: {
            mentionedJid: conn.parseMention(str)
          }
      })
      if (![c1, c2, c4].includes(c3)) m.reply(str, c3, {
        contextInfo: {
            mentionedJid: conn.parseMention(str)
          }
      })
      if (![c1, c2, c3].includes(c4)) m.reply(str, c4, {
        contextInfo: {
            mentionedJid: conn.parseMention(str)
        }
      })

      setTimeout(async () => {
        let player  = [p1, p2, p3, p4]
        let { healt, sword } = room.less
        let { exp, money, sampah, potion, diamond, iron, kayu, batu, string, common, uncommon, mythic, legendary, pet, makananPet } = room.price
        let str2 = `
Nyawa *${M(p1)}*, *${M(p2)}*, *${M(p3)}* dan *${M(p4)}* masing masing berkurang *-${healt * 1}*, dan durability Sword kalian masing masing berkurang *-${sword * 1}* karena kalian telah membunuh *${pickRandom(['Ender Dragon', 'Baby Dragon', 'Titan', 'Cacing dan Semut', 'PP Mikey', 'Orang', 'Kecoa', 'Semut', 'Siput', '....', 'Wither', 'Sekeleton', 'Ayam Emas', 'Temenmu', 'Sapi', 'Tidak Ada', 'Creeper', 'Zombie', 'Hewan Pelihraanmu','Diri Sendiri'])}* dan mendapatkan total
*Exp:* ${exp * 4}
*Uang:* ${money * 4}
*Sampah:* ${sampah  * 4}${potion == 0 ? '' : '\n*Potion:* ' + potion * 4}${makananPet == 0 ? '' : '\n*Makanan Pet* ' + makananPet * 4}${kayu == 0 ? '' : '\n*Kayu:* ' + kayu * 4}${batu == 0 ? '' : '\n*Batu:* ' + batu * 4}${string == 0 ? '' : '\n*String:* ' + string * 4}${iron == 0 ? '' : '\n*Iron:* ' + iron * 4}${diamond == 0 ? '' : '\n*Diamond:* ' + diamond * 4}${common == 0 ? '' : '\n*Common Crate:* ' + common * 4}${uncommon == 0 ? '' : '\n*Uncommon Crate:* ' + uncommon * 4}
           `.trim()
        
        for (let i = 0; i < player.length; i++) {
          let p = player[i]
          setTimeout(() => {
            try {
                let users = global.db.data.users[p]
                if (users) {
                  users.healt -= healt * 1
                  users.sworddurability -= sword * 1
                  users.money += money * 1
                  users.exp += exp * 1
                  users.sampah += sampah * 1
                  users.potion += potion * 1
                  users.diamond += diamond * 1
                  users.iron += iron * 1
                  users.kayu += kayu * 1
                  users.batu += batu * 1
                  users.string += string * 1
                  users.common += common * 1
                  users.uncommon += uncommon * 1
                  users.mythic += mythic * 1
                  users.legendary += legendary * 1
                  users.pet += pet * 1
                  users.makananpet += makananPet * 1
                  users.lastdungeon = new Date * 1
    
                  if ((users.healt * 1) < 1) users.healt = 0
                  if ((users.sworddurability * 1) < 1) {
                    users.sword -= 1
                    users.sworddurability = (users.sword * 1) * 50
                  }
                }
            } catch (e) {
                console.error(`Error updating dungeon data for ${p}:`, e)
            }
          }, (i * 1) * 1500)
        }

        await m.reply(str2, c1, {
          contextInfo: {
            mentionedJid: conn.parseMention(str2)
          }
        })
        if (![c1, c3, c4].includes(c2)) m.reply(str2, c2, {
          contextInfo: {
            mentionedJid: conn.parseMention(str2)
          }
        })
        if (![c1, c2, c4].includes(c3)) m.reply(str2, c3, {
          contextInfo: {
            mentionedJid: conn.parseMention(str2)
          }
        })
        if (![c1, c2, c3].includes(c4)) m.reply(str2, c4, {
          contextInfo: {
            mentionedJid: conn.parseMention(str2)
          }
        })

        if (global.db.data) await global.db.write()
        delete global.dungeon[room.id]
      }, 40000)
      } 
    } else {
      let pl1 = m.sender
      let pl2 = m.sender
      let pl3 = m.sender
      let pl4 = m.sender
      let id = 'dungeon_' + (new Date * 1)
      global.dungeon[id] = {
        id,
        player1: m.chat,
        player2: '',
        player3: '',
        player4: '',
        game: {
          player1: pl1,
          player2: '',
          player3: '',
          player4: '',
          diamond: 0,
          sampah: 0,
          makananPet: 0,
          common: 0,
          uncommon: 0
        },
        price: {
          money: 0,
          exp: 0,
          iron: 0,
          kayu: 0,
          batu: 0,
          string: 0
        },
        less: {
          healt: 0,
          sword: 0
        },
        state: 'WAITING',
        name: text ? text : 'id' + Math.floor(Math.random() * 10000)
      }
      const buttons = [
          {buttonId: 'gass..', buttonText: {displayText: 'gass..'}, type: 1}
      ]

      let lmao = `Menunggu 3 Partner lagi... ketik command dibawah ini *${usedPrefix}${command} ${global.dungeon[id].name}*`
     conn.sendMessage(m.chat, {
        text: lmao,
        contextInfo: {
        externalAdReply: {
        title: 'D u n g e o n',
        thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg',
        mediaType: 1,
        renderLargerThumbnail: true
        }}})
    }
}

handler.help = ['dungeon']
handler.tags = ['rpg']
handler.command = /^dungeon$/i
handler.limit = true
handler.group = true
handler.fail = null

handler.register = true
module.exports = handler

function M(x) { return '@' + x.split('@')[0] }
function pickRandom(list) { return list[Math.floor(Math.random() * list.length)] }
function clockString(ms) {
  if (ms <= 0) return '00:00:00'
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}
function item(sword, armor, healt, usedPrefix) {
  return `
${sword < 1 ? `⚔️ Sword belum di miliki, ketik *${usedPrefix}craft sword* untuk memilikinya!` : ''} 
${armor < 1 ? `🛡️ Armor belum di miliki, ketik *${usedPrefix}craft armor* untuk memilikinya!` : ''} 
${healt < 90 ? `🩸 Healt minimal 90 untuk bisa ke dungeon, ketik *${usedPrefix}heal* untuk menambah healt!` : ''}
`.trim()
}
