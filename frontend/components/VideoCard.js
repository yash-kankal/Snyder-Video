import Link from "next/link";

export default function VideoCard({ video }) {
  const thumb = video.thumbnailUrl || "https://placehold.co/640x360/222733/8ea3c7?text=Snyder";
  const channelId = typeof video.user === "string" ? video.user : video.user?._id;

  return (
    <article className="video-card">
      <Link href={`/video/${video._id}`} className="video-thumb-link">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt={video.title} />
      </Link>
      <div className="video-content">
        <div className="video-avatar">
          {video.user?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.user.logoUrl} alt={video.user?.channelName || "Channel"} />
          ) : (
            (video.user?.channelName || "C").slice(0, 1)
          )}
        </div>
        <div className="video-meta">
          <Link href={`/video/${video._id}`} className="video-title-link">
            <h3>{video.title}</h3>
          </Link>
          <div className="video-channel-row">
            {channelId ? (
              <Link href={`/channel/${channelId}`} className="video-channel-link">
                {video.user?.channelName || "Channel"}
              </Link>
            ) : (
              <span className="video-channel-link">{video.user?.channelName || "Channel"}</span>
            )}
            <span className="video-channel-stats">
              {video.views || 0} views •{" "}
              {new Date(video.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
