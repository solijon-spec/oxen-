import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

import type { ServiceVideo } from "@/lib/services";

/**
 * Extract YouTube video ID from various URL formats.
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * VideoEmbed — lazy-loaded video player supporting YouTube links
 * and uploaded video URLs.
 */
function VideoEmbedBase({ video }: { video: ServiceVideo }) {
  const [activated, setActivated] = useState(false);

  // YouTube embed
  const youtubeId = video.type === "youtube" ? getYouTubeId(video.url) : null;

  if (youtubeId) {
    const thumbUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

    return (
      <div className="travel-card relative aspect-video overflow-hidden rounded-2xl">
        {activated ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={video.title ?? "Video"}
            allow="accelerated-preview; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActivated(true)}
            className="group relative h-full w-full"
            aria-label="Play video"
          >
            <img
              src={thumbUrl}
              alt={video.title ?? "Video thumbnail"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-xl transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6 fill-primary text-primary" />
              </span>
            </div>
            {video.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-sm font-semibold text-white">{video.title}</p>
              </div>
            )}
          </motion.button>
        )}
      </div>
    );
  }

  // Uploaded video (direct URL)
  return (
    <div className="travel-card relative aspect-video overflow-hidden rounded-2xl">
      <video
        controls
        preload="metadata"
        className="h-full w-full"
        poster={undefined}
      >
        <source src={video.url} />
      </video>
      {video.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="text-sm font-semibold text-white">{video.title}</p>
        </div>
      )}
    </div>
  );
}

export const VideoEmbed = memo(VideoEmbedBase);

/**
 * VideoGrid — renders a list of videos (lazy loaded).
 */
function VideoGridBase({ videos }: { videos: ServiceVideo[] }) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="space-y-4">
      {videos.map((video, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06 }}
        >
          <VideoEmbed video={video} />
        </motion.div>
      ))}
    </div>
  );
}

export const VideoGrid = memo(VideoGridBase);
