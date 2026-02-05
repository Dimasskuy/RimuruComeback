let lastReset = 0
module.exports = {
  before: async function all(m) {
    const jakarta = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const current = new Date(jakarta);
    
    if (current.getHours() === 0 && current.getMinutes() === 0 && Date.now() - lastReset > 600000) {
      lastReset = Date.now()
      let list = Object.entries(global.db.data.users);
      list.forEach(([user, data]) => {
        data.limit = 25; //sesuaikan dengan limit yang dibutuhkan
      });
      
      console.log('Limit user berhasil direset pada', current);
    }
  }
}
