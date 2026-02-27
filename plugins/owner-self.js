let handler = async (m, { conn, isROwner }) => {
  if (!isROwner) throw 'Only Owner'

  // Ubah mode self ke true agar bot hanya merespon owner
  global.opts.self = true
  m.reply('Mode Self diaktifkan! Bot sekarang hanya merespon owner.')
};

handler.help = ['self'];
handler.tags = ['owner'];
handler.command = /^self$/i;

// Hanya bisa diakses oleh owner
handler.rowner = true;


handler.register = true
module.exports = handler;