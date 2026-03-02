const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CANDIDATE_YTDLP = [
  process.env.YTDLP_BINARY,
  '/tmp/yt-dlp-new',
  'yt-dlp'
].filter(Boolean);

function runCommand(cmd, args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timeout after ${timeout}ms`));
    }, timeout);

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Command exited with code ${code}`));
      }
      resolve({ stdout, stderr });
    });
  });
}

async function resolveYtDlpBinary() {
  for (const candidate of CANDIDATE_YTDLP) {
    try {
      await runCommand(candidate, ['--version'], 10000);
      return candidate;
    } catch (_) {}
  }
  throw new Error('yt-dlp tidak ditemukan. Install yt-dlp atau set YTDLP_BINARY di .env');
}

function isYoutubeUrl(input = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(input.trim());
}

async function getMetadata(input) {
  const ytdlp = await resolveYtDlpBinary();
  const target = isYoutubeUrl(input) ? input.trim() : `ytsearch1:${input.trim()}`;
  const args = ['-J', '--no-playlist', '--no-warnings', target];
  const { stdout } = await runCommand(ytdlp, args, 120000);
  const info = JSON.parse(stdout);
  const entry = Array.isArray(info.entries) ? info.entries[0] : info;
  if (!entry || !entry.id) throw new Error('Video tidak ditemukan');

  return {
    id: entry.id,
    url: `https://www.youtube.com/watch?v=${entry.id}`,
    title: entry.title || 'Unknown Title',
    duration: entry.duration || 0,
    channel: entry.uploader || entry.channel || 'Unknown',
    thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`
  };
}

function formatDuration(totalSec = 0) {
  const sec = Number(totalSec) || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

async function downloadAudio(videoUrl, outDir) {
  const ytdlp = await resolveYtDlpBinary();
  fs.mkdirSync(outDir, { recursive: true });
  const template = path.join(outDir, '%(id)s.%(ext)s');
  const args = [
    '--no-playlist',
    '--no-warnings',
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', template,
    videoUrl
  ];
  await runCommand(ytdlp, args, 300000);
  const id = new URL(videoUrl).searchParams.get('v');
  const mp3 = path.join(outDir, `${id}.mp3`);
  if (!fs.existsSync(mp3)) throw new Error('File MP3 gagal dibuat');
  return mp3;
}

async function downloadVideo(videoUrl, outDir, quality = '480') {
  const ytdlp = await resolveYtDlpBinary();
  fs.mkdirSync(outDir, { recursive: true });
  const template = path.join(outDir, '%(id)s.%(ext)s');
  const maxHeight = Number(quality) || 480;
  const format = `bv*[height<=${maxHeight}]+ba/b[height<=${maxHeight}]/b`;
  const args = [
    '--no-playlist',
    '--no-warnings',
    '-f', format,
    '--merge-output-format', 'mp4',
    '-o', template,
    videoUrl
  ];
  await runCommand(ytdlp, args, 300000);
  const id = new URL(videoUrl).searchParams.get('v');
  const mp4 = path.join(outDir, `${id}.mp4`);
  if (!fs.existsSync(mp4)) throw new Error('File MP4 gagal dibuat');
  return mp4;
}

module.exports = {
  getMetadata,
  formatDuration,
  downloadAudio,
  downloadVideo,
  resolveYtDlpBinary
};
