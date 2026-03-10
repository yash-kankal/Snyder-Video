"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";
import { apiRequest } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

const AUTOPLAY_HISTORY_KEY = "snyder_autoplay_history";
const AUTOPLAY_HISTORY_LIMIT = 6;

function linkifyText(text) {
  const input = String(text || "");
  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = input.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    const isUrl = /^(https?:\/\/|www\.)/i.test(part);
    if (!isUrl) return part;
    const href = part.startsWith("http://") || part.startsWith("https://") ? part : `https://${part}`;
    return (
      <a key={`${href}-${idx}`} href={href} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    );
  });
}

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = params.id;

  const [token, setToken] = useState(() => getAuth().token || "");
  const [user, setUser] = useState(() => getAuth().user || null);
  const [authChecked, setAuthChecked] = useState(false);
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isOwnVideo, setIsOwnVideo] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [recommendSort, setRecommendSort] = useState("all");
  const [recommendPanelHeight, setRecommendPanelHeight] = useState(0);
  const playerElementRef = useRef(null);

  const readAutoplayHistory = () => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem(AUTOPLAY_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
    } catch {
      return [];
    }
  };

  const writeAutoplayHistory = (history) => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        AUTOPLAY_HISTORY_KEY,
        JSON.stringify(history.slice(0, AUTOPLAY_HISTORY_LIMIT))
      );
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const fromQuery = String(searchParams.get("recSort") || "").toLowerCase();
    if (fromQuery === "recent" || fromQuery === "all") {
      setRecommendSort(fromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!videoId) return;
    const current = String(videoId);
    const existing = readAutoplayHistory().filter((id) => id !== current);
    writeAutoplayHistory([current, ...existing]);
  }, [videoId]);

  useEffect(() => {
    const el = playerElementRef.current;
    if (!el) return;

    const updateHeight = () => setRecommendPanelHeight(el.clientHeight || 0);
    updateHeight();

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHeight);
      observer.observe(el);
    }
    window.addEventListener("resize", updateHeight);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [video?._id]);

  useEffect(() => {
    let player = null;

    async function setupPlyr() {
      if (!video?.videoUrl) return;
      const videoEl = document.getElementById("watch-video");
      if (!videoEl) return;

      const { default: Plyr } = await import("plyr");
      player = new Plyr(videoEl, {
        autoplay: true,
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen",
        ],
      });
      player.play().catch(() => null);
      setPlayerReady(true);
    }

    setPlayerReady(false);
    setupPlyr();

    return () => {
      if (player) player.destroy();
    };
  }, [video?.videoUrl]);

  const loadVideo = async (authToken, currentUserId) => {
    try {
      const v = await apiRequest(`/video/${videoId}`, { token: authToken });
      setVideo(v.data);

      const uploaderId = v.data?.user?._id;
      const ownVideo =
        Boolean(currentUserId) && Boolean(uploaderId) && String(currentUserId) === String(uploaderId);
      setIsOwnVideo(ownVideo);

      if (!ownVideo && uploaderId) {
        try {
          const subs = await apiRequest("/user/subscriptions", { token: authToken });
          const subList = subs.data || [];
          setIsSubscribed(subList.some((item) => String(item._id) === String(uploaderId)));
        } catch {
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      setError(err.message);
    }

    try {
      const c = await apiRequest(`/comment/getcomments/${videoId}`, { token: authToken });
      setComments(c.data || []);
    } catch {
      setComments([]);
    }

    try {
      const allVideosResponse = await apiRequest("/video/all-videos", { token: authToken });
      const allVideos = allVideosResponse.data || [];
      setRecommendedVideos(allVideos.filter((item) => String(item._id) !== String(videoId)));
    } catch {
      setRecommendedVideos([]);
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

    apiRequest(`/video/view/${videoId}`, { method: "PUT", token: auth.token })
      .catch(() => null)
      .finally(() => loadVideo(auth.token, auth.user?._id));
  }, [router, videoId]);

  const reactOnVideo = async (type) => {
    try {
      const res = await apiRequest(`/video/${type}/${videoId}`, { method: "PUT", token });
      if (res?.data) {
        setVideo((prev) => {
          if (!prev) return res.data;
          return {
            ...prev,
            ...res.data,
            // keep populated uploader details from previous state
            user: prev.user,
          };
        });
      } else {
        await loadVideo(token, user?._id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await apiRequest(`/comment/new-comment/${videoId}`, {
        method: "PUT",
        token,
        body: { comment: comment.trim() },
      });
      setComment("");
      await loadVideo(token, user?._id);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSubscribe = async () => {
    if (!video?.user?._id) return;
    setSubLoading(true);

    try {
      const endpoint = isSubscribed
        ? `/user/unsubscribe/${video.user._id}`
        : `/user/subscribe/${video.user._id}`;

      await apiRequest(endpoint, { method: "PUT", token });
      await loadVideo(token, user?._id);
      window.dispatchEvent(new Event("subscriptions-updated"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubLoading(false);
    }
  };

  const displayRecommendedVideos = [...recommendedVideos].sort((a, b) => {
    if (recommendSort === "recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return (b.views || 0) - (a.views || 0);
  });

  useEffect(() => {
    const el = playerElementRef.current;
    if (!el || !displayRecommendedVideos.length) return;

    let nextTimer = null;
    const onEnded = () => {
      nextTimer = window.setTimeout(() => {
        const history = readAutoplayHistory();
        const nextVideo =
          displayRecommendedVideos.find((item) => !history.includes(String(item?._id || ""))) ||
          displayRecommendedVideos.find((item) => String(item?._id || "") !== String(videoId)) ||
          displayRecommendedVideos[0];
        if (!nextVideo?._id) return;
        router.push(`/video/${nextVideo._id}?recSort=${encodeURIComponent(recommendSort)}`);
      }, 5000);
    };

    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("ended", onEnded);
      if (nextTimer) window.clearTimeout(nextTimer);
    };
  }, [displayRecommendedVideos, recommendSort, router, videoId]);

  if (!authChecked || !token) {
    return <PageLoader label="Loading video..." />;
  }

  const currentUserId = String(user?._id || "");
  const isLiked =
    Boolean(currentUserId) &&
    Array.isArray(video?.likedBy) &&
    video.likedBy.some((id) => String(id) === currentUserId);
  const isDisliked =
    Boolean(currentUserId) &&
    Array.isArray(video?.dislikedBy) &&
    video.dislikedBy.some((id) => String(id) === currentUserId);

  return (
    <main className="page-shell">
      <Navbar user={user} />

      <section className="watch-page">
        {error && <p className="error">{error}</p>}
        {!video && (
          <div className="inline-loader-wrap inline-loader-wrap-screen">
            <div className="inline-loader" aria-live="polite">
              <span className="inline-loader-orb" aria-hidden="true" />
              <span className="inline-loader-dot inline-loader-dot-1" aria-hidden="true" />
              <span className="inline-loader-dot inline-loader-dot-2" aria-hidden="true" />
              <span className="inline-loader-dot inline-loader-dot-3" aria-hidden="true" />
              <p className="inline-loader-text">Loading video</p>
            </div>
          </div>
        )}

        {video && (
          <div className="watch-grid">
            <section className="watch-main">
              <video
                id="watch-video"
                className="player"
                ref={playerElementRef}
                playsInline
                autoPlay
                controls
                poster={video.thumbnailUrl || undefined}
              >
                <source src={video.videoUrl} type="video/mp4" />
              </video>
              {!playerReady && (
                <div className="inline-loader-wrap inline-loader-wrap-player">
                  <div className="inline-loader inline-loader-player" aria-live="polite">
                    <span className="inline-loader-orb" aria-hidden="true" />
                    <span className="inline-loader-dot inline-loader-dot-1" aria-hidden="true" />
                    <span className="inline-loader-dot inline-loader-dot-2" aria-hidden="true" />
                    <span className="inline-loader-dot inline-loader-dot-3" aria-hidden="true" />
                    <p className="inline-loader-text">Loading player</p>
                  </div>
                </div>
              )}

              <h1>{video.title}</h1>
              <div className="uploader-row">
                <div className="uploader-main">
                  <Link href={`/channel/${video.user?._id}`} className="channel-link-inline">
                    <span className="uploader-avatar">
                      {video.user?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.user.logoUrl} alt={video.user?.channelName || "Channel"} />
                      ) : (
                        (video.user?.channelName || "C").slice(0, 1).toUpperCase()
                      )}
                    </span>
                  </Link>
                  <Link href={`/channel/${video.user?._id}`} className="uploader-name channel-link-inline">
                    {video.user?.channelName || "Channel"}
                  </Link>
                  {!isOwnVideo && (
                    <button
                      className={`subscribe-btn ${isSubscribed ? "subscribed" : ""}`}
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

              <div className="action-row action-row-inline">
                  <span className="views-pill">{video.views || 0} views</span>
                  <button
                    className={`action-pill ${isLiked ? "liked" : ""}`}
                    onClick={() => reactOnVideo("like")}
                  >
                    <ThumbsUp size={16} /> {video?.likes || 0}
                  </button>
                  <button
                    className={`action-pill ${isDisliked ? "disliked" : ""}`}
                    onClick={() => reactOnVideo("dislike")}
                  >
                    <ThumbsDown size={16} /> {video?.dislikes || 0}
                  </button>
                </div>
              </div>

              <section className="video-description">
                <p className="video-description-meta">
                  Date uploaded:{" "}
                  {new Date(video.createdAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p>
                  {video.description?.trim()
                    ? linkifyText(video.description)
                    : "No description provided."}
                </p>
              </section>

              <section className="comments-wrap">
                <h2>Comments</h2>
                <form className="comment-form" onSubmit={addComment}>
                  <input
                    type="text"
                    placeholder="Write a comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button type="submit">Post</button>
                </form>

                <div className="comment-list">
                  {comments.map((item) => {
                    const isOwnComment =
                      Boolean(user?._id) && String(item.userId || "") === String(user._id);
                    const commentLogo = item.logoUrl || (isOwnComment ? user?.logoUrl : "");
                    const commenterChannelId = String(item.userId || "");

                    return (
                    <article className="comment" key={item._id}>
                      <div className="comment-head">
                        {commenterChannelId ? (
                          <Link href={`/channel/${commenterChannelId}`} className="comment-avatar">
                            {commentLogo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={commentLogo} alt={item.channelName || "User"} />
                            ) : (
                              (item.channelName || "U").slice(0, 1).toUpperCase()
                            )}
                          </Link>
                        ) : (
                          <span className="comment-avatar">
                            {commentLogo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={commentLogo} alt={item.channelName || "User"} />
                            ) : (
                              (item.channelName || "U").slice(0, 1).toUpperCase()
                            )}
                          </span>
                        )}

                        <div className="comment-main">
                          <div className="comment-author-wrap">
                            {commenterChannelId ? (
                              <Link href={`/channel/${commenterChannelId}`} className="comment-author">
                                {item.channelName || "User"}
                              </Link>
                            ) : (
                              <p className="comment-author">{item.channelName || "User"}</p>
                            )}
                            <small className="comment-time">{new Date(item.createdAt).toLocaleString()}</small>
                          </div>
                          <p className="comment-text">{item.comment}</p>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            </section>

            <aside
              className="watch-sidebar"
              style={recommendPanelHeight > 0 ? { height: `${recommendPanelHeight}px` } : undefined}
            >
              <div className="watch-chips">
                <button
                  className={`chip ${recommendSort === "all" ? "active" : ""}`}
                  type="button"
                  onClick={() => setRecommendSort("all")}
                >
                  All
                </button>
                <button
                  className={`chip ${recommendSort === "recent" ? "active" : ""}`}
                  type="button"
                  onClick={() => setRecommendSort("recent")}
                >
                  Recently uploaded
                </button>
              </div>

              <div className="recommend-list">
                {displayRecommendedVideos.length > 0 ? (
                  displayRecommendedVideos.map((item) => (
                    <Link
                      key={item._id}
                      href={`/video/${item._id}?recSort=${encodeURIComponent(recommendSort)}`}
                      className="recommend-item"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnailUrl || "https://placehold.co/240x135/242424/8a8a8a?text=Video"}
                        alt={item.title}
                      />
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.user?.channelName || "Channel"}</p>
                        <p>{item.views || 0} views</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="subtle">No other uploaded videos yet.</p>
                )}
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
