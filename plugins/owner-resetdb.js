let handler = async (m, { conn }) => {
    conn.resetdb = conn.resetdb ? conn.resetdb : {}
    if (m.sender in conn.resetdb) return

    conn.resetdb[m.sender] = {
        status: 'waiting_1',
        timeout: setTimeout(() => {
            if (conn.resetdb[m.sender]) {
                m.reply('Waktu konfirmasi reset database telah habis.')
                delete conn.resetdb[m.sender]
            }
        }, 30000)
    }

    m.reply('⚠️ *PERINGATAN!* ⚠️\n\nAnda akan menghapus SELURUH database (Users, Chats, Stats, Mappings).\nTindakan ini tidak dapat dibatalkan.\n\nKetik *YA* untuk melanjutkan ke tahap konfirmasi berikutnya.')
}

handler.before = async function (m) {
    this.resetdb = this.resetdb ? this.resetdb : {}
    if (!(m.sender in this.resetdb)) return
    if (m.isBaileys) return

    let session = this.resetdb[m.sender]

    if (session.status === 'waiting_1') {
        if (m.text.toUpperCase() === 'YA') {
            clearTimeout(session.timeout)
            session.status = 'waiting_2'
            session.timeout = setTimeout(() => {
                if (this.resetdb[m.sender]) {
                    m.reply('Waktu konfirmasi reset database telah habis.')
                    delete this.resetdb[m.sender]
                }
            }, 30000)
            return m.reply('🚨 *KONFIRMASI TERAKHIR* 🚨\n\nApakah Anda benar-benar yakin? Semua data akan hilang selamanya.\n\nKetik *KONFIRMASI* untuk menghapus sekarang.')
        } else if (m.text) {
            clearTimeout(session.timeout)
            delete this.resetdb[m.sender]
            return m.reply('Reset database dibatalkan.')
        }
    }

    if (session.status === 'waiting_2') {
        if (m.text.toUpperCase() === 'KONFIRMASI') {
            clearTimeout(session.timeout)
            delete this.resetdb[m.sender]

            global.db.data.users = {}
            global.db.data.chats = {}
            global.db.data.stats = {}
            global.db.data.msgs = {}
            global.db.data.sticker = {}
            global.db.data.isLid = {}
            global.db.data.jidToLid = {}

            await global.db.write()
            return m.reply('✅ *Database Berhasil Direset Total!*')
        } else if (m.text) {
            clearTimeout(session.timeout)
            delete this.resetdb[m.sender]
            return m.reply('Reset database dibatalkan karena konfirmasi salah.')
        }
    }
}

handler.help = ['resetdb']
handler.tags = ['owner']
handler.command = /^(resetdb|resetdatabase)$/i
handler.owner = true

module.exports = handler
