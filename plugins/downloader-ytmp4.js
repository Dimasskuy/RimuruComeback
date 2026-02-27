const { PlayEngine } = require("@irithell-js/yt-play");
const fs = require("fs");
const path = require("path");

const mono = (text) => "```" + text + "```";

// Initialize PlayEngine with shared cache directory
const cacheDir = path.join(__dirname, "..", "tmp", "ytplay-cache");
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

const engine = new PlayEngine({
    cacheDir: cacheDir,
    ttlMs: 5 * 60_000, // 5 minutes cache
    preferredAudioKbps: 96, // Lower audio quality for smaller file
    preferredVideoP: 360, // Use 360p for smaller file (480p too big)
    preloadBuffer: false,
    cookiesPath: path.join(__dirname, "..", "cookies.txt"),
    useAria2c: true,
    concurrentFragments: 4,
    ytdlpBinaryPath: "/tmp/yt-dlp-new"
});

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(mono("Masukkan Link YouTube!\n\nContoh:\n" + usedPrefix + command + " https://youtu.be/xxxx"));

    let requestId = null;
    let result = null;

    try {
        // Search or get metadata from URL
        const metadata = await engine.search(text);
        
        if (!metadata) {
            return m.reply(mono("❌ Video tidak ditemukan."));
        }

        // Send waiting message
        const waitMsg = await m.reply(mono(`🎥 Searching...\n\nJudul: ${metadata.title}\nDurasi: ${metadata.duration}\n\nMohon tunggu...`));

        // Generate unique request ID
        requestId = engine.generateRequestId("ytmp4");
        
        // Preload with error handling
        try {
            await engine.preload(metadata, requestId);
        } catch (preloadError) {
            // If preload fails due to format, try with lower quality
            if (preloadError.message.includes("Requested format is not available")) {
                await m.reply(mono("⚠️ Format tidak tersedia, mencoba quality lebih rendah..."));
                
                // Cleanup and retry
                engine.cleanup(requestId);
                requestId = engine.generateRequestId("ytmp4-retry");
                
                try {
                    await engine.preload(metadata, requestId);
                } catch (retryError) {
                    throw new Error("Gagal mengunduh: Format video tidak tersedia");
                }
            } else {
                throw preloadError;
            }
        }
        
        // Get video file (480p max)
        result = await engine.getOrDownload(requestId, "video");
        
        if (!result || !result.file || !result.file.path) {
            return m.reply(mono("❌ Gagal mendapatkan file video."));
        }

        // Check file exists
        if (!fs.existsSync(result.file.path)) {
            return m.reply(mono("❌ File tidak ditemukan."));
        }

        // Send video file
        await conn.sendMessage(m.chat, {
            video: { url: result.file.path },
            mimetype: "video/mp4",
            fileName: metadata.title + ".mp4",
            caption: mono(`🎥 YOUTUBE MP4\n\nJudul: ${metadata.title}\nAuthor: ${metadata.author}\nDurasi: ${metadata.duration}\nQuality: 480p`)
        }, { quoted: m });

        // Delete wait message
        try {
            await conn.sendMessage(m.chat, { delete: waitMsg.key });
        } catch (e) {
            // Ignore delete error
        }

    } catch (e) {
        console.error("YTMP4 command error:", e);
        
        // Try to delete wait message
        try {
            if (waitMsg) await conn.sendMessage(m.chat, { delete: waitMsg.key });
        } catch (e2) {}
        
        // Friendly error message
        let errorMsg = e.message || "Terjadi kesalahan saat mengunduh video";
        if (errorMsg.includes("Requested format is not available")) {
            errorMsg = "Format video tidak tersedia untuk video ini.";
        } else if (errorMsg.includes("Sign in to confirm")) {
            errorMsg = "Authentication error. Update cookies.txt Anda.";
        }
        
        m.reply(mono("❌ Gagal: " + errorMsg));
    } finally {
        // IMMEDIATE cleanup - delete file right after sending
        if (requestId) {
            try {
                // Delete video file immediately
                if (result && result.file && result.file.path) {
                    fs.unlinkSync(result.file.path);
                    console.log(`[YTMP4] Deleted: ${result.file.path}`);
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

handler.help = ["ytmp4 <url>"];
handler.tags = ["downloader"];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = 4;
handler.register = true;

module.exports = handler;
