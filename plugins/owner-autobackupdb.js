let moment = require('moment-timezone');
const scheduler = require('../lib/scheduler');
const timeZone = 'Asia/Jakarta';
const SCHEDULER_KEY = 'plugin:owner-autobackupdb:interval';

let handler = async (m, { conn, command, args, isOwner }) => {
    if (!isOwner) throw 'Perintah ini hanya untuk owner bot!';

    if (command === 'autobackup') {
        if (!args[0]) throw 'Silakan masukkan parameter on/off';

        let setting = args[0].toLowerCase();
        global.db.data.settings = global.db.data.settings || {};

        if (setting === 'on') {
            global.db.data.settings.autoBackup = true;

            try {
                let db = Buffer.from(JSON.stringify(global.db.data, null, 2));
                await conn.sendMessage(global.numberowner + '@s.whatsapp.net', {
                    document: db,
                    mimetype: 'application/json',
                    fileName: 'database.json'
                });

                m.reply('Auto backup telah diaktifkan! Backup akan dilakukan setiap 6 jam sekali.');
            } catch (error) {
                console.error('Error during backup:', error);
                m.reply('Terjadi kesalahan saat melakukan backup!');
            }

        } else if (setting === 'off') {
            global.db.data.settings.autoBackup = false;
            m.reply('Auto backup telah dinonaktifkan!');

        } else {
            throw 'Parameter tidak valid! Gunakan on/off';
        }
    }
};

const performAutoBackup = async (conn) => {
    if (!global.db.data.settings?.autoBackup) return;

    try {
        let db = Buffer.from(JSON.stringify(global.db.data, null, 2));

        await conn.sendMessage(global.numberowner + '@s.whatsapp.net', {
            document: db,
            mimetype: 'application/json',
            fileName: `database-${moment().tz(timeZone).format('YYYYMMDD-HHmmss')}.json`
        });

        console.log('Auto backup performed successfully:', moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss'));
    } catch (error) {
        console.error('Error during auto backup:', error);
    }
};

scheduler.setManagedInterval(SCHEDULER_KEY, () => {
    if (global.conn) performAutoBackup(global.conn);
}, 6 * 60 * 60 * 1000);

handler.help = ['autobackup on/off'];
handler.tags = ['owner'];
handler.command = /^autobackup$/i;
handler.owner = true;
handler.register = true
module.exports = handler;
