"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal login.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: "min(380px,100%)", padding: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Masuk</h1>
        <p style={{ fontSize: 13, color: "#5b6779", marginBottom: 20 }}>
          Dashboard Honor Dosen Tetap — Universitas Tangerang Raya
        </p>
        {error && (
          <div className="error-box" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Memeriksa…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
