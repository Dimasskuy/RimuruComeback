const { PlayEngine } = require("@irithell-js/yt-play");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const mono = (text) => "```" + text + "```";
const execPromise = promisify(exec);

// Initialize PlayEngine with shared cache directory
const cacheDir = path.join(__dirname, "..", "tmp", "ytplay-cache");
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

const engine = new PlayEngine({
    cacheDir: cacheDir,
    ttlMs: 10 * 60_000, // 10 minutes cache
    preferredAudioKbps: 128,
    preferredVideoP: 480,
    preloadBuffer: false,
    cookiesPath: path.join(__dirname, "..", "cookies.txt"),
    useAria2c: true,
    concurrentFragments: 4,
    ytdlpBinaryPath: "/tmp/yt-dlp-new" // Use updated yt-dlp
});

/**
 * Convert M4A to MP3 using ffmpeg
 */
async function convertToMp3(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const cmd = `ffmpeg -i "${inputFile}" -acodec libmp3lame -ab 128k -ar 44100 -y "${outputFile}" 2>&1`;
        
        exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`FFmpeg error: ${error.message}`));
                return;
            }
            
            fs.stat(outputFile, (err, stats) => {
                if (err || stats.size === 0) {
                    reject(new Error("Output file not created or empty"));
                    return;
                }
                resolve(outputFile);
            });
        });
    });
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(mono("Judul?"));

    let requestId = null;
    let result = null;
    let tempFiles = [];
    let retryCount = 0;
    const maxRetries = 2;

    try {
        // Search with retry logic
        let metadata;
        while (retryCount < maxRetries) {
            try {
                metadata = await engine.search(text);
                break;
            } catch (searchError) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    return m.reply(mono("❌ 404 Not Found"));
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        if (!metadata) {
            return m.reply(mono("❌ 404 Not Found"));
        }

        // Send waiting message
        const waitMsg = await m.reply(mono(`🎵 Searching...\n\nJudul: ${metadata.title}\nAuthor: ${metadata.author}\nDurasi: ${metadata.duration}\n\nMohon tunggu...`));

        // Generate unique request ID
        requestId = engine.generateRequestId("play");
        
        // Preload with error handling
        try {
            await engine.preload(metadata, requestId);
        } catch (preloadError) {
            // If preload fails due to format, try with lower quality
            if (preloadError.message.includes("Requested format is not available")) {
                await m.reply(mono("⚠️ Format tidak tersedia, mencoba quality lebih rendah..."));
                
                // Cleanup and retry with different settings
                engine.cleanup(requestId);
                requestId = engine.generateRequestId("play-retry");
                
                try {
                    await engine.preload(metadata, requestId);
                } catch (retryError) {
                    throw new Error("Gagal mengunduh: Format audio tidak tersedia untuk video ini");
                }
            } else {
                throw preloadError;
            }
        }
        
        // Get audio file (M4A format)
        result = await engine.getOrDownload(requestId, "audio");
        
        if (!result || !result.file || !result.file.path) {
            return m.reply(mono("❌ Gagal mengunduh audio."));
        }

        // Check file exists
        if (!fs.existsSync(result.file.path)) {
            return m.reply(mono("❌ File tidak ditemukan."));
        }

        // Convert M4A to MP3 for better compatibility
        const mp3File = result.file.path.replace(/\.m4a$/i, ".mp3");
        await convertToMp3(result.file.path, mp3File);
        tempFiles.push(mp3File);
        
        // Verify MP3 file
        const mp3Stats = fs.statSync(mp3File);
        if (mp3Stats.size === 0) {
            throw new Error("MP3 conversion resulted in empty file");
        }

        // Send audio file
        await conn.sendMessage(m.chat, {
            audio: { url: mp3File },
            mimetype: "audio/mpeg",
            fileName: metadata.title + ".mp3",
            contextInfo: {
                externalAdReply: {
                    title: metadata.title,
                    body: metadata.author || "Unknown Artist",
                    thumbnailUrl: metadata.thumb,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    sourceUrl: metadata.url
                }
            }
        }, { quoted: m });

        // Delete wait message
        try {
            await conn.sendMessage(m.chat, { delete: waitMsg.key });
        } catch (e) {
            // Ignore delete error
        }

    } catch (e) {
        console.error("Play command error:", e);
        
        // Try to delete wait message
        try {
            if (waitMsg) await conn.sendMessage(m.chat, { delete: waitMsg.key });
        } catch (e2) {}
        
        // Friendly error message
        let errorMsg = e.message || "Terjadi kesalahan";
        if (errorMsg.includes("Requested format is not available")) {
            errorMsg = "Format audio tidak tersedia untuk video ini. Coba video lain.";
        } else if (errorMsg.includes("Sign in to confirm")) {
            errorMsg = "Authentication error. Update cookies.txt Anda.";
        }
        
        m.reply(mono("❌ Gagal Play: " + errorMsg));
    } finally {
        // IMMEDIATE cleanup - delete files right after sending
        if (requestId) {
            try {
                // Delete all temp files immediately
                tempFiles.forEach(file => {
                    try {
                        fs.unlinkSync(file);
                        console.log(`[PLAY] Deleted: ${file}`);
                    } catch (e) {}
                });
                
                // Delete original file
                if (result && result.file && result.file.path) {
                    fs.unlinkSync(result.file.path);
                    console.log(`[PLAY] Deleted: ${result.file.path}`);
                }
                
                // Cleanup engine cache
                engine.cleanup(requestId);
            } catch (e) {
                console.log("Cleanup error:", e.message);
            }
        }
        
        // Clear references
        requestId = null;
        result = null;
    }
};

handler.help = ["play <judul>"];
handler.tags = ["downloader"];
handler.command = /^play$/i;
handler.limit = 3;
handler.register = true;

module.exports = handler;
