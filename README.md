# Honor Homebase UTR

Database dosen struktural + kalkulator honor homebase & take-home pay otomatis,
berdasarkan SK 001/SK/11/UTR/X/2021.

## Cara deploy (Vercel + database, tanpa kode)

1. Buka https://vercel.com, login/daftar pakai akun GitHub kamu.
2. Klik **Add New → Project**, pilih repo `honor-homebase-utr`, klik **Deploy**.
   (Build pertama bisa gagal karena database belum ada — itu normal, lanjut ke langkah 3.)
3. Di dashboard project Vercel, buka tab **Storage → Create Database → Postgres**
   (biasanya nama produknya "Neon" atau "Postgres"), ikuti wizard-nya, lalu klik **Connect**
   ke project ini. Vercel otomatis menambahkan environment variable yang dibutuhkan
   (`POSTGRES_URL`, dll).
4. Buka tab **Deployments**, klik titik tiga pada deployment terakhir → **Redeploy**.
5. Setelah selesai, buka URL yang diberikan Vercel (format `nama-project.vercel.app`) — halaman
   sudah bisa dipakai, tabel `dosen` dibuat otomatis saat pertama kali diakses.

## Develop lokal (opsional)

```bash
npm install
# butuh file .env.local berisi POSTGRES_URL dari Vercel (Storage → .env.local tab)
npm run dev
```

## Struktur

- `lib/calc.ts` — semua rumus honor homebase & take-home pay (sumber tunggal, dipakai FE & API).
- `lib/db.ts` — akses database Postgres (tabel `dosen` dibuat otomatis).
- `app/api/dosen/route.ts` — GET (daftar) & POST (tambah dosen).
- `app/api/dosen/[id]/route.ts` — DELETE (hapus dosen).
- `app/page.tsx` — UI: form tambah dosen + tabel simulasi.

## Mengubah tarif SK

Tarif per pertemuan dan honor homebase lama ada di `lib/calc.ts`, variabel `TARIF`.
Ubah angkanya di situ kalau ada SK baru, lalu push ke GitHub — Vercel build ulang otomatis.

<!-- trigger deploy -->
