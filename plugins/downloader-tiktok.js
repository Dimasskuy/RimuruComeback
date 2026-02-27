const Tiktok = require("@tobyg74/tiktok-api-dl");
const axios = require("axios");

const mono = (text) => "```" + text + "```";

// Format numbers (e.g., 1200000 -> 1.2M)
function formatNumber(num) {
    if (!num && num !== 0) return '0';
    num = parseInt(num);
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Format duration in seconds to MM:SS
function formatDuration(duration) {
    if (!duration) return '0:00';

    let secs = parseInt(duration);

    if (secs > 1000) {
        secs = Math.floor(secs / 1000);
    }

    if (secs > 36000) {
        secs = 0;
    }

    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
}

// Extract video URL from various API response formats
function extractVideoUrl(data, methodUsed) {
    let videoUrl = null;
    let quality = 'SD';

    console.log('[TikTok] Extracting video URL from method:', methodUsed);
    console.log('[TikTok] Data keys:', Object.keys(data || {}));

    // Method 1: v1 API - check video.downloadAddr (array or string)
    if (data.video?.downloadAddr) {
        if (Array.isArray(data.video.downloadAddr) && data.video.downloadAddr.length > 0) {
            videoUrl = data.video.downloadAddr[0];
            quality = 'HD';
            console.log('[TikTok] Found video URL from v1 downloadAddr (array)');
        } else if (typeof data.video.downloadAddr === 'string') {
            videoUrl = data.video.downloadAddr;
            quality = 'HD';
            console.log('[TikTok] Found video URL from v1 downloadAddr (string)');
        }
    }

    // Method 2: v3 API - check videoHD
    if (!videoUrl && data.videoHD) {
        videoUrl = data.videoHD;
        quality = 'HD';
        console.log('[TikTok] Found video URL from v3 videoHD');
    }

    // Method 3: v2 API - check direct
    if (!videoUrl && data.direct) {
        videoUrl = data.direct;
        quality = 'SD';
        console.log('[TikTok] Found video URL from v2 direct');
    }

    // Method 4: Check video.playAddr (array or string)
    if (!videoUrl && data.video?.playAddr) {
        if (Array.isArray(data.video.playAddr) && data.video.playAddr.length > 0) {
            videoUrl = data.video.playAddr[0];
            quality = 'SD';
            console.log('[TikTok] Found video URL from playAddr (array)');
        } else if (typeof data.video.playAddr === 'string') {
            videoUrl = data.video.playAddr;
            quality = 'SD';
            console.log('[TikTok] Found video URL from playAddr (string)');
        }
    }

    // Method 5: Check data.video as object with url_list
    if (!videoUrl && data.video?.url_list && Array.isArray(data.video.url_list) && data.video.url_list.length > 0) {
        videoUrl = data.video.url_list[0];
        quality = 'SD';
        console.log('[TikTok] Found video URL from video.url_list');
    }

    // Method 6: Check data.playUrl (some API versions)
    if (!videoUrl && data.playUrl) {
        videoUrl = data.playUrl;
        quality = 'SD';
        console.log('[TikTok] Found video URL from playUrl');
    }

    // Method 7: Check data.url (fallback)
    if (!videoUrl && data.url) {
        videoUrl = data.url;
        quality = 'SD';
        console.log('[TikTok] Found video URL from url');
    }

    // Validate video URL is not empty or placeholder
    if (videoUrl && (videoUrl.trim() === '' || videoUrl === 'null' || videoUrl === 'undefined')) {
        console.log('[TikTok] Video URL is invalid (empty/null/undefined string)');
        videoUrl = null;
    }

    return { videoUrl, quality };
}

// Extract music URL from various API response formats
function extractMusicUrl(data) {
    let musicUrl = null;
    let musicTitle = 'Unknown';
    let musicAuthor = 'Unknown';

    // Check music.playUrl (array)
    if (data.music?.playUrl && Array.isArray(data.music.playUrl) && data.music.playUrl.length > 0) {
        musicUrl = data.music.playUrl[0];
        musicTitle = data.music.title || 'Unknown';
        musicAuthor = data.music.author || 'Unknown';
    }
    // Check music.playUrl (string)
    else if (data.music?.playUrl && typeof data.music.playUrl === 'string') {
        musicUrl = data.music.playUrl;
        musicTitle = data.music.title || 'Unknown';
        musicAuthor = data.music.author || 'Unknown';
    }
    // Check music.play_url (alternative format)
    else if (data.music?.play_url && Array.isArray(data.music.play_url) && data.music.play_url.length > 0) {
        musicUrl = data.music.play_url[0];
        musicTitle = data.music.title || 'Unknown';
        musicAuthor = data.music.author || 'Unknown';
    }
    // Check if music is a string directly
    else if (typeof data.music === 'string' && data.music.trim() !== '') {
        musicUrl = data.music;
        musicTitle = 'TikTok Audio';
    }

    // Validate music URL
    if (musicUrl && (musicUrl.trim() === '' || musicUrl === 'null' || musicUrl === 'undefined')) {
        musicUrl = null;
    }

    return { musicUrl, musicTitle, musicAuthor };
}

// Validate video URL is accessible
async function validateVideoUrl(url) {
    if (!url) return false;
    
    try {
        const response = await axios.head(url, {
            timeout: 5000,
            maxRedirects: 3
        });
        
        const contentType = response.headers['content-type'];
        const isValidVideo = contentType && contentType.includes('video');
        const contentLength = response.headers['content-length'];
        
        console.log('[TikTok] URL validation:', {
            status: response.status,
            contentType,
            contentLength,
            isValidVideo
        });
        
        // Accept if it's a video or if we can't determine but got 200 OK
        return response.status === 200;
    } catch (error) {
        console.log('[TikTok] URL validation failed:', error.message);
        // Don't fail on validation - just warn
        return true; // Assume valid to allow download attempt
    }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw mono(`Masukkan Link TikTok!\n\nContoh:\n${usedPrefix}${command} https://vt.tiktok.com/ZSkGPK9Kj/`);

    let result = null;
    let methodUsed = '';
    let errors = [];

    try {
        // Try V3 first (MusicalDown - HD No WM - Most Stable)
        try {
            methodUsed = 'v3';
            console.log(`[TikTok] Trying API v3 (MusicalDown - HD No WM) for: ${text}`);
            result = await Tiktok.Downloader(text, { version: "v3" });

            if (!result || !result.result || (!result.result.videoHD && !result.result.videoSD)) {
                throw new Error('v3: No video URL found');
            }

            console.log('[TikTok] v3 (MusicalDown) successful - HD No Watermark');
        } catch (e) {
            errors.push(`v3: ${e.message}`);
            console.log('[TikTok] v3 (MusicalDown) failed:', e.message);

            // Fallback to V2 (SSSTik - No WM)
            try {
                methodUsed = 'v2';
                console.log(`[TikTok] Trying API v2 (SSSTik - No WM) for: ${text}`);
                result = await Tiktok.Downloader(text, { version: "v2" });

                if (!result || !result.result || !result.result.video?.playAddr) {
                    throw new Error('v2: No video URL found');
                }

                console.log('[TikTok] v2 (SSSTik) successful - No Watermark');
            } catch (e2) {
                errors.push(`v2: ${e2.message}`);
                console.log('[TikTok] v2 (SSSTik) failed:', e2.message);

                // Fallback to V1 (TikTok API - may have WM)
                try {
                    methodUsed = 'v1';
                    console.log(`[TikTok] Trying API v1 (TikTok API - fallback) for: ${text}`);
                    result = await Tiktok.Downloader(text, { version: "v1" });

                    if (!result || !result.result) {
                        throw new Error('v1: No result');
                    }

                    const { videoUrl } = extractVideoUrl(result.result, 'v1');
                    if (!videoUrl) {
                        throw new Error('v1: No video URL found');
                    }

                    console.log('[TikTok] v1 (TikTok API) successful - Fallback');
                } catch (e3) {
                    errors.push(`v1: ${e3.message}`);
                    console.log('[TikTok] v1 (TikTok API) failed:', e3.message);
                    throw new Error('Semua metode API gagal: ' + errors.join(', '));
                }
            }
        }

        // Final check
        if (!result || !result.result) {
            throw new Error('Tidak ada hasil dari API TikTok');
        }

        const data = result.result;

        // Extract video URL based on API version
        let videoUrl = null;
        let quality = 'SD';

        if (methodUsed === 'v3') {
            // MusicalDown - HD No Watermark (Primary)
            videoUrl = data.videoHD || data.videoSD;
            quality = data.videoHD ? 'HD' : 'SD';
        } else if (methodUsed === 'v2' && data.video?.playAddr) {
            // SSSTik - No Watermark (Fallback 1)
            videoUrl = Array.isArray(data.video.playAddr) ? data.video.playAddr[0] : data.video.playAddr;
            quality = 'HD';
        } else {
            // V1 - TikTok API (Fallback 2 - Last resort)
            const extracted = extractVideoUrl(data, 'v1');
            videoUrl = extracted.videoUrl;
            quality = extracted.quality;
        }

        if (!videoUrl) {
            console.error('[TikTok] Final video URL extraction failed. Data:', JSON.stringify(data, null, 2));
            throw new Error('Tidak ada URL video yang ditemukan. Semua metode ekstraksi gagal.');
        }

        // Validate video URL (optional, non-blocking)
        await validateVideoUrl(videoUrl);

        // Extract metadata based on API version
        let description, authorUsername;

        if (methodUsed === 'v3') {
            // MusicalDown format
            description = data.desc || 'No description';
            authorUsername = data.author?.nickname || 'Unknown';
        } else if (methodUsed === 'v2') {
            // SSSTik format
            description = data.desc || 'No description';
            authorUsername = data.author?.nickname || 'Unknown';
        } else {
            // V1 - TikTok API format
            description = data.desc || data.description || 'No description';
            authorUsername = data.author?.username || data.author?.unique_id || 'Unknown';
        }

        // Build simple caption
        let caption = `🎬 *TikTok Video*\n\n`;
        caption += `${description}`;

        // Send video WITH caption embedded (single message)
        await conn.sendMessage(m.chat, {
            video: { url: videoUrl },
            fileName: `${authorUsername}_${data.id || Date.now()}.mp4`,
            mimetype: 'video/mp4',
            caption: caption
        }, { quoted: m });

    } catch (e) {
        console.error('[TikTok] Download error:', e);
        const errorMsg = e.message || 'Unknown error';
        throw mono(`❌ Gagal download TikTok.\n\nPastikan link TikTok valid dan akun tidak private.\n\n*Debug:* ${errorMsg}`);
    } finally {
        result = null;
    }
};

handler.help = ['tiktok <url>', 'tt <url>'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|tt)$/i;
handler.limit = 2;
handler.register = true;

module.exports = handler;
