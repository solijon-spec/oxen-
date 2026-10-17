import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { X, Upload, Image, Video, Loader2 } from "lucide-react";

import { useTravel } from "@/contexts/TravelContext";
import { cn } from "@/lib/utils";

interface StoryCreatorProps {
  open: boolean;
  onClose: () => void;
}

export default function StoryCreator({ open, onClose }: StoryCreatorProps) {
  const { addStory } = useTravel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const reset = useCallback(() => {
    setPreview(null);
    setCaption("");
    setDragOver(false);
    setUploading(false);
    setProgress(0);
    setMediaType("image");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleFilePick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  /** Simulates upload progress, then saves the story to state. */
  const handlePost = useCallback(() => {
    if (!preview) return;
    setUploading(true);
    setProgress(0);

    const duration = 900;
    const interval = 30;
    const steps = duration / interval;
    const increment = 100 / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        clearInterval(timer);
        setProgress(100);
        addStory({ type: mediaType, dataUrl: preview, caption });
        setTimeout(() => handleClose(), 400);
      } else {
        setProgress(current);
      }
    }, interval);
  }, [preview, mediaType, caption, addStory, handleClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-4 w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#111318]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-display text-lg font-extrabold text-white">Create Story</h2>
            <button
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/15 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5">
            {!preview ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors",
                  dragOver
                    ? "border-primary/50 bg-primary/5"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
                )}
              >
                <Upload className={cn("h-8 w-8 transition-colors", dragOver ? "text-primary" : "text-muted-foreground")} />
                <p className="text-sm font-medium text-white/60">Drop your photo or video here</p>
                <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/60">or tap to browse</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40">
                  {mediaType === "video" ? (
                    <video src={preview} controls className="max-h-[380px] w-full object-contain" />
                  ) : (
                    <img src={preview} alt="Preview" className="max-h-[380px] w-full object-contain" />
                  )}
                  <button
                    onClick={() => setPreview(null)}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm transition hover:bg-black/80"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Caption */}
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary/30 focus:bg-white/[0.06]"
                />

                {/* Progress bar */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Uploading story...
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFilePick}
            />

            {/* Action */}
            {preview && !uploading && (
              <button
                onClick={handlePost}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-500 active:scale-[0.98]"
              >
                Post Story
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
