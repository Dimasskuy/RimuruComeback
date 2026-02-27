/**
 * LRU Cache Implementation for User and Chat Data
 * Optimizes database read operations by caching frequently accessed data
 *
 * Features:
 * - TTL-based expiration (auto-cleanup)
 * - LRU eviction when max size reached
 * - Automatic sync with database on write
 */

const { LRUCache } = require('lru-cache');
const logger = require('./logger');

// Configuration
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CHAT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_USER_CACHE_SIZE = 2000; // Max users in cache
const MAX_CHAT_CACHE_SIZE = 500; // Max chats in cache

// Create LRU caches
const userCache = new LRUCache({
    max: MAX_USER_CACHE_SIZE,
    ttl: USER_CACHE_TTL,
    ttlAutopurge: true,
    updateAgeOnGet: true,
    dispose: (value, key) => {
        // Optional: cleanup before eviction
        if (global.db?.data?.users?.[key]) {
            // Sync back to database before eviction
            global.db.data.users[key] = { ...global.db.data.users[key], ...value };
        }
    }
});

const chatCache = new LRUCache({
    max: MAX_CHAT_CACHE_SIZE,
    ttl: CHAT_CACHE_TTL,
    ttlAutopurge: true,
    updateAgeOnGet: true,
    dispose: (value, key) => {
        // Optional: cleanup before eviction
        if (global.db?.data?.chats?.[key]) {
            global.db.data.chats[key] = { ...global.db.data.chats[key], ...value };
        }
    }
});

// Stats tracking
const stats = {
    userHits: 0,
    userMisses: 0,
    chatHits: 0,
    chatMisses: 0,
    writes: 0
};

// Track interval ID untuk cleanup
let statsIntervalId = null;
let syncIntervalId = null;

/**
 * Initialize cache background tasks
 * Should be called once on app startup
 */
function initializeBackgroundTasks() {
    // Clear existing intervals if any
    if (statsIntervalId) clearInterval(statsIntervalId);
    if (syncIntervalId) clearInterval(syncIntervalId);

    // Auto-sync to database every 30 seconds (safety net)
    syncIntervalId = setInterval(() => {
        if (global.db?.data) {
            const synced = module.exports.syncToDatabase();
            if (synced > 0) {
                logger.debug(`[Cache] Auto-synced ${synced} entries to database`);
            }
        }
    }, 30000);

    // Log stats every 5 minutes (only if perf mode enabled)
    if (global.opts?.['perf']) {
        statsIntervalId = setInterval(() => {
            logger.info('📊 Cache Stats:', module.exports.getStats());
        }, 5 * 60 * 1000);
    }
}

// Initialize background tasks
initializeBackgroundTasks();

