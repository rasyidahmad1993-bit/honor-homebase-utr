// Bootstrap akun admin pertama. Jalankan sekali setelah database tersambung:
//
//   DATABASE_URL=... ADMIN_EMAIL=you@kampus.ac.id ADMIN_PASSWORD=ganti-ini node scripts/seed-admin.mjs
//
// Aman dijalankan berulang kali — akan meng-update password jika email sudah ada (upsert).
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE === "viewer" ? "viewer" : "admin";

if (!url) {
  console.error("DATABASE_URL / POSTGRES_URL belum diset.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Set ADMIN_EMAIL dan ADMIN_PASSWORD terlebih dahulu.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD minimal 8 karakter.");
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const hash = await bcrypt.hash(password, 10);
await sql`
  INSERT INTO users (email, password_hash, role)
  VALUES (${email.toLowerCase()}, ${hash}, ${role})
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
`;

console.log(`Akun ${role} untuk ${email} siap dipakai login.`);
