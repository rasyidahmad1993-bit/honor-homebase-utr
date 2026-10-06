# Honor Homebase UTR

Database dosen struktural + kalkulator honor homebase & take-home pay otomatis,
berdasarkan SK 001/SK/11/UTR/X/2021. Dilengkapi **login & kontrol akses** (Admin/Viewer)
dan **audit log** — bukan lagi sekadar alat simulasi tanpa proteksi.

## 1. Cara deploy (Vercel + database)

1. Buka https://vercel.com, login/daftar pakai akun GitHub kamu.
2. Klik **Add New → Project**, pilih repo `honor-homebase-utr`, klik **Deploy**.
   (Build pertama bisa gagal karena database & `AUTH_SECRET` belum ada — normal, lanjut ke
   langkah berikut.)
3. Di dashboard project Vercel, buka tab **Storage → Create Database → Postgres** (Neon),
   ikuti wizard-nya, lalu **Connect** ke project ini. Vercel otomatis menambahkan
   `DATABASE_URL`/`POSTGRES_URL`.
4. Buka tab **Settings → Environment Variables**, tambahkan:
   - `AUTH_SECRET` — string acak minimal 32 karakter. Generate dengan:
     ```bash
     openssl rand -base64 32
     ```
5. Buka tab **Deployments** → titik tiga pada deployment terakhir → **Redeploy**.
6. **Buat akun admin pertama** (wajib, sebelum sistem bisa dipakai login) — jalankan dari
   komputer kamu (butuh Node.js terpasang):
   ```bash
   git clone https://github.com/rasyidahmad1993-bit/honor-homebase-utr
   cd honor-homebase-utr
   npm install
   DATABASE_URL="<copy dari Vercel → Storage → .env.local tab>" \
   ADMIN_EMAIL="email-admin@kampus.ac.id" \
   ADMIN_PASSWORD="buat-password-kuat" \
   npm run seed:admin
   ```
   Jalankan perintah ini lagi kapan saja untuk reset password admin, atau ganti
   `ADMIN_ROLE=viewer` untuk membuat akun viewer (hanya bisa lihat, tidak bisa edit/hapus).
7. Buka URL dari Vercel (`nama-project.vercel.app`), login pakai akun yang baru dibuat.

## 2. Peran pengguna

| Peran | Bisa lihat data | Bisa tambah/edit/hapus | Bisa ubah status Draft/Approved |
|---|---|---|---|
| **Admin** (SDM) | ✅ | ✅ | ✅ |
| **Viewer** (Pimpinan/Yayasan) | ✅ | ❌ | ❌ |

Tambah pengguna baru dengan menjalankan `npm run seed:admin` lagi (ganti email/role sesuai
kebutuhan) — belum ada UI manajemen pengguna di dalam aplikasi, sengaja dibuat lewat script
supaya tidak ada endpoint publik untuk membuat akun sendiri.

## 3. Develop lokal

```bash
npm install
# butuh file .env.local berisi:
#   DATABASE_URL=...   (dari Vercel → Storage → .env.local tab)
#   AUTH_SECRET=...     (openssl rand -base64 32)
npm run dev
npm run seed:admin   # sekali saja, untuk bisa login di localhost
```

## 4. Struktur

- `lib/calc.ts` — semua rumus honor homebase & take-home pay (sumber tunggal, dipakai FE & API).
- `lib/db.ts` — akses database Postgres: tabel `dosen`, `users`, `audit_log`, `app_state`
  (dibuat & dimigrasikan otomatis saat pertama kali diakses).
- `lib/auth.ts` — hashing password (bcrypt) & sesi login (JWT di cookie httpOnly).
- `proxy.ts` — melindungi semua halaman kecuali `/login`; redirect ke login kalau belum
  masuk (pengganti `middleware.ts` di Next.js 16).
- `app/api/auth/*` — login, logout, cek sesi berjalan.
- `app/api/dosen/*` — GET (daftar, butuh login), POST/PUT (admin saja), DELETE (admin saja).
  Setiap mutasi otomatis tercatat ke `audit_log` (siapa, kapan, data apa).
- `app/api/state/*` — status periode (Draft/Approved) & toggle kebijakan, tersimpan di
  database (bukan state sementara di browser).
- `app/page.tsx` — UI utama: form tambah/edit dosen (admin), tabel simulasi (semua role).
- `scripts/seed-admin.mjs` — bootstrap/reset akun admin atau viewer.

## 5. Mengubah tarif SK

Tarif per pertemuan dan honor homebase lama ada di `lib/calc.ts`, variabel `TARIF`.
Ubah angkanya di situ kalau ada SK baru, lalu push ke GitHub — Vercel build ulang otomatis.

## 6. Yang masih jadi catatan (belum selesai)

- **Backup terjadwal**: Neon/Vercel Postgres punya snapshot otomatis di paket berbayar —
  cek dashboard Storage untuk mengaktifkan retention policy, belum dikonfigurasi dari kode ini.
- **Export resmi** (slip gaji PDF per dosen, rekap untuk bagian keuangan) belum ada di sistem
  ini — saat ini fitur itu masih hanya ada di dashboard HTML terpisah (bukan sistem produksi).
- **Beberapa tarif masih estimasi**, bukan angka final SK (lihat catatan di `lib/calc.ts` dan
  footer halaman) — perlu konfirmasi resmi sebelum dipakai menggaji sungguhan.
