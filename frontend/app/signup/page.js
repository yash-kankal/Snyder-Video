"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    channelName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = new FormData();
      body.append("channelName", form.channelName);
      body.append("email", form.email);
      body.append("phone", form.phone);
      body.append("password", form.password);
      if (logoFile) body.append("logoUrl", logoFile);

      await apiRequest("/user/signup", { method: "POST", body, isForm: true });
      router.push("/login");
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
          <div className="auth-visual-copy auth-visual-copy-fun">
            <h2>Create. Publish. Grow.</h2>
            <p>Start your channel and share videos with the world.</p>
          </div>
        </aside>

        <section className="auth-panel">
          <form className="auth-form auth-form-signup" onSubmit={onSubmit}>
            <h2>Create an account</h2>

            <input
              type="text"
              placeholder="Channel name"
              value={form.channelName}
              onChange={(e) => setForm((p) => ({ ...p, channelName: e.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              minLength={6}
              required
            />

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>

            <p className="auth-subtitle auth-subtitle-bottom">
              Already have an account? <Link href="/login">Log in</Link>
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}
