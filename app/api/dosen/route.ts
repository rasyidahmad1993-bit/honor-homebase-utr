import { NextRequest, NextResponse } from "next/server";
import { createDosen, listDosen } from "@/lib/db";
import { Jabatan, Pendidikan } from "@/lib/calc";

const JABATAN_VALUES: Jabatan[] = ["TP", "AA", "Lektor", "LK", "Prof"];
const PENDIDIKAN_VALUES: Pendidikan[] = ["S2", "S3"];

export async function GET() {
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
  try {
    const body = await req.json();
    const nama = String(body.nama ?? "").trim();
    const pendidikan = body.pendidikan as Pendidikan;
    const jabatan = body.jabatan as Jabatan;
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
    if (!Number.isFinite(tahunMengabdi) || tahunMengabdi < 0 || tahunMengabdi > 60) {
      return NextResponse.json({ error: "Lama mengabdi tidak valid." }, { status: 400 });
    }

    const row = await createDosen({
      nama,
      pendidikan: jabatan === "Prof" ? "S3" : pendidikan,
      jabatan,
      tahunMengabdi,
    });
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menyimpan data." }, { status: 500 });
  }
}
