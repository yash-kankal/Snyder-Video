"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import PageLoader from "@/components/PageLoader";
import { apiRequest } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { ChevronDown } from "lucide-react";

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(() => getAuth().token || "");
  const [user, setUser] = useState(() => getAuth().user || null);
  const [authChecked, setAuthChecked] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("views");
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVideos = async (authToken, searchQuery = "") => {
    try {
      setError("");
      const query = searchQuery.trim();
      if (!query) {
        const res = await apiRequest("/video/all-videos", { token: authToken });
        setVideos(res.data || []);
        return;
      }

      const encoded = encodeURIComponent(query);
      const searchEndpoints = [`/video/search/title?q=${encoded}`, `/video/search?q=${encoded}`];
      let lastError = null;

      for (const endpoint of searchEndpoints) {
        try {
          const res = await apiRequest(endpoint, { token: authToken });
          setVideos(res.data || []);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      // Fallback for stale backend processes: fetch all and filter client-side.
      if (
        lastError &&
        (String(lastError.message).includes("Route not found") ||
          String(lastError.message).includes("Invalid ID format"))
      ) {
        const allRes = await apiRequest("/video/all-videos", { token: authToken });
        const filtered = (allRes.data || []).filter((video) =>
          String(video?.title || "").toLowerCase().includes(query.toLowerCase())
        );
        setVideos(filtered);
        return;
      }

      throw lastError || new Error("Search failed");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    const q = searchParams.get("q") || "";
    const categoryQuery = normalizeCategory(searchParams.get("category") || "");
    const sortQuery = String(searchParams.get("sort") || "").toLowerCase();
    setSelectedCategory(categoryQuery || "all");
    setSortBy(sortQuery === "recent" ? "newest" : "views");
    loadVideos(auth.token, q);
    return;
  }, [router, searchParams]);

  if (!authChecked) {
    return <PageLoader label="Loading home..." />;
  }

  if (!token) {
    return <PageLoader label="Redirecting to login..." />;
  }

  const filteredVideos =
    selectedCategory === "all"
      ? videos
      : videos.filter(
          (video) => normalizeCategory(video.category) === selectedCategory
        );

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === "views") return (b.views || 0) - (a.views || 0);
    if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const isRecentView = String(searchParams.get("sort") || "").toLowerCase() === "recent";
  const sortLabel = sortBy === "views" ? "Trending" : sortBy === "likes" ? "Likes" : "Recently added";

  return (
    <main className="page-shell">
      <Navbar user={user} />

      <section className="content-area">
        <div className="chip-toolbar">
          <div className="sort-wrap">
            <button className="sort-btn" onClick={() => setSortOpen((prev) => !prev)}>
              Sort: {sortLabel}
              <ChevronDown size={14} />
            </button>
            {sortOpen && (
              <div className="sort-menu">
                {!isRecentView && (
                  <button
                    className={sortBy === "views" ? "active" : ""}
                    onClick={() => {
                      setSortBy("views");
                      setSortOpen(false);
                    }}
                  >
                    Trending
                  </button>
                )}
                {isRecentView && (
                  <button
                    className={sortBy === "newest" ? "active" : ""}
                    onClick={() => {
                      setSortBy("newest");
                      setSortOpen(false);
                    }}
                  >
                    Recently added
                  </button>
                )}
                <button
                  className={sortBy === "likes" ? "active" : ""}
                  onClick={() => {
                    setSortBy("likes");
                    setSortOpen(false);
                  }}
                >
                  Likes
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="inline-loader" aria-live="polite">
            <span className="inline-loader-orb" aria-hidden="true" />
            <span className="inline-loader-dot inline-loader-dot-1" aria-hidden="true" />
            <span className="inline-loader-dot inline-loader-dot-2" aria-hidden="true" />
            <span className="inline-loader-dot inline-loader-dot-3" aria-hidden="true" />
            <p className="inline-loader-text">Loading videos</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}

        <section className="video-grid">
          {sortedVideos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </section>
        {!loading && !error && sortedVideos.length === 0 && (
          <p className="subtle">No videos in this category yet.</p>
        )}
      </section>
    </main>
  );
}
