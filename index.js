process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('./config');
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@adiwajshing/baileys');
const { makeWASocket, protoType } = require('./lib/simple');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const mongoDB = require('./lib/mongoDB');
const chalk = require('chalk');
const _ = require('lodash');
const express = require('express');
const qrcode = require('qrcode-terminal');
const readline = require('readline');
const logger = require('./lib/logger');
const os = require('os');

// Execute Prototype Extension
protoType();

// Configure logger dari config.js
if (global.logging) {
    logger.configure({
        level: global.logging.level || 'info',
        colors: global.logging.colors !== false,
        timestamp: global.logging.timestamp !== false
    });
    logger.info(`[Logger] Configured with level: ${global.logging.level || 'info'}`);
}

// Native CLI argument parsing (replaced yargs)
global.opts = {};
const args = process.argv.slice(2);
args.forEach(arg => {
    if (arg.startsWith('--')) {
        const key = arg.slice(2);
        global.opts[key] = true;
    }
});
global.prefix = new RegExp('^[' + (global.opts['prefix'] || '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-') + ']');

// Get session path from args (last non-flag argument)
const sessionPath = args.filter(arg => !arg.startsWith('--')).pop() || 'sessions';

// Ensure necessary directories exist
const dirs = ['tmp', sessionPath];
for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
    }
}

global.db = new mongoDB(global.urlMongo);
global.DATABASE = global.db;

// Fix mongoose deprecation warning
const mongoose = require('mongoose');
mongoose.set('strictQuery', true);

// Track intervals untuk cleanup
global.activeIntervals = [];

/**
 * Register interval untuk cleanup nanti
 * @param {Function} fn - Function to execute
 * @param {number} delay - Delay in ms
 * @returns {NodeJS.Timeout}
 */
function registerInterval(fn, delay) {
    const interval = setInterval(fn, delay);
    global.activeIntervals.push(interval);
    return interval;
}

/**
 * Clear all registered intervals
 */
function clearAllIntervals() {
    global.activeIntervals.forEach(interval => clearInterval(interval));
    global.activeIntervals = [];
    logger.info('[Cleanup] All intervals cleared');
}

global.loadDatabase = async function loadDatabase() {
    if (global.db.READ) {
        // Gunakan polling dengan cleanup yang proper
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!global.db.READ) {
                    clearInterval(checkInterval);
                    resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
                }
            }, 1000);
            global.activeIntervals.push(checkInterval);
        });
    }
    if (global.db.data !== null) return;
    global.db.READ = true;
    await global.db.read();
    global.db.READ = false;

    // Migration Logic
    if (!global.db.data || Object.keys(global.db.data).length === 0) {
        const localDbPath = 'database.json';
        if (fs.existsSync(localDbPath)) {
            try {
                const localData = JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
                global.db.data = {
                    users: {},
                    chats: {},
                    stats: {},
                    msgs: {},
                    sticker: {},
                    isLid: {},
                    jidToLid: {},
                    ...localData
                };
                await global.db.forceWrite(); // Immediate write untuk migration
                logger.info('✅ Data migrated from database.json to MongoDB');
                fs.renameSync(localDbPath, localDbPath + '.bak');
            } catch (e) {
                logger.error(`❌ Failed to migrate data: ${e.message}`);
            }
        }
    }

    global.db.data = {
        users: {},
        chats: {},
        stats: {},
        msgs: {},
        sticker: {},
        isLid: {},
        jidToLid: {},
        guilds: {},
        ...(global.db.data || {})
    };
    if (!global.db.data.users) global.db.data.users = {};
    if (!global.db.data.chats) global.db.data.chats = {};
    if (!global.db.data.stats) global.db.data.stats = {};
    if (!global.db.data.msgs) global.db.data.msgs = {};
    if (!global.db.data.sticker) global.db.data.sticker = {};
    if (!global.db.data.isLid) global.db.data.isLid = {};
    if (!global.db.data.jidToLid) global.db.data.jidToLid = {};
    if (!global.db.data.guilds) global.db.data.guilds = {};

    // Reverse populate jidToLid if empty but isLid has data
    if (Object.keys(global.db.data.isLid).length > 0 && Object.keys(global.db.data.jidToLid).length === 0) {
        for (let [lid, jid] of Object.entries(global.db.data.isLid)) {
            global.db.data.jidToLid[jid] = lid;
        }
    }

    global.db.chain = _.chain(global.db.data);
};
loadDatabase();

global.APIs = { botcahx: 'https://api.botcahx.eu.org' };
global.APIKeys = { 'https://api.botcahx.eu.org': 'YOUR_APIKEY_HERE' };
global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '');

