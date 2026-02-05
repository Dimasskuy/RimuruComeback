let handler = async (m, { conn }) => {
  // Ambil nomor pengirim (resolve LID if any)
  let senderJid = conn.getJid(m.sender);
  let sender = senderJid.split('@')[0];

  // Ambil nomor owner dari config
  let configOwner = global.owner.map(v => v.replace(/[^0-9]/g, ''));

  // Cek apakah nomor pengirim ada di config owner
  if (configOwner.includes(sender) || configOwner.includes(m.sender.split('@')[0])) {
    // Jika iya, tambahkan ke database sebagai owner
    let user = global.db.data.users[m.sender];
    if (user) {
      user.owner = true;
    } else {
      // Buat entri pengguna jika belum ada
      global.db.data.users[m.sender] = {
        registered: false,
        name: m.pushName || '',
        age: -1,
        dob: '',
        premium: false,
        premiumTime: 0,
        limit: 100,
        glimit: 10,
        money: 0,
        exp: 0,
        bank: 0,
        lastclaim: 0,
        lastweekly: 0,
        lastmonthly: 0,
        registered: false,
        owner: true, // Set sebagai owner
        joinDate: new Date() * 1
      };
    }

    m.reply('Status owner Anda telah diperbarui di database!\nSekarang Anda bisa menggunakan perintah owner.');
  } else {
    m.reply('Nomor Anda tidak terdaftar sebagai owner di config.js.\nSilakan periksa kembali nomor di config.js');
  }
};

handler.help = ['fixowner'];
handler.tags = ['owner'];
handler.command = /^fixowner$/i;

// Biar bisa diakses siapa saja untuk memperbaiki masalah owner
// Tapi tetap aman karena hanya bekerja untuk nomor yang terdaftar di config
// handler.owner = true; // Dikomen agar bisa diakses siapa saja

module.exports = handler;