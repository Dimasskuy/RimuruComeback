# Modernization & Long-Term Audit (RimuruComeback)

> Bahasa: Indonesia
> 
> Tujuan: memberi analisis mendalam berbasis **folder + file prioritas tinggi**, karena repository ini memiliki ratusan plugin (361 file plugin) sehingga review baris-per-baris semua file dalam satu iterasi tidak realistis tanpa mengganggu produktivitas.

## 1) Ringkasan Hasil Audit Otomatis

Audit dijalankan dengan `node scripts/audit.js`, output ada di `docs/audit-report.json`.

### Cakupan
- Total file: **457**
- Total file JavaScript: **388**
- Folder terbesar: `plugins` (**361 file**) 

### Temuan Teknis Utama
- Pemakaian API sinkron (`fs.*Sync`): **79 kemunculan**
- Pemakaian `setInterval`: **10 kemunculan**
- Pemakaian `child_process exec/execSync`: **12 kemunculan**
- TLS validation dimatikan (`NODE_TLS_REJECT_UNAUTHORIZED=0`): **1 kemunculan**
- Hardcoded MongoDB URI terdeteksi: **1 kemunculan**
- Potensi secret hardcoded terdeteksi: **1 kemunculan**

---

## 2) Analisis Per Folder + Perlu Perbaikan

## Root (`index.js`, `handler.js`, `config.js`, `package.json`)

### Yang bagus
- Sudah ada health endpoint (`/health`) dengan metrik memory.
- Sudah ada graceful shutdown + flush DB.
- Sudah ada categorization plugin (`all`, `before`, `command`) untuk performa dispatch.

### Risiko / Debt
1. **TLS verification dimatikan global** di `index.js`.
   - Risiko: MITM, data session WA rentan.
2. **Hardcoded konfigurasi sensitif** di `config.js` (nomor owner, URI Mongo).
   - Risiko: kebocoran kredensial, sulit rotasi secret.
3. **Dependency WhatsApp/Baileys legacy** (`@adiwajshing/baileys`).
   - Risiko: ketertinggalan patch, kompatibilitas kebijakan terbaru WA.
4. **`fs.*Sync` masih banyak** di hot path start/maintenance.
   - Risiko: event loop block saat bot ramai.
5. **Autoreconnect sangat agresif** tanpa exponential backoff.
   - Risiko: reconnect storm saat jaringan bermasalah.

