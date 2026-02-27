/**
 * Total Chat Counter dengan In-Memory Buffer
 * Mengurangi database writes dari 100s/min menjadi 1/min
 */

// In-memory buffer untuk totalchat
const totalChatBuffer = new Map();

// Flush buffer ke database setiap 1 menit
function startFlushInterval() {
    if (global.flushTotalChatInterval) clearInterval(global.flushTotalChatInterval);
    
    global.flushTotalChatInterval = setInterval(() => {
        if (totalChatBuffer.size > 0 && global.db?.data?.totalchat) {
            let flushed = 0;
            
            for (const [chatKey, userData] of totalChatBuffer.entries()) {
                if (!global.db.data.totalchat[chatKey]) {
                    global.db.data.totalchat[chatKey] = {};
                }
                
                for (const [userJid, count] of userData.entries()) {
                    if (!global.db.data.totalchat[chatKey][userJid]) {
                        global.db.data.totalchat[chatKey][userJid] = 0;
                    }
                    global.db.data.totalchat[chatKey][userJid] += count;
                    flushed += count;
                }
            }
            
            totalChatBuffer.clear();
            
            if (flushed > 0) {
                // Log hanya jika ada data yang di-flush
                if (global.opts?.['debug']) {
                    console.log(`[TotalChat] Flushed ${flushed} chat counts to database`);
                }
            }
        }
    }, 60 * 1000); // 1 menit
}

// Start flush interval
startFlushInterval();

module.exports = {
    before: async (m, { conn }) => {
        try {
            if (!m.chat || !m.sender) return;
            
            // Initialize buffer jika belum ada
            if (!totalChatBuffer.has(m.chat)) {
                totalChatBuffer.set(m.chat, new Map());
            }
            
            const chatBuffer = totalChatBuffer.get(m.chat);
            
            // Increment counter di buffer
            const currentCount = chatBuffer.get(m.sender) || 0;
            chatBuffer.set(m.sender, currentCount + 1);
            
        } catch (e) {
            console.error('[TotalChat] Error:', e);
        }
    },
    
    /**
     * Flush manual (untuk shutdown)
     */
    async flush() {
        if (global.flushTotalChatInterval) clearInterval(global.flushTotalChatInterval);
        
        if (totalChatBuffer.size > 0 && global.db?.data?.totalchat) {
            for (const [chatKey, userData] of totalChatBuffer.entries()) {
                if (!global.db.data.totalchat[chatKey]) {
                    global.db.data.totalchat[chatKey] = {};
                }
                
                for (const [userJid, count] of userData.entries()) {
                    if (!global.db.data.totalchat[chatKey][userJid]) {
                        global.db.data.totalchat[chatKey][userJid] = 0;
                    }
                    global.db.data.totalchat[chatKey][userJid] += count;
                }
            }
            
            totalChatBuffer.clear();
        }
    },
    
    /**
     * Get stats
     */
    getStats() {
        let totalBuffered = 0;
        for (const userData of totalChatBuffer.values()) {
            for (const count of userData.values()) {
                totalBuffered += count;
            }
        }
        
        return {
            bufferedChats: totalChatBuffer.size,
            bufferedCount: totalBuffered
        };
    }
};
