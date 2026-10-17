import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { X, Upload, Play, Image, Loader2, Hash, MapPin } from "lucide-react";

import { useTravel } from "@/contexts/TravelContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

interface PostCreatorProps {
  open: boolean;
  onClose: () => void;
}

export default function PostCreator({ open, onClose }: PostCreatorProps) {
  const { t } = useLanguage();
  const { addPost } = useTravel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [media, setMedia] = useState<{ type: "image" | "video"; dataUrl: string }[]>([]);
  const [caption, setCaption] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [hashtagInput, setHashtagInput] = useState<string>("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const reset = useCallback(() => {
    setMedia([]);
    setCaption("");
    setLocation("");
    setCountry("");
    setCity("");
    setHashtagInput("");
    setHashtags([]);
    setDragOver(false);
    setUploading(false);
    setProgress(0);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMedia((prev) => [...prev, { type: file.type.startsWith("video/") ? "video" : "image", dataUrl: reader.result as string }]);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeMedia = useCallback((index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddHashtag = useCallback(() => {
    const trimmed = hashtagInput.trim().replace(/^#/, "");
    if (trimmed && !hashtags.includes(trimmed)) {
      setHashtags((prev) => [...prev, trimmed]);
    }
    setHashtagInput("");
  }, [hashtagInput, hashtags]);

  const handleRemoveHashtag = useCallback((tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleFilePick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) Array.from(files).forEach(processFile);
      e.target.value = "";
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files) Array.from(files).forEach(processFile);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleShare = useCallback(() => {
    if (media.length === 0) return;
    setUploading(true);
    setProgress(0);

    const duration = 1200;
    const interval = 30;
    const steps = duration / interval;
    const increment = 100 / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        clearInterval(timer);
        setProgress(100);
        addPost({
          media: media.map((m) => ({ type: m.type, dataUrl: m.dataUrl })),
          caption,
          location,
          country,
          city,
          hashtags,
        });
        setTimeout(() => handleClose(), 400);
      } else {
        setProgress(current);
      }
    }, interval);
  }, [media, caption, location, country, city, hashtags, addPost, handleClose]);

  if (!open) return null;

  const isValid = media.length > 0;

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
          className="mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#111318]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-display text-lg font-extrabold text-white">Create Travel Post</h2>
            <button
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/15 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto px-5 py-5 space-y-4">
            {/* Media upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 transition-colors",
                dragOver
                  ? "border-primary/50 bg-primary/5"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
              )}
            >
              {media.length > 0 ? (
                <div className="-m-1 flex flex-wrap gap-2">
                  {media.map((m, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/[0.08]">
                      {m.type === "video" ? (
                        <video src={m.dataUrl} className="h-full w-full object-cover" />
                      ) : (
                        <img src={m.dataUrl} alt={`Media ${i + 1}`} className="h-full w-full object-cover" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeMedia(i); }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/70 backdrop-blur-sm transition hover:bg-black/90"
                        aria-label={`Remove media ${i + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-white/10 text-white/30">
                    <Upload className="h-5 w-5" />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium text-white/50">{t("post.dropMedia", "Drop photos or videos here")}</p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/50">{t("post.tapToBrowse", "or tap to browse")}</span>
                </>
              )}
            </div>

            {/* Caption */}
            <textarea
              placeholder={t("post.caption", "Write a caption…")}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-primary/30 focus:bg-white/[0.06]"
            />

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  <MapPin className="h-3 w-3" /> Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary/30"
                >
                  <option value="" className="bg-[#1a1d24]">{t("post.selectCountry", "Select country")}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.name} className="bg-[#1a1d24]">{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  <MapPin className="h-3 w-3" /> City
                </label>
                <input
                  type="text"
                  placeholder={t("post.cityPlaceholder", "e.g. Paris")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/30"
                />
              </div>
            </div>

            {/* General location */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Location Name</label>
              <input
                type="text"
                placeholder={t("post.locationPlaceholder", "e.g. Eiffel Tower, Shibuya Crossing…")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/30"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                <Hash className="h-3 w-3" /> Hashtags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("post.tagPlaceholder", "Add a tag…")}
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddHashtag(); } }}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/30"
                />
                <button
                  onClick={handleAddHashtag}
                  className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/15"
                >
                  Add
                </button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveHashtag(tag)}
                        className="ml-0.5 text-blue-400/60 hover:text-blue-400"
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("post.sharing", "Sharing post…")}
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

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFilePick}
            />
          </div>

          {/* Footer action */}
          {!uploading && (
            <div className="shrink-0 border-t border-white/[0.06] px-5 py-4">
              <button
                onClick={handleShare}
                disabled={!isValid}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition active:scale-[0.98]",
                  isValid
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-400 hover:to-blue-500"
                    : "cursor-not-allowed bg-white/5 text-white/25",
                )}
              >
                {t("post.share", "Share Post")}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
