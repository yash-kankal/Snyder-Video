"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";
import { apiRequest } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { MoreVertical, Trash2, Pencil } from "lucide-react";

const CATEGORY_OPTIONS = [
  "Music",
  "Technology",
  "Vlogging",
  "Gaming",
  "Fashion",
  "Podcasts",
  "News",
  "Sports",
];

const MOOD_OPTIONS = [
  { value: "happy", label: "Happy" },
  { value: "chill", label: "Chill" },
  { value: "focus", label: "Focus" },
  { value: "energetic", label: "Energetic" },
  { value: "sad", label: "Sad" },
  { value: "romantic", label: "Romantic" },
  { value: "motivational", label: "Motivational" },
];

export default function MyVideosPage() {
  const router = useRouter();
  const [token, setToken] = useState(() => getAuth().token || "");
  const [user, setUser] = useState(() => getAuth().user || null);
  const [authChecked, setAuthChecked] = useState(false);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [openMenuVideoId, setOpenMenuVideoId] = useState("");
  const [confirmDeleteVideo, setConfirmDeleteVideo] = useState(null);
  const [deletingVideoId, setDeletingVideoId] = useState("");
  const [editingVideo, setEditingVideo] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    mood: "chill",
    tags: "",
  });

  const loadVideos = async (authToken) => {
    try {
      setError("");
      const res = await apiRequest("/video/my-videos", { token: authToken });
      setVideos(res.data || []);
    } catch (err) {
      setError(err.message);
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
    loadVideos(auth.token);
  }, [router]);

  useEffect(() => {
    const closeMenu = () => setOpenMenuVideoId("");
    window.addEventListener("scroll", closeMenu, true);
    return () => window.removeEventListener("scroll", closeMenu, true);
  }, []);

  useEffect(() => {
    const handleClick = () => setOpenMenuVideoId("");
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const requestDelete = (video) => {
    setOpenMenuVideoId("");
    setConfirmDeleteVideo(video);
  };

  const requestEdit = (video) => {
    setOpenMenuVideoId("");
    setEditForm({
      title: video.title || "",
      description: video.description || "",
      category: video.category || "",
      mood: video.mood || "chill",
      tags: Array.isArray(video.tags) ? video.tags.join(", ") : String(video.tags || ""),
    });
    setEditingVideo(video);
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditingVideo(null);
  };

  const closeDeleteModal = () => {
    if (deletingVideoId) return;
    setConfirmDeleteVideo(null);
  };

  const deleteVideo = async () => {
    if (!confirmDeleteVideo) return;

    setError("");
    setDeletingVideoId(confirmDeleteVideo._id);
    try {
      try {
        await apiRequest(`/video/delete/${confirmDeleteVideo._id}`, {
          method: "DELETE",
          token,
        });
      } catch {
        await apiRequest(`/video/${confirmDeleteVideo._id}`, {
          method: "DELETE",
          token,
        });
      }

      setVideos((prev) => prev.filter((item) => item._id !== confirmDeleteVideo._id));
      setConfirmDeleteVideo(null);
    } catch (err) {
      setError(err.message || "Failed to delete video");
    } finally {
      setDeletingVideoId("");
    }
  };

  const saveEditDetails = async (e) => {
    e.preventDefault();
    if (!editingVideo?._id) return;

    const title = editForm.title.trim();
    if (!title) {
      setError("Title is required");
      return;
    }

    setError("");
    setSavingEdit(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", editForm.description.trim());
      fd.append("category", editForm.category);
      fd.append("mood", String(editForm.mood || "").trim().toLowerCase());
      fd.append("tags", editForm.tags);

      await apiRequest(`/video/${editingVideo._id}`, {
        method: "PUT",
        token,
        body: fd,
        isForm: true,
      });

      // Always reload from server so edit state reflects persisted DB values.
      await loadVideos(token);
      setEditingVideo(null);
    } catch (err) {
      setError(err.message || "Failed to update video");
    } finally {
      setSavingEdit(false);
    }
  };

  if (!authChecked || !token) {
    return <PageLoader label="Loading your videos..." />;
  }

  return (
    <main className="page-shell">
      <Navbar user={user} />

      <section className="content-area">
        <section className="section-head">
          <h1>My Videos</h1>
          <p>Everything published by your channel.</p>
        </section>

        {error && <p className="error">{error}</p>}

        <section className="video-grid">
          {videos.map((video) => {
            const thumb =
              video.thumbnailUrl || "https://placehold.co/640x360/222733/8ea3c7?text=Snyder";
            const isMenuOpen = openMenuVideoId === video._id;

            return (
              <article key={video._id} className="video-card my-video-card">
                <Link href={`/video/${video._id}`} className="video-thumb-link">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt={video.title} />
                </Link>

                <div className="video-content my-video-content">
                  <div className="video-avatar">
                    {video.user?.logoUrl || user?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.user?.logoUrl || user?.logoUrl}
                        alt={video.user?.channelName || user?.channelName || "Channel"}
                      />
                    ) : (
                      (video.user?.channelName || user?.channelName || "C").slice(0, 1)
                    )}
                  </div>
                  <div className="video-meta">
                    <div className="my-video-title-row">
                      <h3 title={video.title}>{video.title}</h3>
                      <div className="my-video-menu-wrap">
                        <button
                          className="my-video-menu-btn"
                          aria-label="Video actions"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuVideoId(isMenuOpen ? "" : video._id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                          <div
                            className="my-video-menu-popover"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                requestEdit(video);
                              }}
                            >
                              <Pencil size={15} />
                              Edit details
                            </button>
                            <button
                              className="danger"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                requestDelete(video);
                              }}
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p>{video.user?.channelName || user?.channelName || "Channel"}</p>
                    <p>
                      {video.views || 0} views • {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
        {!videos.length && !error && <p className="subtle">No videos uploaded yet.</p>}
      </section>

      {confirmDeleteVideo && (
        <div className="confirm-backdrop" onClick={closeDeleteModal}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete video?</h3>
            <p>
              This will permanently remove <strong>{confirmDeleteVideo.title}</strong>.
            </p>
            <div className="confirm-actions">
              <button onClick={closeDeleteModal} disabled={Boolean(deletingVideoId)}>
                Cancel
              </button>
              <button
                className="danger"
                onClick={deleteVideo}
                disabled={Boolean(deletingVideoId)}
              >
                {deletingVideoId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingVideo && (
        <div className="confirm-backdrop" onClick={closeEditModal}>
          <div className="confirm-dialog edit-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Edit details</h3>
            <p>Update your video details and save changes.</p>

            <form className="edit-video-form" onSubmit={saveEditDetails}>
              <label>
                Title
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </label>

              <label>
                Category
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Mood
                <select
                  value={editForm.mood}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, mood: e.target.value }))}
                  required
                >
                  {MOOD_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tags
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="Comma separated"
                />
              </label>

              <div className="confirm-actions">
                <button type="button" onClick={closeEditModal} disabled={savingEdit}>
                  Cancel
                </button>
                <button type="submit" className="danger" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
