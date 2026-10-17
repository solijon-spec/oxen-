import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RotateCcw, RotateCw } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helper: format seconds to MM:SS                                   */
/* ------------------------------------------------------------------ */

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  VideoPlayer — custom iOS-style controls                            */
/* ------------------------------------------------------------------ */

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export default function VideoPlayer({
  src,
  poster,
  className,
  autoPlay = false,
  loop = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  /* ── Load metadata ── */
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isDragging) {
      setCurrentTime(videoRef.current.currentTime);
      // Update buffered amount
      if (videoRef.current.buffered.length > 0) {
        setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
      }
    }
  }, [isDragging]);

  const handleWaiting = useCallback(() => setIsLoading(true), []);
  const handlePlaying = useCallback(() => {
    setIsLoading(false);
    setHasEnded(false);
  }, []);
  const handleEnded = useCallback(() => {
    setHasEnded(true);
    setIsPlaying(false);
  }, []);

  /* ── Play / Pause ── */
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
    revealControls();
  }, []);

  /* ── Mute / Unmute ── */
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
    revealControls();
  }, []);

  /* ── Seek by relative amount (–10s / +10s) ── */
  const seekRelative = useCallback((delta: number) => {
    if (!videoRef.current) return;
    const next = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = next;
    setCurrentTime(next);
  }, []);

  /* ── Fullscreen ── */
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    revealControls();
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  /* ── Play / Pause state sync ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  /* ── Auto-hide controls ── */
  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying && !isDragging) setShowControls(false);
    }, 3000);
  }, [isPlaying, isDragging]);

  useEffect(() => {
    revealControls();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [isPlaying, revealControls]);

  /* ── Progress bar interaction ── */
  const handleProgressClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const handleProgressDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    handleProgressClick(e);
  }, [handleProgressClick]);

  const handleProgressDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    handleProgressClick(e);
  }, [isDragging, handleProgressClick]);

  const handleProgressDragEnd = useCallback(() => {
    setIsDragging(false);
    revealControls();
  }, [revealControls]);

  /* ── Keyboard shortcuts in fullscreen ── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      case "ArrowLeft":
        seekRelative(-10);
        break;
      case "ArrowRight":
        seekRelative(10);
        break;
    }
  }, [togglePlay, toggleMute, toggleFullscreen, seekRelative]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  /* ── Fullscreen portal content ── */
  const playerContent = (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden bg-black",
        isFullscreen ? "flex h-screen w-screen items-center justify-center" : "rounded-xl",
        className,
      )}
      onClick={togglePlay}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        playsInline
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onEnded={handleEnded}
        onCanPlay={() => setIsLoading(false)}
        className={cn("h-full w-full object-contain", isFullscreen && "max-h-screen")}
        style={{ pointerEvents: "none" }}
      />

      {/* Loading spinner */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center play button (when paused / ended) */}
      <AnimatePresence>
        {!isPlaying && !isLoading && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 22 }}
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition hover:scale-110 active:scale-90"
          >
            {hasEnded ? (
              <RotateCcw className="h-7 w-7 fill-white text-white" strokeWidth={0} />
            ) : (
              <Play className="h-7 w-7 fill-white text-white ml-0.5" strokeWidth={0} />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pb-3 pt-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="relative mb-2.5 h-1.5 cursor-pointer rounded-full bg-white/20"
              onMouseDown={handleProgressDragStart}
              onMouseMove={handleProgressDragMove}
              onMouseUp={handleProgressDragEnd}
              onMouseLeave={handleProgressDragEnd}
              onTouchStart={handleProgressDragStart}
              onTouchMove={handleProgressDragMove}
              onTouchEnd={handleProgressDragEnd}
            >
              {/* Buffered */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/25"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Played */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-lg" />
              </div>
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="flex h-8 w-8 items-center justify-center text-white transition active:scale-90"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
              </button>

              {/* Skip back 10s */}
              <button
                onClick={(e) => { e.stopPropagation(); seekRelative(-10); }}
                className="flex h-8 w-8 items-center justify-center text-white/80 transition hover:text-white active:scale-90"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {/* Skip forward 10s */}
              <button
                onClick={(e) => { e.stopPropagation(); seekRelative(10); }}
                className="flex h-8 w-8 items-center justify-center text-white/80 transition hover:text-white active:scale-90"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              {/* Mute */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="flex h-8 w-8 items-center justify-center text-white/80 transition hover:text-white active:scale-90"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              {/* Time display */}
              <span className="text-xs font-medium tabular-nums text-white/90">
                {formatTime(currentTime)} <span className="text-white/40">/ {formatTime(duration)}</span>
              </span>

              {/* Fullscreen — right aligned */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="ml-auto flex h-8 w-8 items-center justify-center text-white/80 transition hover:text-white active:scale-90"
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // When fullscreen, render via portal to document.body for proper layering
  if (isFullscreen) {
    return createPortal(playerContent, document.body);
  }

  return playerContent;
}
