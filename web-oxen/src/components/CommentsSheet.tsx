import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Send, Edit2, Trash2, MoreHorizontal, CornerDownRight, Smile, Check, ArrowLeft,
} from "lucide-react";

import { useComments } from "@/contexts/CommentsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CURRENT_USER_ID } from "@/data/demoUsers";
import type { Comment } from "@/data/feedData";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const EMOJIS = ["❤️", "😍", "🔥", "✨", "🙌", "👏", "😅", "😮", "🥺", "👍", "💎", "🌍"];

function useTimeAgo(t: (key: string, fallback?: string) => string) {
  return (ts: number): string => {
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return t("common.now", "now");
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}${t("common.minuteShort", "m")}`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}${t("common.hourShort", "h")}`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}${t("common.dayShort", "d")}`;
    const weeks = Math.floor(days / 7);
    return `${weeks}${t("common.weekShort", "w")}`;
  };
}

/** Render text with @mentions highlighted */
function renderText(text: string): React.ReactNode[] {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span key={i} className="font-semibold text-blue-400">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/* ------------------------------------------------------------------ */
/*  Single comment item                                                */
/* ------------------------------------------------------------------ */

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  isReply?: boolean;
  onReply: (comment: Comment) => void;
  onLike: (commentId: string) => void;
  onEdit: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
  isLiked: boolean;
}

function CommentItem({
  comment, replies, isReply, onReply, onLike, onEdit, onDelete, isLiked,
}: CommentItemProps) {
  const { t } = useLanguage();
  const formatTime = useTimeAgo(t);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showReplies, setShowReplies] = useState(true);
  const isOwner = comment.userId === CURRENT_USER_ID;

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== comment.text) {
      onEdit(comment.id, trimmed);
    }
    setEditing(false);
  }, [editText, comment.id, comment.text, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(comment.id);
    setShowMenu(false);
  }, [comment.id, onDelete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring" as const, stiffness: 320, damping: 28 }}
      className={cn("relative", isReply && "ml-10")}
    >
      <div className="flex gap-3 py-2.5">
        {/* Avatar */}
        <img
          src={comment.avatarUrl || "https://i.pravatar.cc/150?img=8"}
          alt={comment.username}
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-md bg-white/[0.05] px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white/90 truncate">{comment.username}</span>
              <span className="text-[10px] text-white/30 shrink-0">{formatTime(comment.createdAt)}</span>
            </div>

            {editing ? (
              <div className="mt-1.5">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  autoFocus
                  className="w-full resize-none rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg px-3 py-1.5 text-[10px] font-medium text-white/40 hover:text-white/70"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 rounded-lg bg-blue-500/20 px-3 py-1.5 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/30"
                  >
                    <Check className="h-3 w-3" />
                    {t("common.save", "Save")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-0.5 text-xs leading-relaxed text-white/75 break-words">
                {renderText(comment.text)}
                {comment.edited && <span className="ml-1 text-[9px] text-white/25">({t("comments.edited", "edited")})</span>}
              </p>
            )}
          </div>

          {/* Actions row */}
          {!editing && (
            <div className="mt-1 flex items-center gap-3 pl-1">
              <button
                onClick={() => onLike(comment.id)}
                className="flex items-center gap-1 text-[10px] font-medium transition active:scale-90"
              >
                <Heart
                  className={cn("h-3 w-3", isLiked ? "fill-red-500 text-red-500" : "text-white/40")}
                  strokeWidth={2}
                />
                <span className={cn(isLiked ? "text-red-400" : "text-white/40")}>
                  {comment.likes > 0 ? comment.likes : t("comments.like", "Like")}
                </span>
              </button>
              {/* Allow replies on both top-level and reply comments */}
              <button
                onClick={() => onReply(comment)}
                className="text-[10px] font-medium text-white/40 transition hover:text-white/70 active:scale-90"
              >
                {t("comments.reply", "Reply")}
              </button>
              {replies.length > 0 && !isReply && (
                <button
                  onClick={() => setShowReplies((s) => !s)}
                  className="flex items-center gap-1 text-[10px] font-medium text-white/30 transition hover:text-white/60"
                >
                  <CornerDownRight className="h-2.5 w-2.5" />
                  {showReplies ? t("comments.hide", "Hide") : t("comments.show", "Show")} {replies.length}
                </button>
              )}

              {/* Owner menu */}
              {isOwner && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowMenu((s) => !s)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 transition hover:text-white/60 active:scale-90"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  <AnimatePresence>
                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                          className="absolute right-0 top-7 z-20 flex flex-col gap-0.5 rounded-xl border border-white/10 bg-[#1a1d28]/95 p-1 shadow-2xl backdrop-blur-xl"
                        >
                          <button
                            onClick={() => { setEditing(true); setShowMenu(false); }}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 whitespace-nowrap"
                          >
                            <Edit2 className="h-3 w-3" />
                            {t("comments.edit", "Edit")}
                          </button>
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/15 whitespace-nowrap"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("comments.delete", "Delete")}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Replies */}
          {!isReply && showReplies && replies.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  replies={[]}
                  isReply
                  onReply={onReply}
                  onLike={onLike}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isLiked={reply.likedBy.includes(CURRENT_USER_ID)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comments Sheet (rendered via portal to escape transformed ancestors) */
/* ------------------------------------------------------------------ */

interface CommentsSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CommentsSheet({ postId, isOpen, onClose }: CommentsSheetProps) {
  const { t } = useLanguage();
  const {
    getTopLevelComments, getReplies, addComment, editComment,
    deleteComment, toggleCommentLike, isCommentLiked,
  } = useComments();

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const topLevel = useMemo(() => getTopLevelComments(postId), [getTopLevelComments, postId]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Scroll to top on open
      scrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    addComment(postId, trimmed, replyTo?.id ?? null);
    setInput("");
    setReplyTo(null);
    setShowEmojis(false);
    // Scroll to bottom after submit
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    }, 100);
  }, [input, postId, addComment, replyTo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const insertEmoji = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const handleReply = useCallback((comment: Comment) => {
    setReplyTo(comment);
    setShowEmojis(false);
  }, []);

  const handleLike = useCallback((commentId: string) => {
    toggleCommentLike(commentId);
  }, [toggleCommentLike]);

  const handleEdit = useCallback((commentId: string, text: string) => {
    editComment(commentId, text);
  }, [editComment]);

  const handleDelete = useCallback((commentId: string) => {
    deleteComment(commentId);
  }, [deleteComment]);

  const totalComments = useMemo(
    () => topLevel.length + topLevel.reduce((sum, c) => sum + getReplies(c.id).length, 0),
    [topLevel, getReplies],
  );

  // Render via portal to escape any transformed/z-index ancestors
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring" as const, stiffness: 340, damping: 32, mass: 0.9 }}
            className="comments-sheet fixed bottom-0 left-1/2 z-[56] flex max-h-[85vh] w-[calc(100vw-8px)] max-w-[440px] -translate-x-1/2 flex-col overflow-hidden rounded-t-[28px] border border-white/[0.08] bg-gradient-to-b from-[#13151e]/97 via-[#101218]/97 to-[#0c0e14]/97 shadow-2xl shadow-black/60 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/50 transition hover:bg-white/12 hover:text-white active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="font-display text-base font-bold text-white">
                Comments {totalComments > 0 && <span className="text-white/40">{totalComments}</span>}
              </h3>
              <div className="h-8 w-8 shrink-0" />
            </div>

            {/* Comments list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-4 pb-2 overscroll-contain">
              {totalComments === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                    <Send className="h-6 w-6 text-white/20" />
                  </div>
                  <p className="text-sm font-medium text-white/50">No comments yet</p>
                  <p className="mt-1 text-xs text-white/30">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <AnimatePresence>
                  {topLevel.map((comment) => {
                    const replies = getReplies(comment.id);
                    return (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        replies={replies}
                        onReply={handleReply}
                        onLike={handleLike}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isLiked={isCommentLiked(comment.id)}
                      />
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Emoji picker */}
            <AnimatePresence>
              {showEmojis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 overflow-hidden border-t border-white/[0.05]"
                >
                  <div className="flex flex-wrap gap-1.5 px-4 py-3">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-xl transition hover:bg-white/10 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply indicator */}
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden border-t border-white/[0.05]"
                >
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2 text-xs text-white/50 min-w-0">
                      <ArrowLeft className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t("comments.replyingTo", "Replying to")} <span className="font-semibold text-blue-400">@{replyTo.username}</span></span>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="text-xs font-medium text-white/40 transition hover:text-white/70 shrink-0 ml-2"
                    >
                      {t("common.cancel", "Cancel")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar — safe area aware */}
            <div className="shrink-0 border-t border-white/[0.06] px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-end gap-2.5">
                <button
                  onClick={() => setShowEmojis((s) => !s)}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90",
                    showEmojis ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.05] text-white/40 hover:text-white/70",
                  )}
                >
                  <Smile className="h-5 w-5" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={replyTo ? t("comments.replyPlaceholder", "Reply to @{username}…").replace("{username}", replyTo.username) : t("comments.placeholder", "Add a comment…")}
                  className="flex-1 resize-none rounded-2xl bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none min-w-0"
                  style={{ maxHeight: 80 }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90",
                    input.trim()
                      ? "bg-blue-500 text-white hover:bg-blue-400"
                      : "bg-white/[0.05] text-white/20 cursor-not-allowed",
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
