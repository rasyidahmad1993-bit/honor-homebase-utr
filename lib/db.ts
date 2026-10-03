import { neon } from "@neondatabase/serverless";

export interface DosenRow {
  id: number;
  nama: string;
  pendidikan: "S2" | "S3";
  jabatan: "TP" | "AA" | "Lektor" | "LK" | "Prof";
  tingkatan: "Pimpinan" | "Staff" | "Dosen" | "DosenTidakTetap";
  tahun_mengabdi: number;
  created_at: string;
}

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      "Database belum terhubung. Set DATABASE_URL / POSTGRES_URL (lihat README untuk setup Vercel Postgres)."
    );
  }
  return neon(url);
}

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS dosen (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      pendidikan TEXT NOT NULL CHECK (pendidikan IN ('S2','S3')),
      jabatan TEXT NOT NULL CHECK (jabatan IN ('TP','AA','Lektor','LK','Prof')),
      tingkatan TEXT NOT NULL DEFAULT 'Dosen' CHECK (tingkatan IN ('Pimpinan','Staff','Dosen','DosenTidakTetap')),
      tahun_mengabdi INTEGER NOT NULL CHECK (tahun_mengabdi >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  // Migrasi untuk database yang sudah ada sebelum jabatan "TP" ditambahkan.
  await sql`ALTER TABLE dosen DROP CONSTRAINT IF EXISTS dosen_jabatan_check;`;
  await sql`ALTER TABLE dosen ADD CONSTRAINT dosen_jabatan_check CHECK (jabatan IN ('TP','AA','Lektor','LK','Prof'));`;
  // Migrasi untuk database yang sudah ada sebelum kolom "tingkatan" ditambahkan.
  await sql`ALTER TABLE dosen ADD COLUMN IF NOT EXISTS tingkatan TEXT NOT NULL DEFAULT 'Dosen';`;
  await sql`ALTER TABLE dosen DROP CONSTRAINT IF EXISTS dosen_tingkatan_check;`;
  await sql`ALTER TABLE dosen ADD CONSTRAINT dosen_tingkatan_check CHECK (tingkatan IN ('Pimpinan','Staff','Dosen','DosenTidakTetap'));`;
  initialized = true;
}

export async function listDosen(): Promise<DosenRow[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, nama, pendidikan, jabatan, tingkatan, tahun_mengabdi, created_at
    FROM dosen
    ORDER BY created_at DESC;
  `) as DosenRow[];
  return rows;
}

export async function createDosen(data: {
  nama: string;
  pendidikan: "S2" | "S3";
  jabatan: "TP" | "AA" | "Lektor" | "LK" | "Prof";
  tingkatan: "Pimpinan" | "Staff" | "Dosen" | "DosenTidakTetap";
  tahunMengabdi: number;
}): Promise<DosenRow> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO dosen (nama, pendidikan, jabatan, tingkatan, tahun_mengabdi)
    VALUES (${data.nama}, ${data.pendidikan}, ${data.jabatan}, ${data.tingkatan}, ${data.tahunMengabdi})
    RETURNING id, nama, pendidikan, jabatan, tingkatan, tahun_mengabdi, created_at;
  `) as DosenRow[];
  return rows[0];
}

export async function deleteDosen(id: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM dosen WHERE id = ${id};`;
}
