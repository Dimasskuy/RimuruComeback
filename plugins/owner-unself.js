let handler = async (m, { conn, isROwner }) => {
  if (!isROwner) throw 'Only Owner'

  // Ubah mode self ke false agar bot bisa digunakan semua orang
  global.opts.self = false
  m.reply('Mode Self dinonaktifkan! Bot sekarang bisa digunakan oleh semua orang.')
};

handler.help = ['unself'];
handler.tags = ['owner'];
handler.command = /^unself$/i;

// Hanya bisa diakses oleh owner
handler.rowner = true;


handler.register = true
module.exports = handler;