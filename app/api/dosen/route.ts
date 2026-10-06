import { NextRequest, NextResponse } from "next/server";
import { createDosen, listDosen, logAudit } from "@/lib/db";
import { Jabatan, Pendidikan, Tingkatan } from "@/lib/calc";
import { getSession } from "@/lib/auth";

const JABATAN_VALUES: Jabatan[] = ["TP", "AA", "Lektor", "LK", "Prof"];
const PENDIDIKAN_VALUES: Pendidikan[] = ["S2", "S3"];
const TINGKATAN_VALUES: Tingkatan[] = ["Pimpinan", "Staff", "Dosen", "DosenTidakTetap"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  try {
    const data = await listDosen();
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal mengambil data. Pastikan database sudah terhubung (lihat README)." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Hanya admin yang boleh menambah data." }, { status: 403 });

  try {
    const body = await req.json();
    const nama = String(body.nama ?? "").trim();
    const pendidikan = body.pendidikan as Pendidikan;
    const jabatan = body.jabatan as Jabatan;
    const tingkatan = body.tingkatan as Tingkatan;
    const tahunMengabdi = Number(body.tahunMengabdi);

    if (!nama) {
      return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    }
    if (jabatan !== "Prof" && !PENDIDIKAN_VALUES.includes(pendidikan)) {
      return NextResponse.json({ error: "Pendidikan tidak valid." }, { status: 400 });
    }
    if (!JABATAN_VALUES.includes(jabatan)) {
      return NextResponse.json({ error: "Jabatan fungsional tidak valid." }, { status: 400 });
    }
    if (!TINGKATAN_VALUES.includes(tingkatan)) {
      return NextResponse.json({ error: "Tingkatan tidak valid." }, { status: 400 });
    }
    if (!Number.isFinite(tahunMengabdi) || tahunMengabdi < 0 || tahunMengabdi > 60) {
      return NextResponse.json({ error: "Lama mengabdi tidak valid." }, { status: 400 });
    }

    const row = await createDosen({
      nama,
      pendidikan: jabatan === "Prof" ? "S3" : pendidikan,
      jabatan,
      tingkatan,
      tahunMengabdi,
      jabatanStruktural: tingkatan === "Pimpinan" ? String(body.jabatanStruktural ?? "") : null,
      unitKerja: tingkatan === "Staff" ? String(body.unitKerja ?? "") : null,
      hariHadir: tingkatan === "Staff" ? Number(body.hariHadir ?? 20) : null,
      jumlahKelas: tingkatan === "Dosen" || tingkatan === "DosenTidakTetap" ? Number(body.jumlahKelas ?? 6) : null,
    });

    await logAudit(session.email, "create_dosen", row.id, { nama: row.nama });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menyimpan data." }, { status: 500 });
  }
}
