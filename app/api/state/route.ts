import { NextRequest, NextResponse } from "next/server";
import { getAppState, setAppState, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  try {
    const state = await getAppState();
    return NextResponse.json({ data: state });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil status." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Hanya admin yang boleh mengubah status." }, { status: 403 });

  try {
    const body = await req.json();
    const patch: { policyAktif?: boolean; status?: "Draft" | "Approved" } = {};
    if (typeof body.policyAktif === "boolean") patch.policyAktif = body.policyAktif;
    if (body.status === "Draft" || body.status === "Approved") patch.status = body.status;

    const state = await setAppState(patch, session.email);
    await logAudit(session.email, "update_state", null, patch);
    return NextResponse.json({ data: state });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menyimpan status." }, { status: 500 });
  }
}
