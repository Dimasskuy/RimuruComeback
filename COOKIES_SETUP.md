# 🍪 YouTube Cookies Setup

## Masalah: "Sign in to confirm you're not a bot"

Error ini muncul karena YouTube memblokir request dari server/VPS untuk mencegah bot.

## ✅ Solusi: Gunakan Cookies Authentication

### Cara Export Cookies (Pilih salah satu browser)

---

#### 🔹 Chrome / Edge

1. **Install Extension**
   - Buka Chrome Web Store
   - Cari: **"Get cookies.txt LOCALLY"**
   - Klik "Add to Chrome"

2. **Login YouTube**
   - Buka https://www.youtube.com
   - Login dengan akun Google Anda

3. **Export Cookies**
   - Klik icon extension di browser
   - Klik **"Export Cookies"**
   - File `cookies.txt` akan terdownload

4. **Upload ke Server**
   - Upload file `cookies.txt` ke folder bot:
     ```
     /usr/home/felizmunzz/rimurucomeback/cookies.txt
     ```

5. **Restart Bot**
   ```bash
   npm start
   ```

---

#### 🔹 Firefox

1. **Install Add-on**
   - Buka Firefox Add-ons
   - Cari: **"cookies.txt"**
   - Klik "Add to Firefox"

2. **Login YouTube**
   - Buka https://www.youtube.com
   - Login dengan akun Google Anda

3. **Export Cookies**
   - Klik icon extension
   - Klik **"Export"**
   - Simpan sebagai `cookies.txt`

4. **Upload ke Server**
   - Upload file `cookies.txt` ke folder bot:
     ```
     /usr/home/felizmunzz/rimurucomeback/cookies.txt
     ```

5. **Restart Bot**
   ```bash
   npm start
   ```

---

### 📝 Catatan Penting

- ⚠️ **Cookies expired** setelah 1-2 minggu
- 🔄 **Export ulang** jika download gagal lagi
- 🔒 **Jangan share** file cookies.txt ke orang lain
- 📁 File cookies.txt harus format **Netscape HTTP Cookie**

### ✅ Tanda Cookies Berhasil

Setelah setup, download YouTube akan bekerja tanpa error authentication.

### ❌ Troubleshooting

**Error masih muncul?**
1. Cek apakah cookies.txt ada di folder yang benar
2. Pastikan format file benar (Netscape format)
3. Export ulang cookies dengan browser yang sudah login YouTube
4. Restart bot setelah upload cookies

**File cookies.txt kosong?**
- Export ulang dari browser
- Pastikan sudah login YouTube sebelum export

---

## 🛠️ Alternative: Gunakan Browser di Server

Jika server memiliki browser terinstall, plugin bisa auto-extract:

```javascript
const engine = new PlayEngine({
    cookiesFromBrowser: "firefox" // atau "chrome", "edge"
});
```

Tapi untuk VPS tanpa GUI, gunakan metode cookies.txt di atas.
