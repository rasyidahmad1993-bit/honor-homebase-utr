import { neon } from "@neondatabase/serverless";

export interface DosenRow {
  id: number;
  nama: string;
  pendidikan: "S2" | "S3";
  jabatan: "TP" | "AA" | "Lektor" | "LK" | "Prof";
  tingkatan: "Pimpinan" | "Staff" | "Dosen" | "DosenTidakTetap";
  tahun_mengabdi: number;
  jabatan_struktural: string | null;
  unit_kerja: string | null;
  hari_hadir: number | null;
  jumlah_kelas: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: "admin" | "viewer";
  created_at: string;
}

export interface AppStateRow {
  id: number;
  policy_aktif: boolean;
  status: "Draft" | "Approved";
  updated_by: string | null;
  updated_at: string;
}

export function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      "Database belum terhubung. Set DATABASE_URL / POSTGRES_URL (lihat README untuk setup)."
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
  // Migrasi bertahap (aman dijalankan berulang) untuk database yang sudah ada sebelumnya.
  await sql`ALTER TABLE dosen DROP CONSTRAINT IF EXISTS dosen_jabatan_check;`;
  await sql`ALTER TABLE dosen ADD CONSTRAINT dosen_jabatan_check CHECK (jabatan IN ('TP','AA','Lektor','LK','Prof'));`;
  await sql`ALTER TABLE dosen ADD COLUMN IF NOT EXISTS tingkatan TEXT NOT NULL DEFAULT 'Dosen';`;
  await sql`ALTER TABLE dosen DROP CONSTRAINT IF EXISTS dosen_tingkatan_check;`;
  await sql`ALTER TABLE dosen ADD CONSTRAINT dosen_tingkatan_check CHECK (tingkatan IN ('Pimpinan','Staff','Dosen','DosenTidakTetap'));`;
  await sql`ALTER TABLE dosen ADD COLUMN IF NOT EXISTS jabatan_struktural TEXT;`;
  await sql`ALTER TABLE dosen ADD COLUMN IF NOT EXISTS unit_kerja TEXT;`;
  await sql`ALTER TABLE dosen ADD COLUMN IF NOT EXISTS hari_hadir INTEGER;`;
  await sql`ALTER TABLE dosen ADD COLUMN IF NOT EXISTS jumlah_kelas INTEGER;`;
  await sql`ALTER TABLE dosen ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','viewer')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id INTEGER,
      detail JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      policy_aktif BOOLEAN NOT NULL DEFAULT true,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Approved')),
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT app_state_singleton CHECK (id = 1)
    );
  `;
  await sql`INSERT INTO app_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`;

  initialized = true;
}

/* ---------- Dosen ---------- */

export async function listDosen(): Promise<DosenRow[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, nama, pendidikan, jabatan, tingkatan, tahun_mengabdi,
           jabatan_struktural, unit_kerja, hari_hadir, jumlah_kelas, created_at, updated_at
    FROM dosen
    ORDER BY created_at DESC;
  `) as DosenRow[];
  return rows;
}

export interface DosenInput {
  nama: string;
  pendidikan: "S2" | "S3";
  jabatan: "TP" | "AA" | "Lektor" | "LK" | "Prof";
  tingkatan: "Pimpinan" | "Staff" | "Dosen" | "DosenTidakTetap";
  tahunMengabdi: number;
  jabatanStruktural?: string | null;
  unitKerja?: string | null;
  hariHadir?: number | null;
  jumlahKelas?: number | null;
}

export async function createDosen(data: DosenInput): Promise<DosenRow> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO dosen (nama, pendidikan, jabatan, tingkatan, tahun_mengabdi, jabatan_struktural, unit_kerja, hari_hadir, jumlah_kelas)
    VALUES (${data.nama}, ${data.pendidikan}, ${data.jabatan}, ${data.tingkatan}, ${data.tahunMengabdi},
            ${data.jabatanStruktural ?? null}, ${data.unitKerja ?? null}, ${data.hariHadir ?? null}, ${data.jumlahKelas ?? null})
    RETURNING id, nama, pendidikan, jabatan, tingkatan, tahun_mengabdi, jabatan_struktural, unit_kerja, hari_hadir, jumlah_kelas, created_at, updated_at;
  `) as DosenRow[];
  return rows[0];
}

export async function updateDosen(id: number, data: DosenInput): Promise<DosenRow | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    UPDATE dosen SET
      nama = ${data.nama},
      pendidikan = ${data.pendidikan},
      jabatan = ${data.jabatan},
      tingkatan = ${data.tingkatan},
      tahun_mengabdi = ${data.tahunMengabdi},
      jabatan_struktural = ${data.jabatanStruktural ?? null},
      unit_kerja = ${data.unitKerja ?? null},
      hari_hadir = ${data.hariHadir ?? null},
      jumlah_kelas = ${data.jumlahKelas ?? null},
      updated_at = now()
    WHERE id = ${id}
    RETURNING id, nama, pendidikan, jabatan, tingkatan, tahun_mengabdi, jabatan_struktural, unit_kerja, hari_hadir, jumlah_kelas, created_at, updated_at;
  `) as DosenRow[];
  return rows[0] ?? null;
}

export async function deleteDosen(id: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM dosen WHERE id = ${id};`;
}

/* ---------- Users ---------- */

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()};`) as UserRow[];
  return rows[0] ?? null;
}

export async function upsertUser(email: string, passwordHash: string, role: "admin" | "viewer"): Promise<UserRow> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${email.toLowerCase()}, ${passwordHash}, ${role})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
    RETURNING *;
  `) as UserRow[];
  return rows[0];
}

/* ---------- Audit log ---------- */

export async function logAudit(userEmail: string, action: string, targetId: number | null, detail: unknown) {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO audit_log (user_email, action, target_id, detail)
    VALUES (${userEmail}, ${action}, ${targetId}, ${JSON.stringify(detail ?? {})});
  `;
}

export async function listAuditLog(limit = 100) {
  await ensureSchema();
  const sql = getSql();
  return await sql`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${limit};`;
}

/* ---------- App state (kebijakan aktif & status approval) ---------- */

export async function getAppState(): Promise<AppStateRow> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM app_state WHERE id = 1;`) as AppStateRow[];
  return rows[0];
}

export async function setAppState(data: { policyAktif?: boolean; status?: "Draft" | "Approved" }, updatedBy: string): Promise<AppStateRow> {
  await ensureSchema();
  const sql = getSql();
  const current = await getAppState();
  const policyAktif = data.policyAktif ?? current.policy_aktif;
  const status = data.status ?? current.status;
  const rows = (await sql`
    UPDATE app_state SET policy_aktif = ${policyAktif}, status = ${status}, updated_by = ${updatedBy}, updated_at = now()
    WHERE id = 1
    RETURNING *;
  `) as AppStateRow[];
  return rows[0];
}
