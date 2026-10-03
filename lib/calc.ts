// Logika honor homebase & take-home pay dosen struktural UTR.
// Sumber tarif: SK 001/SK/11/UTR/X/2021 (Bagian 2.A.1 & 2.D).
// Tarif S2 Lektor Kepala tidak tercantum di SK — diekstrapolasi (lihat catatan di bawah).

export type Pendidikan = "S2" | "S3";
export type Jabatan = "TP" | "AA" | "Lektor" | "LK" | "Prof";

export interface TarifRow {
  tarif: number; // Rp per pertemuan (S1)
  hbLama: number; // honor homebase lama, Rp/bulan
}

// Urutan di sini menentukan urutan tampil di dropdown (TP = jabatan fungsional paling rendah).
export const JABATAN_LABEL: Record<Jabatan, string> = {
  TP: "Tenaga Pengajar",
  AA: "Asisten Ahli",
  Lektor: "Lektor",
  LK: "Lektor Kepala",
  Prof: "Profesor",
};

export const TARIF: Record<string, TarifRow> = {
  "S2|TP": { tarif: 100000, hbLama: 0 }, // SK: honor homebase S2 Tenaga Pengajar "-" (nol)
  "S2|AA": { tarif: 125000, hbLama: 500000 },
  "S2|Lektor": { tarif: 150000, hbLama: 1500000 },
  "S2|LK": { tarif: 175000, hbLama: 2000000 }, // diekstrapolasi, tidak ada di SK
  "S3|TP": { tarif: 150000, hbLama: 500000 },
  "S3|AA": { tarif: 175000, hbLama: 1500000 },
  "S3|Lektor": { tarif: 200000, hbLama: 2500000 },
  "S3|LK": { tarif: 225000, hbLama: 3000000 },
  "PROF|Prof": { tarif: 250000, hbLama: 5000000 },
};

export function tarifKey(pendidikan: Pendidikan, jabatan: Jabatan): string {
  if (jabatan === "Prof") return "PROF|Prof";
  return `${pendidikan}|${jabatan}`;
}

export function getTarif(pendidikan: Pendidikan, jabatan: Jabatan): TarifRow {
  const row = TARIF[tarifKey(pendidikan, jabatan)];
  if (!row) throw new Error(`Kombinasi tidak dikenal: ${pendidikan}/${jabatan}`);
  return row;
}

// Konstanta tetap
export const M_LAMA = 32; // 12 kelas x 16 pertemuan / 6 bulan
export const M_BARU = 24; // 6 pertemuan/minggu x 4 minggu, dikunci
export const ROUND = 50000;
export const TENURE_RATE = 50000; // Rp per tahun mengabdi
export const TENURE_CAP_YEARS = 20;
export const TENURE_THRESHOLD_YEARS = 3; // > ini baru dapat kenaikan %

export interface CalcInput {
  pendidikan: Pendidikan;
  jabatan: Jabatan;
  tahunMengabdi: number;
  targetKenaikan: number; // fraksi, misal 0.03
}

export interface CalcResult {
  tarif: number;
  hbLama: number;
  ajarLama: number;
  ajarBaru: number;
  premiMasaKerja: number;
  hbBaru: number;
  kenaikanHbRp: number;
  kenaikanHbPct: number;
  takeHomeLama: number;
  takeHomeBaru: number;
  deltaTakeHomeRp: number;
  deltaTakeHomePct: number;
}

export function hitungHonorHomebase(input: CalcInput): CalcResult {
  const { pendidikan, jabatan, tahunMengabdi, targetKenaikan } = input;
  const { tarif, hbLama } = getTarif(pendidikan, jabatan);

  const ajarLama = M_LAMA * tarif;
  const ajarBaru = M_BARU * tarif;
  const takeHomeLama = hbLama + ajarLama;

  const g = tahunMengabdi > TENURE_THRESHOLD_YEARS ? targetKenaikan : 0;
  const premiMasaKerja = Math.min(tahunMengabdi, TENURE_CAP_YEARS) * TENURE_RATE;

  // Kenaikan % dihitung dari TOTAL TAKE-HOME PAY lama (homebase + mengajar), bukan dari
  // homebase saja — supaya kenaikan yang dirasakan dosen benar-benar sebesar target yang
  // dipilih, bukan persentase kecil dari basis homebase yang kecil.
  const targetTakeHomeBaru = takeHomeLama * (1 + g);
  const hbBaruRaw = targetTakeHomeBaru - ajarBaru;
  const hbBaru = Math.max(0, Math.ceil(hbBaruRaw / ROUND) * ROUND) + premiMasaKerja;

  const kenaikanHbRp = hbBaru - hbLama;
  const kenaikanHbPct = hbLama ? kenaikanHbRp / hbLama : 0;

  const takeHomeBaru = hbBaru + ajarBaru;
  const deltaTakeHomeRp = takeHomeBaru - takeHomeLama;
  const deltaTakeHomePct = takeHomeLama ? deltaTakeHomeRp / takeHomeLama : 0;

  return {
    tarif,
    hbLama,
    ajarLama,
    ajarBaru,
    premiMasaKerja,
    hbBaru,
    kenaikanHbRp,
    kenaikanHbPct,
    takeHomeLama,
    takeHomeBaru,
    deltaTakeHomeRp,
    deltaTakeHomePct,
  };
}

export function fmtRupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
