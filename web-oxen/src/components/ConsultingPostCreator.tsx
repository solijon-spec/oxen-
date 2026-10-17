import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { X, Upload, Play, Image as ImageIcon, Loader2, Hash, Send } from "lucide-react";
import { toast } from "sonner";

import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { createPost, type PostMedia } from "@/lib/consulting-posts";
import { cn } from "@/lib/utils";

interface ConsultingPostCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function ConsultingPostCreator({
  open,
  onClose,
  onCreated,
}: ConsultingPostCreatorProps) {
  const { company } = useConsulting();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [content, setContent] = useState<string>("");
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState<boolean>(false);

  const reset = useCallback(() => {
    setMedia([]);
    setContent("");
    setTagInput("");
    setTags([]);
    setDragOver(false);
    setPublishing(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 15MB per file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setMedia((prev) => [
        ...prev,
        { type: file.type.startsWith("video/") ? "video" : "image", url },
      ]);
    };
    reader.readAsDataURL(file);
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

  const removeMedia = useCallback((index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handlePublish = useCallback(() => {
    if (!company) {
      toast.error("No consulting company found");
      return;
    }
    if (!content.trim() && media.length === 0) {
      toast.error("Add some content or media first");
      return;
    }
    setPublishing(true);

    // Simulate async publish (in production this would call Supabase)
    setTimeout(() => {
      try {
        createPost(
          company.id,
          { name: company.name, logo_url: company.logo_url },
          { name: user?.name ?? "Consultant", avatar: user?.avatarUrl ?? null, id: user?.id ?? "" },
          { content: content.trim(), media, tags, is_published: true },
        );
        toast.success("Post published");
        onCreated?.();
        handleClose();
      } catch {
        toast.error("Failed to publish post");
      } finally {
        setPublishing(false);
      }
    }, 600);
  }, [company, user, content, media, tags, onCreated, handleClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="glass-strong fixed inset-x-0 bottom-0 z-[91] max-h-[90vh] overflow-y-auto rounded-t-3xl shadow-2xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-inherit px-5 py-4 backdrop-blur-xl">
              <h2 className="font-display text-base font-bold text-foreground">Create Post</h2>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.1] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {/* Company header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
                  {company?.logo_url ? (
                    <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{company?.name}</p>
                  <p className="text-[11px] text-muted-foreground">Publishing to public feed</p>
                </div>
              </div>

              {/* Content textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share an update, tip, or announcement..."
                rows={4}
                maxLength={2000}
                className="w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
              />
              <p className="text-right text-[10px] text-muted-foreground">{content.length}/2000</p>

              {/* Media gallery preview */}
              {media.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {media.map((m, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.08]"
                    >
                      {m.type === "image" ? (
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/40">
                          <video src={m.url} className="h-full w-full object-cover" />
                          <Play className="absolute h-6 w-6 text-white/90" />
                        </div>
                      )}
                      <button
                        onClick={() => removeMedia(i)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-6 transition",
                  dragOver
                    ? "border-primary/50 bg-primary/5"
                    : "border-white/[0.1] bg-white/[0.02] hover:border-white/20",
                )}
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Drag images or videos here, or click to browse
                </p>
                <p className="text-[10px] text-muted-foreground/60">Max 15MB · JPG, PNG, MP4</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFilePick}
                  className="hidden"
                />
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tags (press Enter)"
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
                  />
                  <button
                    onClick={addTag}
                    className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1]"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-primary/60 transition hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Publish button */}
              <button
                onClick={handlePublish}
                disabled={publishing || (!content.trim() && media.length === 0)}
                className="gold-gradient flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/25 transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish Post
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
