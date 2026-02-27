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
    preferredVideoP: 480, // Set to 480p
    preloadBuffer: false, // Don't load into RAM to save memory
    cookiesPath: path.join(__dirname, "..", "cookies.txt"), // Use cookies.txt from root
    useAria2c: true, // Enable aria2c for faster downloads
    concurrentFragments: 4, // Reduce concurrent fragments for stability
    ytdlpBinaryPath: "/tmp/yt-dlp-new" // Use updated yt-dlp
});

/**
 * Convert M4A to MP3 using ffmpeg
 * @param {string} inputFile - Path to input M4A file
 * @param {string} outputFile - Path to output MP3 file
 */
async function convertToMp3(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const cmd = `ffmpeg -i "${inputFile}" -acodec libmp3lame -ab 128k -ar 44100 -y "${outputFile}" 2>&1`;
        
        exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`FFmpeg error: ${error.message}`));
                return;
            }
            
            // Check if output file exists and has size
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
    if (!text) return m.reply(mono("Masukkan Link YouTube atau Judul Lagu!\n\nContoh:\n" + usedPrefix + command + " https://www.youtube.com/watch?v=...\n" + usedPrefix + command + " Alan Walker Faded"));

    let requestId = null;
    let result = null;
    let convertedFile = null;
    let tempFiles = [];

    try {
        // Search or get metadata from URL
        const metadata = await engine.search(text);
        
        if (!metadata) {
            return m.reply(mono("❌ Video tidak ditemukan."));
        }

        // Send waiting message
        const waitMsg = await m.reply(mono(`🎵 Searching...\n\nJudul: ${metadata.title}\nDurasi: ${metadata.duration}\n\nMohon tunggu...`));

        // Generate unique request ID
        requestId = engine.generateRequestId("ytmp3");
        
        // Preload (download audio + video) with error handling
        try {
            await engine.preload(metadata, requestId);
        } catch (preloadError) {
            // If preload fails due to format, try with lower quality
            if (preloadError.message.includes("Requested format is not available")) {
                await m.reply(mono("⚠️ Format tidak tersedia, mencoba quality lebih rendah..."));
                
                // Cleanup and retry with different settings
                engine.cleanup(requestId);
                requestId = engine.generateRequestId("ytmp3-retry");
                
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
            return m.reply(mono("❌ Gagal mendapatkan file audio."));
        }

        // Check file exists
        if (!fs.existsSync(result.file.path)) {
            return m.reply(mono("❌ File tidak ditemukan."));
        }

        // Convert M4A to MP3 for better compatibility
        const mp3File = result.file.path.replace(/\.m4a$/i, ".mp3");
        await convertToMp3(result.file.path, mp3File);
        convertedFile = mp3File;
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
        console.error("YTMP3 command error:", e);
        
        // Try to delete wait message
        try {
            if (waitMsg) await conn.sendMessage(m.chat, { delete: waitMsg.key });
        } catch (e2) {}
        
        // Friendly error message
        let errorMsg = e.message || "Terjadi kesalahan saat mengunduh audio";
        if (errorMsg.includes("Requested format is not available")) {
            errorMsg = "Format audio tidak tersedia untuk video ini. Coba video lain.";
        } else if (errorMsg.includes("Sign in to confirm")) {
            errorMsg = "Authentication error. Update cookies.txt Anda.";
        }
        
        m.reply(mono("❌ Gagal: " + errorMsg));
    } finally {
        // IMMEDIATE cleanup - delete files right after sending
        if (requestId) {
            try {
                // Delete all temp files immediately
                tempFiles.forEach(file => {
                    try {
                        fs.unlinkSync(file);
                        console.log(`[YTMP3] Deleted: ${file}`);
                    } catch (e) {}
                });
                
                // Delete original file
                if (result && result.file && result.file.path) {
                    fs.unlinkSync(result.file.path);
                    console.log(`[YTMP3] Deleted: ${result.file.path}`);
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
        convertedFile = null;
    }
};

handler.help = ["ytmp3 <url/judul>"];
handler.tags = ["downloader"];
handler.command = /^ytmp3$/i;
handler.limit = 3;
handler.register = true;

module.exports = handler;
