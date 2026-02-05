let handler = async (m, { conn, command }) => {
    let txt = `SEWA & PREMIUM

PREMIUM USER
• 10.000 Limit
• Full Akses Chat
• Harga: Rp.10.000 / bulan

SEWA BOT
• Dapat Premium
• Bebas Invit ke 1 Grup
• Harga: Rp.15.000 / bulan

PEMBAYARAN
• Dana: wa.me/${numberowner}
• QRIS: Scan untuk pembayaran instan
• Bank Transfer: wa.me/${numberowner}

FITUR TAMBAHAN
• Whatsapp Multi Device
• Run via Panel (Always ON)
• Support 24 Jam

Hubungi: wa.me/${numberowner}`;

    try {
        await conn.relayMessage(m.chat, {
            requestPaymentMessage: {
                currencyCodeIso4217: 'IDR',
                amount1000: 25000 * 1000,
                requestFrom: '0@s.whatsapp.net',
                noteMessage: {
                    extendedTextMessage: {
                        text: txt,
                        contextInfo: {
                            mentionedJid: [m.sender],
                            externalAdReply: {
                                showAdAttribution: false
                            }
                        }
                    }
                }
            }
        }, {});
    } catch (error) {
        console.error(error);
    }
};

handler.help = ['sewabot'];
handler.tags = ['main'];
handler.command = /^(sewa|sewabot)$/i;

handler.register = true
module.exports = handler;
