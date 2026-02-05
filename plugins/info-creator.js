let name = global.nameowner
let numberowner = global.numberowner
let gmail = global.mail
let instagram = global.instagram

let handler = async (m, { conn }) => {
  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
ORG:Owner Bot
TEL;TYPE=CELL;waid=${numberowner}:${numberowner}
EMAIL:${gmail}
URL:${instagram}
NOTE:Owner Bot WhatsApp
END:VCARD`

  const sentMsg = await conn.sendMessage(
    m.chat,
    {
      contacts: {
        displayName: name,
        contacts: [{ vcard }]
      }
    }
  )

  await conn.reply(m.chat, `Berikut adalah kontak owner bot`, sentMsg)
}

handler.command = handler.help = ['owner', 'creator'];
handler.tags = ['info'];
handler.limit = false;

handler.register = true
module.exports = handler;