// Health Check Server dengan enhanced endpoint
const apps = express();
const ports = [process.env.PORT || 8000, 8080, 3000, 5000, 4444];
function startExpress(portIndex = 0) {
    if (portIndex >= ports.length) return;
    const port = ports[portIndex];
    const server = apps.listen(port, () => {
        logger.info(`🌐 Health check server listening on port ${port}`);
        apps.get('/', (req, res) => res.json({ status: 'true', message: 'Bot Successfully Activated!' }));
        
        // Enhanced health check endpoint
        apps.get('/health', (req, res) => {
            const memoryUsage = process.memoryUsage();
            const healthData = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: {
                    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                    usagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%'
                },
                database: {
                    connected: !!global.db?._model,
                    hasData: !!global.db?.data,
                    writeStats: global.db?.getWriteStats ? global.db.getWriteStats() : 'N/A'
                },
                connection: {
                    connected: !!global.conn?.user?.id,
                    chatsCount: Object.keys(global.conn?.chats || {}).length
                },
                intervals: {
                    active: global.activeIntervals?.length || 0
                }
            };
            
            // Check if memory usage is too high
            if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
                healthData.status = 'warning';
                healthData.warning = 'High memory usage detected';
            }
            
            res.json(healthData);
        });
    }).on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            startExpress(portIndex + 1);
        }
    });
}
startExpress();

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info(`-- using WA v${version.join('.')}, isLatest: ${isLatest} --`);

    const connectionOptions = {
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: true,
    };

    global.conn = makeWASocket(connectionOptions);

    // Automated Pairing Code from config.js
    if (!conn.authState.creds.registered) {
        let phoneNumber = global.pairingNumber || global.numberowner;
        if (phoneNumber) {
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            logger.info(`-- Generating pairing code for owner number: ${phoneNumber} --`);
            setTimeout(async () => {
                let code = await conn.requestPairingCode(phoneNumber, "RTXZYBOT");
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                logger.info(`Your Pairing Code : ${code}`);
            }, 3000);
        } else {
            logger.warn('Please set global.numberowner in config.js to use automatic pairing code.');
        }
    }

    conn.ev.on('creds.update', saveCreds);

    const { handler, participantsUpdate, delete: _delete } = require('./handler');

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        if (conn.pushMessage) await conn.pushMessage(chatUpdate.messages).catch((e) => logger.error(`[pushMessage] ${e.message}`));
        await handler.call(conn, chatUpdate);
    });
    conn.ev.on('group-participants.update', participantsUpdate.bind(conn));
    conn.ev.on('messages.delete', (item) => {
        if (item.keys) {
            for (const key of item.keys) _delete.call(conn, key);
        }
    });

    conn.ev.on('call', async (call) => {
        const { id, from, status } = call[0];
        if (status === 'ringing') {
            await conn.rejectCall(id, from);
            logger.info(`Rejected incoming call from ${from}`);
        }
    });

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && !conn.authState.creds.registered && !global.numberowner) {
            logger.warn('Scan the QR code below:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) start();
        } else if (connection === 'open') {
            logger.info('🌐 Connection opened');
            if (global.db.data) {
                await conn.insertAllGroup().catch((e) => logger.error(`[insertAllGroup] ${e.message}`));
                logger.info('✅ LID cache pre-populated from groups');
            }
        }
    });

    const pluginsFolder = path.join(__dirname, 'plugins');
    global.plugins = {};
    global.categorizedPlugins = { all: [], before: [], command: [] };

    const loadPlugins = () => {
        global.plugins = {};
        global.categorizedPlugins = { all: [], before: [], command: [] };
        for (let filename of fs.readdirSync(pluginsFolder).filter(v => v.endsWith('.js'))) {
            try {
                const plugin = require(path.join(pluginsFolder, filename));
                global.plugins[filename] = plugin;
                if (!plugin || plugin.disabled) continue;
                if (typeof plugin.all === 'function') global.categorizedPlugins.all.push(filename);
                if (typeof plugin.before === 'function') global.categorizedPlugins.before.push(filename);
                if (typeof plugin === 'function' || plugin.command) global.categorizedPlugins.command.push(filename);
            } catch (e) {
                logger.error(`Error loading plugin ${filename}: ${e.message}`);
            }
        }
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
        logger.info(`Found ${Object.keys(global.plugins).length} plugins categorized: All(${global.categorizedPlugins.all.length}), Before(${global.categorizedPlugins.before.length}), Command(${global.categorizedPlugins.command.length})`);
    };
    loadPlugins();
    global.reloadHandler = loadPlugins;

    if (!global.intervalSet) {
        // Maintenance interval - 30 detik
        registerInterval(async () => {
            if (global.db.data) await global.db.write();

            // Prune conn.chats if too large to save memory
            if (global.conn && global.conn.chats) {
                const chatIds = Object.keys(global.conn.chats);
                if (chatIds.length > 1000) {
                    const toDelete = chatIds.length - 1000;
                    for (let i = 0; i < toDelete; i++) {
                        delete global.conn.chats[chatIds[i]];
                    }
                    logger.debug(`[Maintenance] Pruned ${toDelete} old chats from connection`);
                }
            }

            if (global.opts['autocleartmp']) {
                const tmpDir = path.join(__dirname, 'tmp');
                if (fs.existsSync(tmpDir)) {
                    for (const file of fs.readdirSync(tmpDir)) {
                        if (file !== '.gitignore') {
                            const filePath = path.join(tmpDir, file);
                            const stats = fs.statSync(filePath);
                            if (Date.now() - stats.mtimeMs > 1000 * 60 * 3) fs.unlinkSync(filePath);
                        }
                    }
                }
            }
        }, 30 * 1000);

        // Daily Database Pruning (Inactive Users) - 24 jam
        registerInterval(async () => {
            if (global.db && global.db.data && global.db.data.users) {
                const now = Date.now();
                const oneMonth = 30 * 24 * 60 * 60 * 1000;
                let pruned = 0;
                for (let jid in global.db.data.users) {
                    const user = global.db.data.users[jid];
                    if (user.lastseen && (now - user.lastseen > oneMonth) && !user.premium && !user.registered) {
                        delete global.db.data.users[jid];
                        pruned++;
                    }
                }
                if (pruned > 0) {
                    logger.info(`[DB] Pruned ${pruned} inactive users`);
                    await global.db.forceWrite();
                }
            }
        }, 24 * 60 * 60 * 1000);

        // Memory monitoring - 1 menit
        registerInterval(() => {
            const memoryUsage = process.memoryUsage();
            const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
            
            if (heapUsedPercent > 90) {
                logger.warn(`[Memory] High memory usage: ${heapUsedPercent.toFixed(2)}%`);
            } else if (heapUsedPercent > 80) {
                logger.info(`[Memory] Memory usage: ${heapUsedPercent.toFixed(2)}%`);
            }
        }, 60 * 1000);

        global.intervalSet = true;
    }
}

