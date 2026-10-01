import { NextRequest, NextResponse } from "next/server";
import { deleteDosen } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    }
    await deleteDosen(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menghapus data." }, { status: 500 });
  }
}
