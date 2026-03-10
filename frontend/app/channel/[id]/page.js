"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import PageLoader from "@/components/PageLoader";
import { apiRequest } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { ChevronDown, Loader2 } from "lucide-react";

export default function ChannelPage() {
  const router = useRouter();
  const params = useParams();
  const channelId = params?.id;

  const [token, setToken] = useState(() => getAuth().token || "");
  const [user, setUser] = useState(() => getAuth().user || null);
  const [authChecked, setAuthChecked] = useState(false);
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("views");
  const [sortOpen, setSortOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isOwnChannel, setIsOwnChannel] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

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

  useEffect(() => {
    const loadChannelVideos = async () => {
      if (!token || !channelId) return;

      setLoading(true);
      setError("");
      try {
        const res = await apiRequest(`/video/channel/${channelId}`, { token });
        const list = res.data || [];
        setVideos(list);
        setChannel(res.channel || list[0]?.user || null);
      } catch (err) {
        const message = String(err.message || "");

        // Backward compatibility: if backend route is unavailable, fallback to all videos.
        if (message.includes("Route not found")) {
          try {
            const allRes = await apiRequest("/video/all-videos", { token });
            const allVideos = allRes.data || [];
            const filtered = allVideos.filter((video) => {
              const videoUserId =
                typeof video.user === "string" ? video.user : String(video.user?._id || "");
              return videoUserId === String(channelId);
            });
            setVideos(filtered);
            setChannel(filtered[0]?.user || null);

            // If this channel has no videos, use subscriptions data for channel header.
            if (!filtered.length) {
              const subsRes = await apiRequest("/user/subscriptions", { token });
              const sub = (subsRes.data || []).find(
                (item) => String(item._id) === String(channelId)
              );
              setChannel(sub || null);
            }
            return;
          } catch (fallbackErr) {
            setError(fallbackErr.message || "Failed to load channel videos");
            return;
          }
        }

        setError(message || "Failed to load channel videos");
      } finally {
        const own = String(user?._id || "") === String(channelId || "");
        setIsOwnChannel(own);
        if (!own) {
          try {
            const subs = await apiRequest("/user/subscriptions", { token });
            const subList = subs.data || [];
            setIsSubscribed(subList.some((item) => String(item._id) === String(channelId)));
          } catch {
            setIsSubscribed(false);
          }
        } else {
          setIsSubscribed(false);
        }
        setLoading(false);
      }
    };

    loadChannelVideos();
  }, [token, channelId, user?._id]);

  const toggleSubscribe = async () => {
    if (!token || !channelId || isOwnChannel) return;
    setSubLoading(true);
    setError("");

    try {
      const endpoint = isSubscribed ? `/user/unsubscribe/${channelId}` : `/user/subscribe/${channelId}`;
      await apiRequest(endpoint, { method: "PUT", token });
      setIsSubscribed((prev) => !prev);
      setChannel((prev) => {
        if (!prev) return prev;
        const currentCount = Number(prev.subscribers || 0);
        return {
          ...prev,
          subscribers: isSubscribed ? Math.max(0, currentCount - 1) : currentCount + 1,
        };
      });
      window.dispatchEvent(new Event("subscriptions-updated"));
    } catch (err) {
      setError(err.message || "Failed to update subscription");
    } finally {
      setSubLoading(false);
    }
  };

  if (!authChecked || !token) {
    return <PageLoader label="Loading channel..." />;
  }

  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === "views") return (b.views || 0) - (a.views || 0);
    if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const subscriberCount = Number(channel?.subscribers || 0);

  return (
    <main className="page-shell">
      <Navbar user={user} />

      <section className="content-area">
        <section className="channel-hero">
          <div className="channel-hero-avatar">
            {channel?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.logoUrl} alt={channel?.channelName || "Channel"} />
            ) : (
              (channel?.channelName || "C").slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="channel-hero-meta">
            <div className="channel-title-row">
              <h1>{channel?.channelName || "Channel Videos"}</h1>
              {!isOwnChannel && (
                <button
                  className={`subscribe-btn channel-subscribe-btn ${isSubscribed ? "subscribed" : ""}`}
                  onClick={toggleSubscribe}
                  disabled={subLoading}
                >
                  {subLoading ? (
                    <Loader2 size={16} className="spin" />
                  ) : isSubscribed ? (
                    "Subscribed"
                  ) : (
                    "Subscribe"
                  )}
                </button>
              )}
            </div>
            <p>
              {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"} • {videos.length} video
              {videos.length === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        <div className="channel-videos-divider" />

        <div className="chip-toolbar">
          <div className="sort-wrap">
            <button className="sort-btn" onClick={() => setSortOpen((prev) => !prev)}>
              Sort: {sortBy === "views" ? "Trending" : sortBy === "likes" ? "Likes" : "Newest"}
              <ChevronDown size={14} />
            </button>
            {sortOpen && (
              <div className="sort-menu">
                <button
                  className={sortBy === "views" ? "active" : ""}
                  onClick={() => {
                    setSortBy("views");
                    setSortOpen(false);
                  }}
                >
                  Trending
                </button>
                <button
                  className={sortBy === "likes" ? "active" : ""}
                  onClick={() => {
                    setSortBy("likes");
                    setSortOpen(false);
                  }}
                >
                  Likes
                </button>
                <button
                  className={sortBy === "newest" ? "active" : ""}
                  onClick={() => {
                    setSortBy("newest");
                    setSortOpen(false);
                  }}
                >
                  Newest
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && <p>Loading videos...</p>}
        {error && <p className="error">{error}</p>}

        <section className="video-grid">
          {sortedVideos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </section>
        {!loading && !error && sortedVideos.length === 0 && (
          <p className="subtle">No uploaded videos yet for this channel.</p>
        )}
      </section>
    </main>
  );
}
