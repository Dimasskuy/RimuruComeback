# Memory Leak Audit Checklist

## Hasil audit singkat

- [x] Koleksi global yang tumbuh terus: `initializedUsers`/`initializedChats` sudah dibersihkan periodik di `handler.js`.
- [x] Lock map (`userLocks`, `chatLocks`) memiliki cleanup stale lock periodik.
- [x] Audit trail ekonomi diberi batas buffer (`MAX_AUDIT_LOG=5000`) agar tidak tumbuh tanpa batas.
- [x] Idempotency key store dibersihkan TTL periodik (`IDEMPOTENCY_TTL`).

## Rekomendasi lanjutan

- [ ] Tambah load test 10k action di CI.
- [ ] Ambil heap snapshot sebelum/sesudah simulasi untuk validasi regresi.
- [ ] Tambah metrik memory RSS + heapUsed ke dashboard observability.
