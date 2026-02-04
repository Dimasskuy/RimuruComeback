let handler = async (m, { conn }) => {
  // Membersihkan cache dan restart koneksi untuk mengatasi masalah Bad MAC dan duplikasi pesan
  try {
    // Simpan informasi auth state
    const authState = conn.authState
    
    // Tutup koneksi saat ini
    if (conn.ws && conn.ws.readyState === conn.ws.OPEN) {
      conn.ws.close()
    }
    
    // Tunggu sebentar
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Restart koneksi
    await conn.logout()
    
    m.reply('Koneksi telah direstart untuk mengatasi masalah session.')
  } catch (e) {
    console.error('Error merestart koneksi:', e)
    m.reply('Gagal merestart koneksi.')
  }
}

handler.command = handler.help = ['restartsession'];
handler.tags = ['owner'];
handler.owner = true;

module.exports = handler;