"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import UploadPanel from "@/components/UploadPanel";
import PageLoader from "@/components/PageLoader";
import { getAuth } from "@/lib/auth";

export default function UploadPage() {
  const router = useRouter();
  const [token, setToken] = useState(() => getAuth().token || "");
  const [user, setUser] = useState(() => getAuth().user || null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth.token) {
      setAuthChecked(true);
      router.replace("/login");
      const fallback = window.setTimeout(() => {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 220);
      return () => window.clearTimeout(fallback);
    }
    setToken(auth.token);
    setUser(auth.user);
    setAuthChecked(true);
  }, [router]);

  if (!authChecked || !token) {
    return <PageLoader label="Loading upload studio..." />;
  }

  return (
    <main className="page-shell">
      <Navbar user={user} />

      <section className="content-area upload-page">
        <section className="upload-shell">
          <section className="upload-intro">
            <h1>Upload New Video</h1>
            <p>Publish your content with a clean title, category, tags, and thumbnail.</p>
          </section>

          <UploadPanel
            token={token}
            onUploaded={() => setRefreshKey((v) => v + 1)}
            key={refreshKey}
          />
        </section>
      </section>
    </main>
  );
}