### Prioritas perbaikan
- P1: pindah secret ke `.env` dan fallback aman.
- P1: hentikan `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- P1: migrasi ke package Baileys yang aktif maintenance.
- P2: ubah operasi fs sinkron ke async pada jalur message handling/maintenance.
- P2: tambah backoff reconnect + circuit breaker.

---

## `lib/`

### File kritikal
- `lib/simple.js`: layer integrasi WA socket.
- `lib/mongoDB.js`: persistence tunggal untuk state bot.
- `lib/cache.js`, `lib/queue.js`: komponen performa.

### Temuan
- `lib/mongoDB.js` sudah punya debounce write (bagus), namun serialisasi `JSON.stringify` data besar bisa mahal.
- `lib/webp.js` sangat besar (1498 baris) -> sulit maintain & testing.
- Beberapa modul converter/sticker memakai proses eksternal (`ffmpeg`, `magick`) tanpa guard resource yang ketat.

### Prioritas perbaikan
- P1: pecah `lib/webp.js` menjadi modul kecil.
- P1: tambah timeout + batas concurrency untuk ffmpeg/magick.
- P2: telemetry latensi per command dan per plugin.
- P2: pisah read-model/write-model (cache in-memory + write-behind queue yang terukur).

---

## `plugins/` (361 file)

### Kondisi saat ini
- Arsitektur plugin fleksibel tapi **terlalu gemuk**.
- Potensi inkonsistensi style, permission check, cooldown, dan error handling antar plugin.
- Ada plugin berisiko tinggi seperti `owner-exec2.js` (remote shell command dari chat owner).

### Risiko jangka panjang
- Boot time meningkat.
- Sulit audit keamanan menyeluruh.
- Potensi memory bloat dari state plugin yang tidak dibersihkan.

### Strategi modernisasi
- P1: tambah **manifest metadata plugin** (category, permission, cooldown, cost).
- P1: whitelist plugin production (jangan load semua plugin di runtime).
- P1: sandbox command berbahaya (`exec`) + audit log.
- P2: buat folder domain (`plugins/group`, `plugins/rpg`, `plugins/tools`, dst) + lint rule.
- P2: command registry terkompilasi saat startup (bukan scan berulang).

---

## `src/` (aset font/gambar)

### Temuan
- Banyak aset font statis; kemungkinan tidak semuanya dipakai.

### Perbaikan
- P2: inventory aset terpakai vs tidak terpakai.
- P2: lazy-load aset generator gambar.
- P3: kompresi aset + format modern bila memungkinkan.

---

## 3) Kesesuaian terhadap kebijakan WhatsApp terbaru

> Catatan: perubahan kebijakan WA sering menyentuh anti-spam, automation abuse, dan kualitas akun (quality rating). Tidak cukup hanya patch code; perlu disiplin operasional.

Rekomendasi compliance:
1. Rate limit command per user/chat.
2. Batasi broadcast agresif & auto-reply massal.
3. Simpan audit trail tindakan admin/owner.
4. Pastikan command sensitif butuh role check + confirmation step.
5. Tambah fail-safe untuk command yang memicu bulk messaging.

---

## 4) Analisis performa (RAM/CPU) & ketahanan jangka panjang

## Apakah sudah stabil?
Saat ini **belum bisa disimpulkan “stabil jangka panjang”** hanya dari static review. Perlu observability runtime minimal 7 hari.

### Yang sudah membantu
- Health endpoint dengan memory usage.
- Pruning chat list saat >1000.
- Debounce write MongoDB.

### Yang masih kurang (krusial)
- Belum ada metrik CPU per interval/per command.
- Belum ada histogram latency handler/plugin.
- Belum ada leak detection terjadwal (heap snapshot compare).

### Rekomendasi benchmark wajib
1. Test beban 1k-10k message/hari (simulasi).
2. Pantau `rss`, `heapUsed`, event loop lag, query time DB.
3. SLO: p95 command latency, crash-free uptime, reconnect rate.
4. Trigger alert jika heap >80% lebih dari 5 menit.

---

## 5) Roadmap agar bot “modern & keren”

## Fase 1 (1-2 minggu)
- Hardening security (secret env, TLS on, batasi exec).
- Observability dasar (metrics endpoint + structured logs per command).
- Stabilitas koneksi (exponential backoff reconnect).

## Fase 2 (2-4 minggu)
- Refactor plugin architecture (manifest, whitelist, domain folders).
- Async filesystem migration untuk hot path.
- Test automation minimal (syntax, smoke command, regression plugin core).

## Fase 3 (4-8 minggu)
- UI admin panel ringan (status bot, queue, usage command).
- Sistem tema/branding menu agar terlihat premium.
- Auto-update command help + telemetry-driven cleanup command yang jarang dipakai.

---

## 6) Checklist praktis yang bisa langsung dikerjakan

- [x] Pindah semua secret dari `config.js` ke `.env` (dengan fallback aman + mandatory `MONGODB_URL`)
- [x] Hapus default `NODE_TLS_REJECT_UNAUTHORIZED=0` (hanya aktif jika `ALLOW_INSECURE_TLS=true`)
- [x] Audit plugin berbahaya (`exec`, downloader shell) dan matikan `owner-exec2` secara default
- [ ] Tambah rate limit global + per command
- [x] Tambah metrik CPU & event loop lag di `/health`
- [ ] Buat profil command teratas (p95 latency, error rate)
- [ ] Split file >500 baris jadi modul kecil

---

## 7) Catatan transparansi

Permintaan “analisis mendalam setiap file” sudah ditangani dengan pendekatan **kombinasi audit otomatis + review file inti berisiko tinggi**, agar hasil tetap actionable pada repositori besar.

Jika diinginkan, tahap berikutnya bisa dibuat **gelombang audit 1 folder per iterasi** (misalnya 50 plugin/iterasi) sampai seluruh plugin memiliki skor kualitas, performa, dan keamanan.


## 8) Audit kode tidak terpakai (aman, tanpa auto-hapus)

Untuk menjawab kekhawatiran "yang kepakai jangan sampai ikut terhapus", strategi yang dipakai adalah:

1. **Report-only**: hanya tandai kandidat, tidak ada file yang dihapus otomatis.
2. **Konservatif**: folder `plugins/` dianggap dynamic-loaded, jadi tidak ditandai sebagai unused walau tidak punya referensi statis.
3. **Wajib verifikasi manual** sebelum hapus:
   - cek command benar-benar tidak bisa dipanggil,
   - cek tidak ada pemanggilan path dinamis,
   - cek log usage minimal 14 hari.

Output kandidat ada di `unusedCandidates` pada `docs/audit-report.json`.

### SOP aman sebelum hapus file
- Step 1: pindahkan file ke folder `deprecated/` dulu (jangan langsung delete).
- Step 2: jalankan bot 7-14 hari sambil monitor error `MODULE_NOT_FOUND`/fitur hilang.
- Step 3: jika aman, baru hapus permanen.
- Step 4: lakukan per batch kecil (maks 5-10 file per rilis).


## 9) Progress implementasi terbaru

- Reconnect policy sudah memakai exponential backoff + jitter untuk mencegah reconnect storm.
- `owner-exec2` sekarang butuh `ALLOW_OWNER_EXEC=true`, timeout, dan output limit.
- Monitoring memory sudah memakai threshold dari env + auto-restart opsional.
