let moment = require('moment-timezone');
const scheduler = require('../lib/scheduler');

const timeZone = 'Asia/Jakarta';
const SCHEDULER_KEY = 'plugin:group-closegc:checker';

let handler = async (m, { command, args, isOwner, isAdmin, usedPrefix }) => {
    let chat = global.db.data.chats[m.chat];
    if (!m.isGroup) throw 'Perintah ini hanya bisa digunakan di grup!';
    if (!(isAdmin || isOwner)) throw 'Perintah ini hanya bisa digunakan oleh admin grup!';

    if (command === 'aktif' && args[0] === 'closegc') {
        if (args.length < 2) throw `Format salah! Gunakan *${usedPrefix + command} closegc jam_tutup|jam_buka*\nContoh: ${usedPrefix + command} closegc 21|5`;
        let [closeTime, openTime] = String(args[1]).split('|').map(Number);
        if (isNaN(closeTime) || isNaN(openTime)) throw 'Jam tutup dan buka harus berupa angka!';
        if (closeTime < 0 || closeTime > 23 || openTime < 0 || openTime > 23) throw 'Jam harus di rentang 0-23';

        chat.autoGc = {
            closeTime,
            openTime,
            groupStatus: chat.autoGc?.groupStatus || 'opened',
            lastTransitionHour: chat.autoGc?.lastTransitionHour ?? null
        };
        m.reply(`Auto group close/open diaktifkan. Grup akan tutup pukul ${closeTime}:00 dan buka pukul ${openTime}:00.`);
    } else if (command === 'mati' && args[0] === 'closegc') {
        delete chat.autoGc;
        m.reply('Auto group close/open dinonaktifkan.');
    }
};

handler.command = /^(aktif|mati)$/i;
handler.help = ['aktif closegc jam_tutup|jam_buka', 'mati closegc'];
handler.tags = ['group'];
handler.admin = true;
handler.group = true;
handler.register = true;
module.exports = handler;

async function checkGroupsStatus(conn) {
    const now = moment().tz(timeZone);
    const currentHour = now.hour();
    if (!global.db.data?.chats) return;

    for (const chatId of Object.keys(global.db.data.chats)) {
        const chat = global.db.data.chats[chatId];
        if (!chat.autoGc) continue;

        const { closeTime, openTime } = chat.autoGc;
        const state = chat.autoGc.groupStatus || chat.groupStatus || 'opened';
        const lastTransitionHour = chat.autoGc.lastTransitionHour;

        // Idempotency guard: avoid repeated execution in same hour
        if (lastTransitionHour === currentHour) continue;

        if (currentHour === closeTime && state !== 'closed') {
            try {
                await conn.groupSettingUpdate(chatId, 'announcement');
                await conn.sendMessage(chatId, { text: `( OTOMATIS ) GROUP CLOSE, akan dibuka jam ${openTime}:00 WIB` });
                chat.autoGc.groupStatus = 'closed';
                chat.autoGc.lastTransitionHour = currentHour;
            } catch (error) {
                console.error(`Error closing group ${chatId}:`, error);
            }
        }

        if (currentHour === openTime && state !== 'opened') {
            try {
                await conn.groupSettingUpdate(chatId, 'not_announcement');
                await conn.sendMessage(chatId, { text: `( OTOMATIS ) GROUP OPEN, akan ditutup jam ${closeTime}:00 WIB` });
                chat.autoGc.groupStatus = 'opened';
                chat.autoGc.lastTransitionHour = currentHour;
            } catch (error) {
                console.error(`Error opening group ${chatId}:`, error);
            }
        }
    }
}

scheduler.setManagedInterval(SCHEDULER_KEY, () => {
    if (global.conn) checkGroupsStatus(global.conn);
}, 60000);
