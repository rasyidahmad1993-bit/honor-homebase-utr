import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const user = await getUserByEmail(String(email));
    if (!user) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    const valid = await verifyPassword(String(password), user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    const token = await createSessionToken({ email: user.email, role: user.role });
    const res = NextResponse.json({ ok: true, user: { email: user.email, role: user.role } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal login. Pastikan database & AUTH_SECRET sudah dikonfigurasi." }, { status: 500 });
  }
}