module.exports = {
    /**
     * Get user data from cache or database
     * @param {string} jid - User JID
     * @param {boolean} forceDb - Force read from database (skip cache)
     * @returns {Promise<Object>} User data
     */
    async getUser(jid, forceDb = false) {
        if (!jid) return null;

        if (!forceDb) {
            const cached = userCache.get(jid);
            if (cached) {
                stats.userHits++;
                return cached;
            }
            stats.userMisses++;
        }

        // Fallback to database
        if (global.db?.data?.users?.[jid]) {
            const userData = global.db.data.users[jid];
            // Cache for next time
            userCache.set(jid, { ...userData });
            return userData;
        }

        return null;
    },

    /**
     * Set user data in cache and mark for database sync
     * @param {string} jid - User JID
     * @param {Object} data - User data
     * @param {boolean} immediateDb - Write to database immediately
     */
    async setUser(jid, data, immediateDb = false) {
        if (!jid || !data) return;
        
        userCache.set(jid, { ...data });
        stats.writes++;
        
        if (immediateDb && global.db?.data?.users) {
            global.db.data.users[jid] = { ...data };
        }
    },

    /**
     * Update specific user fields (merge with existing)
     * @param {string} jid - User JID
     * @param {Object} updates - Fields to update
     */
    async updateUser(jid, updates) {
        if (!jid || !updates) return;
        
        const current = await this.getUser(jid);
        if (current) {
            const updated = { ...current, ...updates };
            userCache.set(jid, updated);
            stats.writes++;
        }
    },

    /**
     * Get chat data from cache or database
     * @param {string} jid - Chat JID
     * @param {boolean} forceDb - Force read from database
     * @returns {Promise<Object>} Chat data
     */
    async getChat(jid, forceDb = false) {
        if (!jid) return null;
        
        if (!forceDb) {
            const cached = chatCache.get(jid);
            if (cached) {
                stats.chatHits++;
                return cached;
            }
            stats.chatMisses++;
        }
        
        // Fallback to database
        if (global.db?.data?.chats?.[jid]) {
            const chatData = global.db.data.chats[jid];
            chatCache.set(jid, { ...chatData });
            return chatData;
        }
        
        return null;
    },

    /**
     * Set chat data in cache
     * @param {string} jid - Chat JID
     * @param {Object} data - Chat data
     * @param {boolean} immediateDb - Write to database immediately
     */
    async setChat(jid, data, immediateDb = false) {
        if (!jid || !data) return;
        
        chatCache.set(jid, { ...data });
        stats.writes++;
        
        if (immediateDb && global.db?.data?.chats) {
            global.db.data.chats[jid] = { ...data };
        }
    },

    /**
     * Update specific chat fields
     * @param {string} jid - Chat JID
     * @param {Object} updates - Fields to update
     */
    async updateChat(jid, updates) {
        if (!jid || !updates) return;
        
        const current = await this.getChat(jid);
        if (current) {
            const updated = { ...current, ...updates };
            chatCache.set(jid, updated);
        }
    },

    /**
     * Get member GC data (group member activity)
     * @param {string} chatJid - Group JID
     * @param {string} userJid - User JID
     * @returns {Promise<Object>} Member data
     */
    async getMemberGC(chatJid, userJid) {
        if (!chatJid || !userJid) return null;
        
        const chat = await this.getChat(chatJid);
        if (chat?.memgc?.[userJid]) {
            return chat.memgc[userJid];
        }
        
        return null;
    },

    /**
     * Initialize member GC data if not exists
     * @param {string} chatJid - Group JID
     * @param {string} userJid - User JID
     * @returns {Promise<Object>} Member data
     */
    async initMemberGC(chatJid, userJid) {
        const memberData = await this.getMemberGC(chatJid, userJid);
        if (memberData) return memberData;
        
        const defaultMember = {
            blacklist: false,
            banned: false,
            bannedTime: 0,
            chat: 0,
            chatTotal: 0,
            command: 0,
            commandTotal: 0,
            lastseen: 0,
            lastCmd: 0
        };
        
        const chat = await this.getChat(chatJid);
        if (chat) {
            if (!chat.memgc) chat.memgc = {};
            chat.memgc[userJid] = defaultMember;
            this.setChat(chatJid, chat);
            return defaultMember;
        }
        
        return defaultMember;
    },

    /**
     * Update member GC stats
     * @param {string} chatJid - Group JID
     * @param {string} userJid - User JID
     * @param {Object} updates - Stats to update
     */
    async updateMemberGC(chatJid, userJid, updates) {
        const chat = await this.getChat(chatJid);
        if (chat?.memgc?.[userJid]) {
            chat.memgc[userJid] = { ...chat.memgc[userJid], ...updates };
            this.setChat(chatJid, chat);
        }
    },

    /**
     * Delete user from cache
     * @param {string} jid - User JID
     */
    deleteUser(jid) {
        if (jid) userCache.delete(jid);
    },

    /**
     * Delete chat from cache
     * @param {string} jid - Chat JID
     */
    deleteChat(jid) {
        if (jid) chatCache.delete(jid);
    },

    /**
     * Clear all caches
     */
    clear() {
        userCache.clear();
        chatCache.clear();
        stats.userHits = 0;
        stats.userMisses = 0;
        stats.chatHits = 0;
        stats.chatMisses = 0;
        stats.writes = 0;
    },

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        const userTotal = stats.userHits + stats.userMisses;
        const chatTotal = stats.chatHits + stats.chatMisses;
        
        return {
            user: {
                size: userCache.size,
                max: MAX_USER_CACHE_SIZE,
                hits: stats.userHits,
                misses: stats.userMisses,
                hitRate: userTotal > 0 ? ((stats.userHits / userTotal) * 100).toFixed(2) + '%' : '0%',
                writes: stats.writes
            },
            chat: {
                size: chatCache.size,
                max: MAX_CHAT_CACHE_SIZE,
                hits: stats.chatHits,
                misses: stats.chatMisses,
                hitRate: chatTotal > 0 ? ((stats.chatHits / chatTotal) * 100).toFixed(2) + '%' : '0%'
            },
            ttl: {
                user: USER_CACHE_TTL / 1000 + 's',
                chat: CHAT_CACHE_TTL / 1000 + 's'
            }
        };
    },

    /**
     * Preload users/chats into cache (warmup)
     * @param {Array<string>} userJids - User JIDs to preload
     * @param {Array<string>} chatJids - Chat JIDs to preload
     */
    async preload(userJids = [], chatJids = []) {
        const preloadPromises = [];
        
        for (const jid of userJids.slice(0, MAX_USER_CACHE_SIZE)) {
            if (!userCache.has(jid) && global.db?.data?.users?.[jid]) {
                preloadPromises.push(this.getUser(jid));
            }
        }
        
        for (const jid of chatJids.slice(0, MAX_CHAT_CACHE_SIZE)) {
            if (!chatCache.has(jid) && global.db?.data?.chats?.[jid]) {
                preloadPromises.push(this.getChat(jid));
            }
        }
        
        await Promise.all(preloadPromises);
    },

    /**
     * Sync cache to database (force write all cached data)
     */
    syncToDatabase() {
        let synced = 0;

        // Sync users
        for (const [jid, data] of userCache.entries()) {
            if (global.db?.data?.users) {
                global.db.data.users[jid] = { ...global.db.data.users[jid], ...data };
                synced++;
            }
        }

        // Sync chats
        for (const [jid, data] of chatCache.entries()) {
            if (global.db?.data?.chats) {
                global.db.data.chats[jid] = { ...global.db.data.chats[jid], ...data };
                synced++;
            }
        }

        return synced;
    },

    /**
     * Cleanup function untuk shutdown
     */
    cleanup() {
        if (statsIntervalId) clearInterval(statsIntervalId);
        if (syncIntervalId) clearInterval(syncIntervalId);
        statsIntervalId = null;
        syncIntervalId = null;
        logger.info('[Cache] Background tasks cleaned up');
    }
};
