
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
const { Low, JSONFile } = require('./lib/lowdb');
const yargs = require('yargs/yargs');
const chalk = require('chalk');
const _ = require('lodash');
const express = require('express');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

// Execute Prototype Extension
protoType();

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp('^[' + (opts['prefix'] || '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-') + ']');

const sessionPath = opts._[0] || 'sessions';

global.db = new Low(new JSONFile('database.json'));
global.DATABASE = global.db;
global.loadDatabase = async function loadDatabase() {
    if (global.db.READ) return new Promise((resolve) => setInterval(function () {
        (!global.db.READ ? (clearInterval(this), resolve(global.db.data == null ? global.loadDatabase() : global.db.data)) : null)
    }, 1 * 1000));
    if (global.db.data !== null) return;
    global.db.READ = true;
    await global.db.read();
    global.db.READ = false;
    global.db.data = {
        users: {},
        chats: {},
        stats: {},
        msgs: {},
        sticker: {},
        ...(global.db.data || {})
    };
    global.db.chain = _.chain(global.db.data);
};
loadDatabase();

global.APIs = { botcahx: 'https://api.botcahx.eu.org' };
global.APIKeys = { 'https://api.botcahx.eu.org': 'YOUR_APIKEY_HERE' };
global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '');

// Health Check Server
const app = express();
const ports = [8000, 3000, 5000, 4444, 8080];
function startExpress(portIndex = 0) {
    if (portIndex >= ports.length) return console.log('No available ports for health check server.');
    const port = ports[portIndex];
    const server = app.listen(port, () => {
        console.log(chalk.yellow(`🌐 Health check server listening on port ${port}`));
        app.get('/', (req, res) => res.json({ status: 'true', message: 'Bot Successfully Activated!' }));
    }).on('error', () => startExpress(portIndex + 1));
}
startExpress();

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(chalk.magenta(`-- using WA v${version.join('.')}, isLatest: ${isLatest} --`));

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

    // Default to Pairing Code if not registered
    if (!conn.authState.creds.registered) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const question = (text) => new Promise((resolve) => rl.question(text, resolve));

        console.log(chalk.yellow('-- Please wait, generating pairing code... --'));
        let phoneNumber = await question(chalk.yellow('ENTER A VALID NUMBER START WITH REGION CODE. Example : 62xxx:\n'));
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        if (phoneNumber.length < 10) {
            console.log(chalk.red('Invalid phone number.'));
            process.exit(0);
        }

        setTimeout(async () => {
            let code = await conn.requestPairingCode(phoneNumber, "RTXZYBOT");
            code = code?.match(/.{1,4}/g)?.join('-') || code;
            console.log(chalk.black(chalk.bgGreen('Your Pairing Code : ')), chalk.black(chalk.bgWhite(code)));
            rl.close();
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    const { handler, participantsUpdate, delete: _delete } = require('./handler');

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        if (conn.pushMessage) await conn.pushMessage(chatUpdate.messages).catch(console.error);
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
            console.log(chalk.red(`Rejected incoming call from ${from}`));
        }
    });

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && !conn.authState.creds.registered) {
            console.log(chalk.yellow('Scan the QR code below (or use pairing code if prompted):'));
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) start();
        } else if (connection === 'open') {
            console.log(chalk.green('🌐 Connection opened'));
        }
    });

    const pluginsFolder = path.join(__dirname, 'plugins');
    global.plugins = {};
    for (let filename of fs.readdirSync(pluginsFolder).filter(v => v.endsWith('.js'))) {
        try {
            global.plugins[filename] = require(path.join(pluginsFolder, filename));
        } catch (e) {
            console.error(`Error loading plugin ${filename}:`, e);
        }
    }
    global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
    console.log(chalk.yellow(`Found ${Object.keys(global.plugins).length} plugins`));

    setInterval(async () => {
        if (global.db.data) await global.db.write();
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
}

start();

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);
