"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { Clapperboard, ImageIcon, Send } from "lucide-react";

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "",
  mood: "chill",
  tags: "",
};

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

export default function UploadPanel({ token, onUploaded, compact = false }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const uploadWithProgress = (formData) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/video/uploadvideo`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        setUploadPercent(percent);
      };

      xhr.onload = () => {
        let payload = {};
        try {
          payload = JSON.parse(xhr.responseText || "{}");
        } catch {
          payload = {};
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload);
          return;
        }
        reject(new Error(payload.message || "Upload failed"));
      };

      xhr.onerror = () => reject(new Error("Network error while uploading"));
      xhr.send(formData);
    });

  const uploadVideo = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setError("Video file is required");
      return;
    }

    setError("");
    setUploading(true);
    setUploadPercent(0);

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("category", form.category);
    fd.append("mood", form.mood);
    fd.append("tags", form.tags);
    fd.append("video", videoFile);
    if (thumbnailFile) fd.append("thumbnail", thumbnailFile);

    try {
      await uploadWithProgress(fd);

      setForm(INITIAL_FORM);
      setVideoFile(null);
      setThumbnailFile(null);
      setShowSuccessToast(true);
      window.setTimeout(() => setShowSuccessToast(false), 2800);
      if (onUploaded) await onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  return (
    <section className={`upload-box ${compact ? "upload-box-compact" : ""}`}>
      <form onSubmit={uploadVideo} className="upload-form">
        <div className="upload-grid">
          <div className="upload-main-fields">
            <label>
              Title
              <input
                type="text"
                placeholder="Enter video title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </label>

            <label>
              Description
              <textarea
                rows={4}
                placeholder="Write a short description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </label>

            <div className="form-row">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
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
                  value={form.mood}
                  onChange={(e) => setForm((p) => ({ ...p, mood: e.target.value }))}
                  required
                >
                  {MOOD_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Tags
                <input
                  type="text"
                  placeholder="Comma separated"
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="upload-files-panel">
            <label className="file-label modern-file-label">
              <span className="file-label-head">
                <Clapperboard size={16} />
                Video file
              </span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                required
              />
              <span className="file-name">{videoFile?.name || "No video selected"}</span>
            </label>

            <label className="file-label modern-file-label">
              <span className="file-label-head">
                <ImageIcon size={16} />
                Thumbnail file
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              />
              <span className="file-name">{thumbnailFile?.name || "No thumbnail selected"}</span>
            </label>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {uploading && (
          <div className="upload-progress">
            <div className="upload-progress-track">
              <span className="upload-progress-fill" style={{ width: `${uploadPercent}%` }} />
            </div>
            <p className="upload-progress-label">{uploadPercent}% uploaded</p>
          </div>
        )}

        <button className="upload-submit" type="submit" disabled={uploading}>
          <Send size={16} />
          {uploading ? "Publishing..." : "Publish Video"}
        </button>
      </form>

      {showSuccessToast && <div className="upload-toast">Video uploaded successfully</div>}
    </section>
  );
}