start();

// Graceful Shutdown Handler
async function gracefulShutdown(signal) {
    logger.warn(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);
    
    const shutdownStartTime = Date.now();
    const SHUTDOWN_TIMEOUT = 30000; // 30 detik timeout
    
    try {
        // 1. Flush database writes
        if (global.db) {
            logger.info('[Shutdown] Flushing database writes...');
            await global.db.flush();
            logger.info('[Shutdown] Database flushed');
        }
        
        // 2. Flush totalchat buffer
        const totalChatPlugin = require('./plugins/_totalchat');
        if (totalChatPlugin.flush) {
            logger.info('[Shutdown] Flushing totalchat buffer...');
            await totalChatPlugin.flush();
        }
        
        // 3. Clear all intervals
        clearAllIntervals();
        
        // 4. Cleanup cache background tasks
        const cache = require('./lib/cache');
        if (cache.cleanup) {
            logger.info('[Shutdown] Cleaning up cache...');
            cache.cleanup();
        }
        
        // 5. Close MongoDB connection
        if (mongoose.connection.readyState) {
            logger.info('[Shutdown] Closing MongoDB connection...');
            await mongoose.connection.close();
            logger.info('[Shutdown] MongoDB connection closed');
        }
        
        // 6. Close WhatsApp connection
        if (global.conn?.ws) {
            logger.info('[Shutdown] Closing WhatsApp connection...');
            global.conn.ws.close();
        }
        
        // 7. Close Express server
        logger.info('[Shutdown] Shutdown completed in ' + (Date.now() - shutdownStartTime) + 'ms');
        
        process.exit(0);
    } catch (e) {
        logger.error(`[Shutdown] Error during shutdown: ${e.message}`, { stack: e.stack });
        process.exit(1);
    }
    
    // Force exit if timeout
    setTimeout(() => {
        logger.error('[Shutdown] Forced exit after timeout');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('beforeExit', () => gracefulShutdown('beforeExit'));

// Error handlers (tetap ada tapi dengan logger)
process.on('uncaughtException', (e) => {
    logger.error(`[Uncaught Exception] ${e.message}`, { stack: e.stack });
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[Unhandled Rejection] ${reason}`, { promise: promise.toString() });
});
