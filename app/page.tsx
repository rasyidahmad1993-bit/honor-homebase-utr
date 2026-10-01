"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Jabatan,
  JABATAN_LABEL,
  Pendidikan,
  fmtRupiah,
  hitungHonorHomebase,
} from "@/lib/calc";

interface Dosen {
  id: number;
  nama: string;
  pendidikan: Pendidikan;
  jabatan: Jabatan;
  tahun_mengabdi: number;
  created_at: string;
}

const KENAIKAN_OPTIONS = [0, 0.02, 0.03, 0.05, 0.08];

export default function Page() {
  const [list, setList] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [kenaikan, setKenaikan] = useState(0.03);

  const [nama, setNama] = useState("");
  const [pendidikan, setPendidikan] = useState<Pendidikan>("S2");
  const [jabatan, setJabatan] = useState<Jabatan>("AA");
  const [tahun, setTahun] = useState(5);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dosen", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data.");
      setList(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dosen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          pendidikan,
          jabatan,
          tahunMengabdi: tahun,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan.");
      setNama("");
      setTahun(5);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus data dosen ini?")) return;
    try {
      const res = await fetch(`/api/dosen/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus.");
      setList((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  const rows = useMemo(
    () =>
      list.map((d) => ({
        d,
        calc: hitungHonorHomebase({
          pendidikan: d.pendidikan,
          jabatan: d.jabatan,
          tahunMengabdi: d.tahun_mengabdi,
          targetKenaikan: kenaikan,
        }),
      })),
    [list, kenaikan]
  );

  return (
    <div className="wrap">
      <div>
        <h1>Honor Homebase UTR</h1>
        <p className="sub">
          Database dosen struktural & kalkulator honor homebase semester depan (24 pertemuan/bulan dikunci,
          honor mengajar yang berkurang dialihkan ke homebase, ditambah kenaikan untuk &gt;3 tahun mengabdi
          dan premi masa kerja Rp50.000/tahun, maks 20 tahun).
        </p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <section className="card">
        <form onSubmit={handleSubmit} className="grid-form">
          <div>
            <label htmlFor="nama">Nama dosen</label>
            <input
              id="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap"
              required
            />
          </div>
          <div>
            <label htmlFor="jabatan">Jabatan fungsional</label>
            <select
              id="jabatan"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value as Jabatan)}
            >
              {(Object.keys(JABATAN_LABEL) as Jabatan[]).map((j) => (
                <option key={j} value={j}>
                  {JABATAN_LABEL[j]}
                </option>
              ))}
            </select>
          </div>
          {jabatan !== "Prof" && (
            <div>
              <label htmlFor="pendidikan">Pendidikan</label>
              <select
                id="pendidikan"
                value={pendidikan}
                onChange={(e) => setPendidikan(e.target.value as Pendidikan)}
              >
                <option value="S2">S2</option>
                <option value="S3">S3</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="tahun">Lama mengabdi (tahun)</label>
            <input
              id="tahun"
              type="number"
              min={0}
              max={60}
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Menyimpan…" : "Tambah dosen"}
            </button>
          </div>
        </form>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="toolbar">
          <strong>Daftar dosen & simulasi honor homebase</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="kenaikan" style={{ margin: 0 }}>
              Target kenaikan (&gt;3 th)
            </label>
            <select
              id="kenaikan"
              value={kenaikan}
              onChange={(e) => setKenaikan(Number(e.target.value))}
              style={{ width: "auto" }}
            >
              {KENAIKAN_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {(g * 100).toFixed(0)}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="empty">Memuat data…</p>
        ) : rows.length === 0 ? (
          <p className="empty">Belum ada dosen. Tambahkan lewat form di atas.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th>Pend.</th>
                  <th>Masa kerja</th>
                  <th>Homebase lama</th>
                  <th>Homebase baru</th>
                  <th>Take-home lama</th>
                  <th>Take-home baru</th>
                  <th>Δ Take-home</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ d, calc }) => (
                  <tr key={d.id}>
                    <td>{d.nama}</td>
                    <td>{JABATAN_LABEL[d.jabatan]}</td>
                    <td>{d.jabatan === "Prof" ? "—" : d.pendidikan}</td>
                    <td className="num">{d.tahun_mengabdi} th</td>
                    <td className="num">{fmtRupiah(calc.hbLama)}</td>
                    <td className="num">{fmtRupiah(calc.hbBaru)}</td>
                    <td className="num">{fmtRupiah(calc.takeHomeLama)}</td>
                    <td className="num">{fmtRupiah(calc.takeHomeBaru)}</td>
                    <td className="num good">
                      +{fmtRupiah(calc.deltaTakeHomeRp)} ({(calc.deltaTakeHomePct * 100).toFixed(1)}%)
                    </td>
                    <td>
                      <button className="btn-ghost" onClick={() => handleDelete(d.id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="note">
        <b>Asumsi tetap:</b> 12 kelas × 16 pertemuan / 6 bulan = 32 pertemuan dibayar/bulan pada aturan
        lama; aturan baru 6 pertemuan/minggu × 4 minggu = 24 pertemuan/bulan; tarif & honor homebase lama
        dari SK 001/SK/11/UTR/X/2021. Dosen &gt;3 tahun mengabdi dapat kenaikan persentase penuh; ≤3 tahun
        hanya homebase impas. Premi masa kerja Rp50.000/tahun (maks 20 tahun) adalah usulan, belum ada di SK.
        Tarif mengajar S2 Lektor Kepala diekstrapolasi Rp175.000 karena tidak tercantum di SK.
      </p>
    </div>
  );
}
