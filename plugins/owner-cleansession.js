let handler = async (m, { conn }) => {
  // Membersihkan session cache untuk mengatasi masalah Bad MAC
  try {
    // Hapus cache session untuk pengirim pesan
    if (conn.authState.keys) {
      // Bersihkan session keys yang bermasalah
      const sender = m.sender.split('@')[0]
      const sessionKeys = Object.keys(conn.authState.keys)
      
      for (let key of sessionKeys) {
        if (key.includes(sender)) {
          delete conn.authState.keys[key]
        }
      }
    }
    
    // Kirim pesan konfirmasi bahwa cache telah dibersihkan
    m.reply('Session cache telah dibersihkan untuk mengatasi masalah koneksi.')
  } catch (e) {
    console.error('Error membersihkan session:', e)
    m.reply('Gagal membersihkan session cache.')
  }
}

handler.command = handler.help = ['cleansession'];
handler.tags = ['owner'];
handler.owner = true;

module.exports = handler;