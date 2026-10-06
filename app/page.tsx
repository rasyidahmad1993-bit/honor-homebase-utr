"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Jabatan,
  JABATAN_LABEL,
  Pendidikan,
  Tingkatan,
  TINGKATAN_LABEL,
  PERTEMUAN_PER_MINGGU,
  fmtRupiah,
  hitungHonorHomebase,
} from "@/lib/calc";

interface Dosen {
  id: number;
  nama: string;
  pendidikan: Pendidikan;
  jabatan: Jabatan;
  tingkatan: Tingkatan;
  tahun_mengabdi: number;
  jabatan_struktural: string | null;
  unit_kerja: string | null;
  hari_hadir: number | null;
  jumlah_kelas: number | null;
  created_at: string;
}

interface AppState {
  policy_aktif: boolean;
  status: "Draft" | "Approved";
  updated_by: string | null;
  updated_at: string;
}

interface SessionUser {
  email: string;
  role: "admin" | "viewer";
}

const KENAIKAN_OPTIONS = [0, 0.02, 0.03, 0.05, 0.08];
const JABATAN_STRUKTURAL_OPTIONS = [
  "Rektor", "Wakil Rektor", "Dekan", "Ka. Prodi", "Sekretaris Prodi", "Kabag A / Kepala Unit", "Kabag B",
];
const UNIT_KERJA_OPTIONS = [
  "Staff Akademik", "Staff Keuangan", "Staff HRD", "Staff LPPM", "Staff SPMI", "Staff Perpustakaan", "Staff PMB",
];

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined); // undefined = belum dicek
  const [list, setList] = useState<Dosen[]>([]);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [kenaikan, setKenaikan] = useState(0.03);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [nama, setNama] = useState("");
  const [pendidikan, setPendidikan] = useState<Pendidikan>("S2");
  const [jabatan, setJabatan] = useState<Jabatan>("AA");
  const [tingkatan, setTingkatan] = useState<Tingkatan>("Dosen");
  const [tahun, setTahun] = useState(5);
  const [jabatanStruktural, setJabatanStruktural] = useState(JABATAN_STRUKTURAL_OPTIONS[0]);
  const [unitKerja, setUnitKerja] = useState(UNIT_KERJA_OPTIONS[0]);
  const [hariHadir, setHariHadir] = useState(20);
  const [jumlahKelas, setJumlahKelas] = useState(6);

  const isAdmin = user?.role === "admin";

  async function loadUser() {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const json = await res.json();
    setUser(json.user);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [dosenRes, stateRes] = await Promise.all([
        fetch("/api/dosen", { cache: "no-store" }),
        fetch("/api/state", { cache: "no-store" }),
      ]);
      const dosenJson = await dosenRes.json();
      if (!dosenRes.ok) throw new Error(dosenJson.error || "Gagal memuat data.");
      setList(dosenJson.data);

      const stateJson = await stateRes.json();
      if (stateRes.ok) setAppState(stateJson.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
    loadAll();
  }, []);

  function resetForm() {
    setEditingId(null);
    setNama("");
    setTahun(5);
    setPendidikan("S2");
    setJabatan("AA");
    setTingkatan("Dosen");
    setJabatanStruktural(JABATAN_STRUKTURAL_OPTIONS[0]);
    setUnitKerja(UNIT_KERJA_OPTIONS[0]);
    setHariHadir(20);
    setJumlahKelas(6);
  }

  function startEdit(d: Dosen) {
    setEditingId(d.id);
    setNama(d.nama);
    setPendidikan(d.pendidikan);
    setJabatan(d.jabatan);
    setTingkatan(d.tingkatan);
    setTahun(d.tahun_mengabdi);
    setJabatanStruktural(d.jabatan_struktural || JABATAN_STRUKTURAL_OPTIONS[0]);
    setUnitKerja(d.unit_kerja || UNIT_KERJA_OPTIONS[0]);
    setHariHadir(d.hari_hadir ?? 20);
    setJumlahKelas(d.jumlah_kelas ?? 6);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        nama,
        pendidikan,
        jabatan,
        tingkatan,
        tahunMengabdi: tahun,
        jabatanStruktural,
        unitKerja,
        hariHadir,
        jumlahKelas,
      };
      const res = await fetch(editingId ? `/api/dosen/${editingId}` : "/api/dosen", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan.");
      resetForm();
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (deletingId == null) return;
    try {
      const res = await fetch(`/api/dosen/${deletingId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal menghapus.");
      setList((prev) => prev.filter((d) => d.id !== deletingId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleStatus() {
    if (!appState || !isAdmin) return;
    const nextStatus = appState.status === "Draft" ? "Approved" : "Draft";
    const res = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (res.ok) setAppState(json.data);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const rows = useMemo(
    () =>
      list.map((d) => ({
        d,
        calc: hitungHonorHomebase({
          pendidikan: d.pendidikan,
          jabatan: d.jabatan,
          tingkatan: d.tingkatan,
          tahunMengabdi: d.tahun_mengabdi,
          targetKenaikan: kenaikan,
        }),
      })),
    [list, kenaikan]
  );

  if (user === undefined) {
    return <div className="wrap"><p className="empty">Memuat…</p></div>;
  }

  return (
    <div className="wrap">
      <div className="toolbar" style={{ marginBottom: -4 }}>
        <div>
          <h1>Penentuan Honor Dosen Tetap</h1>
          <p className="sub">
            Database dosen & kalkulator honor homebase semester depan. Kuota pertemuan yang
            dibayar/bulan ditentukan oleh <b>Tingkatan</b> (Pimpinan 6/minggu, Staff/Dosen/
            Dosen Tidak Tetap 4/minggu); tarif &amp; honor homebase lama ditentukan oleh{" "}
            <b>Jabatan Fungsional</b>.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {appState && (
            <span
              className={`pill ${appState.status === "Draft" ? "pill-draft" : "pill-approved"}`}
              style={{ cursor: isAdmin ? "pointer" : "default" }}
              title={isAdmin ? "Klik untuk ubah status" : undefined}
              onClick={toggleStatus}
            >
              {appState.status === "Draft" ? "Draft" : "Approved"}
            </span>
          )}
          {user && (
            <span style={{ fontSize: 13, color: "#5b6779" }}>
              {user.email} · <b>{user.role === "admin" ? "Admin" : "Viewer"}</b>
            </span>
          )}
          <button className="btn-ghost" onClick={handleLogout}>Keluar</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {isAdmin && (
        <section className="card">
          <form onSubmit={handleSubmit} className="grid-form">
            <div>
              <label htmlFor="nama">Nama dosen</label>
              <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" required />
            </div>
            <div>
              <label htmlFor="tingkatan">Tingkatan</label>
              <select id="tingkatan" value={tingkatan} onChange={(e) => setTingkatan(e.target.value as Tingkatan)}>
                {(Object.keys(TINGKATAN_LABEL) as Tingkatan[]).map((t) => (
                  <option key={t} value={t}>
                    {TINGKATAN_LABEL[t]} ({PERTEMUAN_PER_MINGGU[t]} pert./minggu)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="jabatan">Jabatan fungsional</label>
              <select id="jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value as Jabatan)}>
                {(Object.keys(JABATAN_LABEL) as Jabatan[]).map((j) => (
                  <option key={j} value={j}>{JABATAN_LABEL[j]}</option>
                ))}
              </select>
            </div>
            {jabatan !== "Prof" && (
              <div>
                <label htmlFor="pendidikan">Pendidikan</label>
                <select id="pendidikan" value={pendidikan} onChange={(e) => setPendidikan(e.target.value as Pendidikan)}>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="tahun">Lama mengabdi (tahun)</label>
              <input id="tahun" type="number" min={0} max={60} value={tahun} onChange={(e) => setTahun(Number(e.target.value))} required />
            </div>

            {tingkatan === "Pimpinan" && (
              <div>
                <label htmlFor="jabstruk">Jabatan struktural</label>
                <select id="jabstruk" value={jabatanStruktural} onChange={(e) => setJabatanStruktural(e.target.value)}>
                  {JABATAN_STRUKTURAL_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            )}
            {tingkatan === "Staff" && (
              <>
                <div>
                  <label htmlFor="unitkerja">Unit kerja</label>
                  <select id="unitkerja" value={unitKerja} onChange={(e) => setUnitKerja(e.target.value)}>
                    {UNIT_KERJA_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="harihadir">Hari hadir / bulan</label>
                  <input id="harihadir" type="number" min={0} max={26} value={hariHadir} onChange={(e) => setHariHadir(Number(e.target.value))} />
                </div>
              </>
            )}
            {(tingkatan === "Dosen" || tingkatan === "DosenTidakTetap") && (
              <div>
                <label htmlFor="kelas">Jumlah kelas / semester</label>
                <input id="kelas" type="number" min={0} max={20} value={jumlahKelas} onChange={(e) => setJumlahKelas(Number(e.target.value))} />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Tambah dosen"}
              </button>
              {editingId && (
                <button type="button" className="btn-ghost" onClick={resetForm}>Batal</button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="toolbar">
          <strong>Daftar dosen & simulasi honor homebase</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="kenaikan" style={{ margin: 0 }}>Target kenaikan (&gt;3 th)</label>
            <select id="kenaikan" value={kenaikan} onChange={(e) => setKenaikan(Number(e.target.value))} style={{ width: "auto" }}>
              {KENAIKAN_OPTIONS.map((g) => (
                <option key={g} value={g}>{(g * 100).toFixed(0)}%</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="empty">Memuat data…</p>
        ) : rows.length === 0 ? (
          <p className="empty">Belum ada dosen. {isAdmin ? "Tambahkan lewat form di atas." : "Hubungi admin SDM untuk menambahkan data."}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th><th>Tingkatan</th><th>Jabatan / Unit</th><th>Jafung</th><th>Pend.</th>
                  <th>Masa kerja</th><th>Kuota baru/bln</th><th>Homebase lama</th><th>Homebase baru</th>
                  <th>Take-home lama</th><th>Take-home baru</th><th>Δ Take-home</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ d, calc }) => (
                  <tr key={d.id}>
                    <td>{d.nama}</td>
                    <td>{TINGKATAN_LABEL[d.tingkatan]}</td>
                    <td>
                      {d.tingkatan === "Pimpinan" ? d.jabatan_struktural
                        : d.tingkatan === "Staff" ? d.unit_kerja
                        : "—"}
                    </td>
                    <td>{JABATAN_LABEL[d.jabatan]}</td>
                    <td>{d.jabatan === "Prof" ? "—" : d.pendidikan}</td>
                    <td className="num">{d.tahun_mengabdi} th</td>
                    <td className="num">{calc.mBaru} pert.</td>
                    <td className="num">{fmtRupiah(calc.hbLama)}</td>
                    <td className="num">{fmtRupiah(calc.hbBaru)}</td>
                    <td className="num">{fmtRupiah(calc.takeHomeLama)}</td>
                    <td className="num">{fmtRupiah(calc.takeHomeBaru)}</td>
                    <td className="num good">
                      {calc.deltaTakeHomeRp >= 0 ? "+" : ""}{fmtRupiah(calc.deltaTakeHomeRp)} ({(calc.deltaTakeHomePct * 100).toFixed(1)}%)
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn-ghost" onClick={() => startEdit(d)}>Edit</button>
                          <button className="btn-ghost" style={{ color: "#b42318" }} onClick={() => setDeletingId(d.id)}>Hapus</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="note">
        <b>Asumsi tetap:</b> 12 kelas × 16 pertemuan / 6 bulan = 32 pertemuan/bulan pada aturan
        lama (baseline sama untuk semua tingkatan). Aturan baru: kuota pertemuan/bulan yang
        dibayar dikunci per <b>Tingkatan</b>. Tarif &amp; honor homebase lama dari SK
        001/SK/11/UTR/X/2021. Premi masa kerja Rp50.000/tahun (maks 20 tahun) adalah usulan,
        belum ada di SK. Tarif mengajar S2 Lektor Kepala diekstrapolasi karena tidak tercantum di SK.
      </p>

      {deletingId !== null && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(10,20,36,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
          onClick={() => setDeletingId(null)}
        >
          <div className="card" style={{ width: "min(380px,100%)", padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Hapus data dosen?</h3>
            <p style={{ color: "#5b6779", fontSize: 14 }}>Tindakan ini tidak dapat dibatalkan.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeletingId(null)}>Batal</button>
              <button className="btn-primary" style={{ flex: 1, background: "#b42318" }} onClick={confirmDelete}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
