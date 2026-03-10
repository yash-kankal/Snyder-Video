"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { getAuth, setAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { token } = getAuth();
    if (token) router.replace("/");
  }, [router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiRequest("/user/login", {
        method: "POST",
        body: { email, password },
      });
      setAuth(res.token, res.user);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-visual">
          <div className="auth-visual-top">
            <h1>Snyder</h1>
          </div>
          <div className="auth-visual-copy">
            <h2>Share Your Story</h2>
            <p>Upload, stream, and connect through videos.</p>
          </div>
        </aside>

        <section className="auth-panel">
          <form className="auth-form auth-form-login" onSubmit={onSubmit}>
            <h2>Welcome back</h2>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>

            <p className="auth-subtitle auth-subtitle-bottom">
              New to Snyder? <Link href="/signup">Create account</Link>
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}
