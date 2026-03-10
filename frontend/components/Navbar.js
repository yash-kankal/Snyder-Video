"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { clearAuth, getAuth, setAuth } from "@/lib/auth";
import {
  Search,
  Home,
  Clapperboard,
  Upload,
  Library,
  LogOut,
  Camera,
  Palette,
  Users,
  Menu,
  Plus,
  Pencil,
  Music2,
  Cpu,
  Video,
  Mic2,
  Newspaper,
  Compass,
  Sparkles,
  Clock3,
} from "lucide-react";

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMood(value) {
  return String(value || "").trim().toLowerCase();
}

const MOOD_OPTIONS = [
  { value: "happy", label: "Happy" },
  { value: "chill", label: "Chill" },
  { value: "focus", label: "Focus" },
  { value: "energetic", label: "Energetic" },
  { value: "sad", label: "Sad" },
  { value: "romantic", label: "Romantic" },
  { value: "motivational", label: "Motivational" },
];

export default function Navbar({ user, hideSidebar = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [subscriptions, setSubscriptions] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentUser, setCurrentUser] = useState(user || null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState("chill");
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [bgMode, setBgMode] = useState("gradient");
  const [sourceImage, setSourceImage] = useState("");
  const [imageMeta, setImageMeta] = useState(null);
  const [zoom, setZoom] = useState(1.2);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 });
  const sidebarProfileMenuRef = useRef(null);
  const topbarProfileMenuRef = useRef(null);
  const cropSize = 260;
  const bgStorageKey = currentUser?._id ? `snyder_bg_mode_${currentUser._id}` : "snyder_bg_mode_guest";
  const sidebarStorageKey = currentUser?._id
    ? `snyder_sidebar_collapsed_${currentUser._id}`
    : "snyder_sidebar_collapsed_guest";

  useEffect(() => {
    setCurrentUser(user || null);
  }, [user]);

  useEffect(() => {
    const onProfileUpdated = () => {
      const auth = getAuth();
      if (auth?.user) setCurrentUser(auth.user);
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
  }, []);

  const loadSubscriptions = async () => {
    const token = localStorage.getItem("snyder_token") || "";
    if (!token) {
      setSubscriptions([]);
      return;
    }

    try {
      const res = await apiRequest("/user/subscriptions", { token });
      const baseSubs = res.data || [];

      const hydratedSubs = await Promise.all(
        baseSubs.map(async (item) => {
          if (item.logoUrl) return item;
          try {
            const channelRes = await apiRequest(`/video/channel/${item._id}`, { token });
            const channel = channelRes?.channel;
            if (channel?.logoUrl) {
              return { ...item, logoUrl: channel.logoUrl };
            }
          } catch {
            // keep original item if enrichment fails
          }
          return item;
        })
      );

      setSubscriptions(hydratedSubs);
    } catch {
      setSubscriptions([]);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [pathname]);

  useEffect(() => {
    const handler = () => loadSubscriptions();
    window.addEventListener("subscriptions-updated", handler);
    return () => window.removeEventListener("subscriptions-updated", handler);
  }, []);

  useEffect(() => {
    const handler = () => loadSubscriptions();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(sidebarStorageKey);
    setCollapsed(saved === "1");
  }, [sidebarStorageKey]);

  useEffect(() => {
    document.body.classList.remove("sidebar-collapsed");
    if (collapsed && !hideSidebar) {
      document.body.classList.add("sidebar-collapsed");
    }
    document.body.classList.toggle("sidebar-hidden", hideSidebar);
    return () => {
      document.body.classList.remove("sidebar-collapsed");
      document.body.classList.remove("sidebar-hidden");
    };
  }, [collapsed, hideSidebar]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchText(q);
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem(bgStorageKey);
    setBgMode(saved === "dark" ? "dark" : "gradient");
  }, [bgStorageKey]);

  useEffect(() => {
    document.body.classList.toggle("app-bg-dark", bgMode === "dark");
    localStorage.setItem(bgStorageKey, bgMode);
  }, [bgMode, bgStorageKey]);

  useEffect(() => {
    if (!showProfileMenu) return;
    const close = (e) => {
      const inSidebarMenu = sidebarProfileMenuRef.current?.contains(e.target);
      const inTopbarMenu = topbarProfileMenuRef.current?.contains(e.target);
      if (!inSidebarMenu && !inTopbarMenu) setShowProfileMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [showProfileMenu]);

  useEffect(() => {
    let timer = null;
    const onScroll = () => {
      document.body.classList.add("is-scrolling");
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        document.body.classList.remove("is-scrolling");
      }, 550);
    };

    window.addEventListener("scroll", onScroll, true);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll, true);
      document.body.classList.remove("is-scrolling");
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      e.preventDefault();
      const nextX = dragStart.ox + (e.clientX - dragStart.x);
      const nextY = dragStart.oy + (e.clientY - dragStart.y);
      setOffset(clampOffset(nextX, nextY, zoom, imageMeta, cropSize));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragStart, zoom, imageMeta]);

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(sidebarStorageKey, next ? "1" : "0");
  };

  const startLogoUpdate = () => {
    setShowProfileMenu(false);
    setLogoError("");
    setShowLogoModal(true);
  };

  const startNameUpdate = () => {
    setShowProfileMenu(false);
    setNameError("");
    setNameInput(currentUser?.channelName || "");
    setShowNameModal(true);
  };

  const loadSourceImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        setSourceImage(src);
        setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
        setOffset({ x: 0, y: 0 });
        setZoom(1.2);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const imageScale = useMemo(() => {
    if (!imageMeta) return 1;
    const baseScale = Math.max(cropSize / imageMeta.width, cropSize / imageMeta.height);
    return baseScale * zoom;
  }, [imageMeta, zoom]);

  const saveCroppedLogo = async () => {
    if (!sourceImage || !imageMeta) return;
    setUploadingLogo(true);
    setLogoError("");

    try {
      const renderW = imageMeta.width * imageScale;
      const renderH = imageMeta.height * imageScale;
      const left = (cropSize - renderW) / 2 + offset.x;
      const top = (cropSize - renderH) / 2 + offset.y;
      const srcX = -left / imageScale;
      const srcY = -top / imageScale;
      const srcSize = cropSize / imageScale;

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to process image");

      const img = new Image();
      img.src = sourceImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 512, 512);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Failed to generate image");

      const formData = new FormData();
      formData.append("logoUrl", blob, "profile.jpg");

      const token = getAuth().token;
      const endpoints = ["/user/logo", "/user/update-logo", "/user/profile/logo"];
      let res = null;
      let lastErr = null;
      for (const endpoint of endpoints) {
        try {
          res = await apiRequest(endpoint, {
            method: "PUT",
            token,
            body: formData,
            isForm: true,
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!res && lastErr) throw lastErr;

      if (res?.data) {
        setAuth(token, res.data);
        setCurrentUser(res.data);
        window.dispatchEvent(new Event("profile-updated"));
      }

      setShowLogoModal(false);
      setSourceImage("");
      setImageMeta(null);
      setOffset({ x: 0, y: 0 });
      setZoom(1.2);
    } catch (err) {
      const message = String(err.message || "");
      if (message.includes("Route not found")) {
        setLogoError("Profile update route not available. Restart backend server and try again.");
      } else {
        setLogoError(message || "Failed to update profile picture");
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveChannelName = async () => {
    const channelName = nameInput.trim();
    if (!channelName) {
      setNameError("Channel name is required");
      return;
    }
    if (channelName.length < 2 || channelName.length > 60) {
      setNameError("Channel name must be between 2 and 60 characters");
      return;
    }

    setUpdatingName(true);
    setNameError("");

    try {
      const token = getAuth().token;
      const endpoints = ["/user/channel-name", "/user/update-name", "/user/profile/name"];
      let res = null;
      let lastErr = null;

      for (const endpoint of endpoints) {
        try {
          res = await apiRequest(endpoint, {
            method: "PUT",
            token,
            body: { channelName },
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!res && lastErr) throw lastErr;

      if (res?.data) {
        setAuth(token, res.data);
        setCurrentUser(res.data);
        window.dispatchEvent(new Event("profile-updated"));
      }

      setShowNameModal(false);
    } catch (err) {
      const message = String(err.message || "");
      if (message.includes("Route not found")) {
        setNameError("Name update route not available. Restart backend server and try again.");
      } else {
        setNameError(message || "Failed to update channel name");
      }
    } finally {
      setUpdatingName(false);
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const value = searchText.trim();
    if (!value) {
      router.push("/");
      return;
    }
    router.push(`/?q=${encodeURIComponent(value)}`);
  };

  const playMood = async () => {
    setMoodError("");
    setMoodLoading(true);

    try {
      const auth = getAuth();
      if (!auth?.token) {
        router.push("/login");
        return;
      }
      let list = [];
      try {
        const res = await apiRequest(`/video/mood/${selectedMood}`, { token: auth.token });
        const fromData = Array.isArray(res?.data) ? res.data : [];
        const fromQueue = Array.isArray(res?.queue) ? res.queue : [];
        const fromCurrent = res?.current ? [res.current] : [];
        const fromVideos = Array.isArray(res?.videos) ? res.videos : [];

        const merged = [...fromData, ...fromCurrent, ...fromQueue, ...fromVideos];
        const byId = new Map();
        merged.forEach((item) => {
          const id = String(item?._id || "");
          if (!id) return;
          if (!byId.has(id)) byId.set(id, item);
        });
        list = Array.from(byId.values());
      } catch (err) {
        const message = String(err.message || "");
        if (!message.includes("Route not found")) throw err;

        // Fallback for older backend processes: fetch all and filter client-side.
        const allRes = await apiRequest("/video/all-videos", { token: auth.token });
        const allVideos = allRes.data || [];
        const mood = normalizeMood(selectedMood);
        list = allVideos
          .filter((item) => {
            const itemMood = normalizeMood(item?.mood || "");
            if (mood === "chill") return itemMood === "chill" || !itemMood;
            return itemMood === mood;
          })
          .sort((a, b) => {
            const byViews = (b.views || 0) - (a.views || 0);
            if (byViews !== 0) return byViews;
            const byLikes = (b.likes || 0) - (a.likes || 0);
            if (byLikes !== 0) return byLikes;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
      }

      if (!list.length) {
        setMoodError(`No videos available for ${selectedMood} mood`);
        return;
      }

      setShowMoodModal(false);
      router.push(`/video/${list[0]._id}?mood=${encodeURIComponent(selectedMood)}`);
    } catch (err) {
      setMoodError(err.message || "Failed to load mood videos");
    } finally {
      setMoodLoading(false);
    }
  };

  const activeCategory = normalizeCategory(searchParams.get("category") || "");
  const activeSort = String(searchParams.get("sort") || "").toLowerCase();
  const exploreItems = [
    { label: "Music", icon: Music2 },
    { label: "Technology", icon: Cpu },
    { label: "Vlogging", icon: Video },
    { label: "Podcasts", icon: Mic2 },
    { label: "News", icon: Newspaper },
  ];

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="mood-ai-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fe4365" />
            <stop offset="50%" stopColor="#d33d93" />
            <stop offset="100%" stopColor="#8d42ec" />
          </linearGradient>
        </defs>
      </svg>
      {collapsed ? (
        <header className="collapsed-topbar">
          <button className="icon-btn sidebar-menu-btn" aria-label="menu" onClick={toggleSidebar}>
            <Menu size={18} />
          </button>
          <Link className="logo collapsed-logo" href="/">
            Snyder
          </Link>
          <form className="collapsed-search-form" onSubmit={submitSearch}>
            <input
              className="collapsed-search-input"
              placeholder="Search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <button className="collapsed-search-btn" aria-label="search" type="submit">
              <Search size={16} />
            </button>
          </form>
          <button className="mood-ai-btn-nav" type="button" onClick={() => setShowMoodModal(true)}>
            <Sparkles size={14} style={{ stroke: "url(#mood-ai-icon-gradient)" }} />
            <span className="mood-ai-text">MoodAI</span>
          </button>
          <Link className="create-btn collapsed-create-btn" href="/upload">
            <Plus size={16} />
            Create
          </Link>
          <div className="profile-wrap collapsed-profile-wrap" ref={topbarProfileMenuRef}>
            <button
              className="avatar-btn collapsed-avatar-btn"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              aria-label="Open profile menu"
              type="button"
            >
              <div className="avatar collapsed-avatar">
                {currentUser?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.logoUrl} alt={currentUser?.channelName || "User"} />
                ) : (
                  (currentUser?.channelName || "U").slice(0, 1).toUpperCase()
                )}
              </div>
            </button>
            {showProfileMenu && (
              <div className="profile-menu collapsed-profile-menu">
                <button onClick={startNameUpdate}>
                  <Pencil size={16} />
                  Update name
                </button>
                <button onClick={startLogoUpdate}>
                  <Camera size={16} />
                  Change picture
                </button>
                <button onClick={logout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
      ) : (
        <div className="global-search-layer">
          <div className="global-search-inner">
            <form className="global-search-form" onSubmit={submitSearch}>
              <input
                className="global-search-input"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <button className="global-search-btn" aria-label="search" type="submit">
                <Search size={18} />
              </button>
            </form>
            <button className="mood-ai-btn-nav" type="button" onClick={() => setShowMoodModal(true)}>
              <Sparkles size={14} style={{ stroke: "url(#mood-ai-icon-gradient)" }} />
              <span className="mood-ai-text">MoodAI</span>
            </button>
          </div>
        </div>
      )}

      {!hideSidebar && (
        <aside className="yt-sidebar">
          <div className="sidebar-top">
            <div className="sidebar-brand">
              <button className="icon-btn sidebar-menu-btn" aria-label="menu" type="button" onClick={toggleSidebar}>
                <Menu size={18} />
              </button>
              <Link className="logo" href="/">
                Snyder
              </Link>
            </div>

            <div className="yt-divider" />

            <section className="yt-nav-section">
              <h4 className="nav-section-title">
                <Library size={14} />
                Library
              </h4>
              <nav className="yt-nav-group">
                <Link
                  className={pathname === "/" && activeSort !== "recent" ? "active" : ""}
                  href="/"
                >
                  <Home size={16} />
                  Home
                </Link>
                <Link
                  className={pathname === "/" && activeSort === "recent" ? "active" : ""}
                  href="/?sort=recent"
                >
                  <Clock3 size={16} />
                  Recently added
                </Link>
                <Link className={pathname === "/my-videos" ? "active" : ""} href="/my-videos">
                  <Clapperboard size={16} />
                  My Videos
                </Link>
                <Link className={pathname === "/upload" ? "active" : ""} href="/upload">
                  <Upload size={16} />
                  Upload
                </Link>
              </nav>
            </section>

            <div className="yt-divider" />

            <section className="yt-nav-section explore-section">
              <h4 className="subs-title">
                <Compass size={14} />
                Explore
              </h4>
              <div className="yt-nav-list">
                {exploreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === "/" && activeCategory === normalizeCategory(item.label);
                  return (
                    <Link
                      key={item.label}
                      href={`/?category=${encodeURIComponent(item.label)}`}
                      className={`explore-link ${isActive ? "active" : ""}`}
                    >
                      <Icon size={15} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>

            <div className="yt-divider" />

            <section className="yt-nav-section">
              <h4 className="subs-title">
                <Users size={14} />
                Subscriptions
              </h4>
              <div className="yt-nav-list">
                {subscriptions.length > 0 ? (
                  subscriptions.map((item) => (
                  <Link
                    key={item._id}
                    href={`/channel/${item._id}`}
                    className={pathname === `/channel/${item._id}` ? "active" : ""}
                  >
                    {item.channelName}
                  </Link>
                ))
              ) : (
                <span className="yt-empty">No subscriptions yet</span>
              )}
              </div>
            </section>
          </div>

          <div className="sidebar-bottom">
            <div className="bg-toggle-wrap">
              <span className="theme-label">
                <Palette size={14} />
                Theme
              </span>
              <div className="bg-toggle">
                <button
                  className={bgMode === "gradient" ? "active" : ""}
                  onClick={() => setBgMode("gradient")}
                  type="button"
                >
                  Gradient
                </button>
                <button
                  className={bgMode === "dark" ? "active" : ""}
                  onClick={() => setBgMode("dark")}
                  type="button"
                >
                  Dark
                </button>
              </div>
            </div>

            <div className="profile-wrap profile-wrap-sidebar" ref={sidebarProfileMenuRef}>
              <button
                className="profile-summary-btn"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                aria-label="Open profile menu"
              >
                <div className="avatar">
                  {currentUser?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.logoUrl} alt={currentUser?.channelName || "User"} />
                  ) : (
                    (currentUser?.channelName || "U").slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="profile-summary-text">
                  <strong>{currentUser?.channelName || "User"}</strong>
                </div>
              </button>

              {showProfileMenu && (
                <div className="profile-menu">
                  <button onClick={startNameUpdate}>
                    <Pencil size={16} />
                    Update name
                  </button>
                  <button onClick={startLogoUpdate}>
                    <Camera size={16} />
                    Change picture
                  </button>
                  <button onClick={logout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {showLogoModal && (
        <div
          className="profile-modal-backdrop"
          onMouseDown={() => {
            if (!uploadingLogo) setShowLogoModal(false);
          }}
        >
          <div className="profile-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Change profile picture</h3>
            <p className="subtle">Choose image, drag to crop, and save.</p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => loadSourceImage(e.target.files?.[0] || null)}
            />

            <div
              className="crop-stage"
              onMouseDown={(e) => {
                if (!sourceImage || !imageMeta) return;
                e.preventDefault();
                setDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
              }}
            >
              {sourceImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sourceImage}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${imageScale})`,
                  }}
                />
              ) : (
                <span>Select an image to preview</span>
              )}
            </div>

            <label className="crop-zoom">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => {
                  const nextZoom = Number(e.target.value);
                  setZoom(nextZoom);
                  setOffset((prev) => {
                    const next = clampOffset(prev.x, prev.y, nextZoom, imageMeta, cropSize);
                    return next;
                  });
                }}
                disabled={!sourceImage}
              />
            </label>

            {logoError && <p className="error">{logoError}</p>}

            <div className="profile-modal-actions">
              <button
                className="ghost-btn"
                onClick={() => !uploadingLogo && setShowLogoModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={saveCroppedLogo}
                disabled={!sourceImage || uploadingLogo}
                type="button"
              >
                {uploadingLogo ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNameModal && (
        <div
          className="profile-modal-backdrop"
          onMouseDown={() => {
            if (!updatingName) setShowNameModal(false);
          }}
        >
          <div className="profile-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Update channel name</h3>
            <p className="subtle">Use a name between 2 and 60 characters.</p>

            <input
              className="profile-name-input"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter channel name"
              maxLength={60}
            />

            {nameError && <p className="error">{nameError}</p>}

            <div className="profile-modal-actions">
              <button
                className="ghost-btn"
                onClick={() => !updatingName && setShowNameModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="create-btn" onClick={saveChannelName} disabled={updatingName} type="button">
                {updatingName ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoodModal && (
        <div className="profile-modal-backdrop" onMouseDown={() => !moodLoading && setShowMoodModal(false)}>
          <div className="profile-modal mood-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>MoodAI</h3>
            <p className="subtle">Pick a mood and start playing matching videos.</p>

            <label className="mood-modal-field">
              Mood
              <select
                className="mood-modal-select"
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
              >
                {MOOD_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {moodError && <p className="error">{moodError}</p>}

            <div className="profile-modal-actions">
              <button
                className="ghost-btn"
                type="button"
                onClick={() => !moodLoading && setShowMoodModal(false)}
              >
                Cancel
              </button>
              <button className="create-btn" type="button" disabled={moodLoading} onClick={playMood}>
                {moodLoading ? "Loading..." : "Play"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function clampOffset(x, y, zoom, imageMeta, cropSize) {
  if (!imageMeta) return { x: 0, y: 0 };

  const baseScale = Math.max(cropSize / imageMeta.width, cropSize / imageMeta.height);
  const scale = baseScale * zoom;
  const renderW = imageMeta.width * scale;
  const renderH = imageMeta.height * scale;
  const maxX = Math.max(0, (renderW - cropSize) / 2);
  const maxY = Math.max(0, (renderH - cropSize) / 2);

  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  };
}
