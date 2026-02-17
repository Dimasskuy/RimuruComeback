// lib/middleware.js

/**
 * Access Control Middleware
 * Checks user permissions and group status
 */
function checkAccess(m, user, chat, plugin, opts) {
    if (plugin.rowner && !m.isROwner) return { error: 'rowner' };
    if (plugin.owner && !m.isOwner) return { error: 'owner' };
    if (plugin.mods && !m.isMods) return { error: 'mods' };
    if (plugin.premium && !m.isPrems) return { error: 'premium' };
    if (plugin.group && !m.isGroup) return { error: 'group' };
    if (plugin.botAdmin && !m.isBotAdmin) return { error: 'botAdmin' };
    if (plugin.admin && !m.isAdmin) return { error: 'admin' };
    if (plugin.private && m.isGroup) return { error: 'private' };
    if (plugin.register && !user.registered) return { error: 'unreg' };

    if (!['group-modebot.js', 'owner-unbanchat.js', 'owner-exec.js', 'owner-exec2.js', 'tool-delete.js'].includes(m.plugin) && (chat?.isBanned || chat?.mute)) return { block: true };
    if (m.plugin != 'unbanuser.js' && user && user.banned) return { block: true };

    return { success: true };
}

/**
 * Limit Handler
 * Manages user limits and levels
 */
function checkLimit(m, user, plugin, usedPrefix) {
    if (!m.isPrems && plugin.limit && user.limit < plugin.limit * 1) {
        return {
            error: true,
            msg: `Limit anda habis, silahkan beli melalui *${usedPrefix}buy* atau beli di *${usedPrefix}shop*`
        };
    }
    if (plugin.level > user.level) {
        return {
            error: true,
            msg: `diperlukan level ${plugin.level} untuk menggunakan perintah ini. Level kamu ${user.level}\n gunakan .levelup untuk menaikan level!`
        };
    }
    return { success: true };
}

module.exports = { checkAccess, checkLimit };
