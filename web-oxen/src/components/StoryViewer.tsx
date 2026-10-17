import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Pause, Play } from "lucide-react";

import type { Story } from "@/contexts/TravelContext";

const STORY_DURATION_MS = 5000;

interface StoryViewerProps {
  stories: Story[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
}

export default function StoryViewer({ stories, startIndex, open, onClose }: StoryViewerProps) {
  const [current, setCurrent] = useState<number>(startIndex);
  const [progress, setProgress] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([startIndex]));

  const storyList = useMemo(() => stories, [stories]);

  /* Preload adjacent stories */
  useEffect(() => {
    if (current > 0) setLoaded((s) => new Set(s).add(current - 1));
    if (current < storyList.length - 1) setLoaded((s) => new Set(s).add(current + 1));
  }, [current, storyList.length]);

  /* Auto-advance timer */
  useEffect(() => {
    if (!open || paused) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + 100 / (STORY_DURATION_MS / 50);
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [open, paused, current]);

  /* Advance when progress reaches 100% */
  useEffect(() => {
    if (progress >= 100) {
      if (current < storyList.length - 1) {
        setCurrent((c) => c + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress, current, storyList.length, onClose]);

  /* Reset progress on story change */
  const handlePrev = useCallback(() => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setProgress(0);
    }
  }, [current]);

  const handleNext = useCallback(() => {
    if (current < storyList.length - 1) {
      setCurrent((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [current, storyList.length, onClose]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  /* Keyboard nav */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, handlePrev, handleNext]);

  if (!open || storyList.length === 0) return null;

  const story = storyList[current];
  if (!story) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
        onClick={handleNext}
      >
        {/* Progress bars */}
        <div className="absolute left-4 right-4 top-6 z-20 flex gap-1">
          {storyList.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              {i < current && <div className="h-full w-full rounded-full bg-white" />}
              {i === current && (
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                  className="h-full rounded-full bg-white"
                />
              )}
            </div>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute right-4 top-14 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/70 backdrop-blur-sm transition hover:bg-white/25"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Pause toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); togglePause(); }}
          className="absolute right-4 top-24 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/70 backdrop-blur-sm transition hover:bg-white/25"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>

        {/* Content */}
        <motion.div
          key={story.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-full w-full max-w-lg items-center justify-center"
        >
          {story.type === "video" ? (
            <video
              src={story.dataUrl}
              controls
              className="max-h-[85vh] w-full object-contain rounded-2xl"
              autoPlay
              playsInline
            />
          ) : (
            <img
              src={story.dataUrl}
              alt={story.caption}
              className="max-h-[85vh] w-full object-contain rounded-2xl"
            />
          )}

          {/* Caption */}
          {story.caption && (
            <div className="absolute bottom-8 left-4 right-4 rounded-xl bg-black/50 px-4 py-3 backdrop-blur-sm">
              <p className="text-sm font-medium text-white">{story.caption}</p>
            </div>
          )}
        </motion.div>

        {/* Left / right tap zones */}
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="absolute left-0 top-0 z-10 h-full w-[30%] cursor-pointer"
          aria-label="Previous story"
        />
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="absolute right-0 top-0 z-10 h-full w-[30%] cursor-pointer"
          aria-label="Next story"
        />
      </motion.div>
    </AnimatePresence>
  );
}
