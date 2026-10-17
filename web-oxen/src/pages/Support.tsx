import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Search, Check, CheckCheck, Camera,
  Image as ImageIcon, Video, Smile, MoreVertical, Trash2, X,
  Paperclip, Pencil, Reply, FileText, Headphones, ChevronRight,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  useSupport,
  SUPPORT_CATEGORIES,
  type SupportMessage,
} from "@/contexts/SupportContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const EMOJIS = ["😀", "😂", "😍", "🥰", "😎", "🤔", "😢", "😡", "👍", "👎", "❤️", "🔥", "✨", "🎉", "🚀", "🌍", "✈️", "🏝️", "📸", "🙌", "🙏", "💡", "🐞", "🛡️"];

/* ── Time format helpers ── */

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function useFormatDateDivider() {
  const { t } = useLanguage();
  return (ts: number): string => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return t("support.today", "Today");
    if (d.toDateString() === yesterday.toDateString()) return t("support.yesterday", "Yesterday");
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Message bubble ── */

interface MessageBubbleProps {
  msg: SupportMessage;
  isMe: boolean;
  index: number;
  replyToMessage: SupportMessage | null;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onEdit: (messageId: string, currentContent: string) => void;
  onReply: (messageId: string) => void;
}

function MessageBubble({ msg, isMe, index, replyToMessage, onDelete, onEdit, onReply }: MessageBubbleProps) {
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const isDeleted = msg.deletedForEveryone;

  const renderContent = () => {
    if (isDeleted) {
      return <p className="text-sm italic opacity-50">🚫 Message deleted</p>;
    }
    switch (msg.type) {
      case "image":
        return <img src={msg.content} alt="Shared" className="rounded-xl max-w-full max-h-60 object-cover" />;
      case "video":
        return <video src={msg.content} controls className="rounded-xl max-w-full max-h-60" />;
      case "file":
        return (
          <div className="flex items-center gap-3 py-1 min-w-[180px]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{msg.fileName ?? "File"}</p>
              {msg.fileSize && <p className="text-xs opacity-50">{formatFileSize(msg.fileSize)}</p>}
            </div>
          </div>
        );
      default:
        return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), type: "spring" as const, stiffness: 400, damping: 28 }}
      className={cn("flex", isMe ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[78%]", isMe ? "items-end" : "items-start")}>
        {/* Reply context */}
        {replyToMessage && !isDeleted && (
          <div
            className={cn(
              "mb-1 rounded-lg border-l-2 px-3 py-1.5 text-xs opacity-60",
              isMe ? "border-amber-300 bg-amber-500/10" : "border-blue-300 bg-blue-500/10",
            )}
          >
            <p className="font-semibold opacity-70">{replyToMessage.senderName}</p>
            <p className="truncate opacity-50">
              {replyToMessage.type === "text" ? replyToMessage.content : `[${replyToMessage.type}]`}
            </p>
          </div>
        )}

        <div className={cn("relative px-4 py-2.5", isMe ? "chat-bubble-sent" : "chat-bubble-received")}>
          {renderContent()}

          {/* Edit indicator */}
          {msg.editedAt && !isDeleted && (
            <span className={cn("mt-0.5 block text-[10px] opacity-40", isMe ? "text-white/50" : "text-current")}>
              {t("support.edited", "edited")}
            </span>
          )}

          {/* Action menu for own messages */}
          {isMe && !isDeleted && msg.type === "text" && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-white/50 backdrop-blur-sm transition hover:text-white"
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -4 }}
                      className="absolute right-0 top-5 z-20 flex flex-col gap-0.5 rounded-xl border border-white/10 bg-[#1a1d28]/95 p-1 shadow-2xl backdrop-blur-xl"
                    >
                      <button
                        onClick={() => { onReply(msg.id); setShowMenu(false); }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 whitespace-nowrap"
                      >
                        <Reply className="h-3 w-3" />
                        Reply
                      </button>
                      <button
                        onClick={() => { onEdit(msg.id, msg.content); setShowMenu(false); }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 whitespace-nowrap"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => { onDelete(msg.id, false); setShowMenu(false); }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 whitespace-nowrap"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete for me
                      </button>
                      <button
                        onClick={() => { onDelete(msg.id, true); setShowMenu(false); }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/15 whitespace-nowrap"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete for everyone
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Reply button for received messages */}
          {!isMe && !isDeleted && (
            <button
              onClick={() => onReply(msg.id)}
              className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-white/50 opacity-0 backdrop-blur-sm transition hover:text-white group-hover:opacity-100"
            >
              <Reply className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className={cn("flex items-center gap-1 mt-1 px-1", isMe ? "justify-end" : "justify-start")}>
          <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
          {isMe && (
            <span className="text-muted-foreground">
              {msg.status === "sending" ? (
                <span className="text-[10px] text-white/30">Sending…</span>
              ) : msg.status === "read" ? (
                <CheckCheck className="h-3 w-3 text-blue-400" />
              ) : msg.status === "delivered" ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Typing indicator ── */

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex justify-start"
    >
      <div className="chat-bubble-received px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-current opacity-40"
              style={{
                animation: "chat-typing 1.4s infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Support page ── */

export default function Support() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    categories,
    getCategoryMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markCategoryRead,
    setTyping,
    isTyping,
    unreadCount,
    totalUnread,
    getLastMessage,
  } = useSupport();

  const activeCategoryId = searchParams.get("category");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [editText, setEditText] = useState<string>("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const [showAttach, setShowAttach] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId) ?? null
    : null;

  const activeMessages = activeCategoryId ? getCategoryMessages(activeCategoryId) : [];

  // Filter categories by search
  const filteredCategories = categories.filter(
    (c) =>
      !searchQuery ||
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Mark category as read when opened
  useEffect(() => {
    if (activeCategoryId) {
      markCategoryRead(activeCategoryId);
    }
  }, [activeCategoryId, markCategoryRead, activeMessages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current && activeMessages.length > 0) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [activeMessages.length]);

  // Auto-clear reply when switching categories
  useEffect(() => {
    setReplyToId(null);
    setEditingMessageId(null);
    setEditText("");
    setShowEmoji(false);
    setShowAttach(false);
  }, [activeCategoryId]);

  // Typing indicator management
  const handleTyping = useCallback(() => {
    if (!activeCategoryId) return;
    setTyping(activeCategoryId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(activeCategoryId, false);
    }, 2000);
  }, [activeCategoryId, setTyping]);

  const handleSend = useCallback(() => {
    if (!messageText.trim() || !activeCategoryId) return;

    // If editing, update the message
    if (editingMessageId) {
      editMessage(activeCategoryId, editingMessageId, messageText.trim());
      setEditingMessageId(null);
      setMessageText("");
      return;
    }

    sendMessage(activeCategoryId, "text", messageText.trim(), undefined, undefined, replyToId);
    setMessageText("");
    setReplyToId(null);
    setShowEmoji(false);
    setTyping(activeCategoryId, false);
  }, [messageText, activeCategoryId, sendMessage, editMessage, editingMessageId, replyToId, setTyping]);

  const handleEmoji = useCallback((emoji: string) => {
    setMessageText((prev) => prev + emoji);
    handleTyping();
  }, [handleTyping]);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeCategoryId) return;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (isImage) {
          sendMessage(activeCategoryId, "image", result, file.name, file.size, replyToId);
        } else if (isVideo) {
          sendMessage(activeCategoryId, "video", result, file.name, file.size, replyToId);
        } else {
          // Any other file type
          sendMessage(activeCategoryId, "file", result, file.name, file.size, replyToId);
        }
        setReplyToId(null);
      };
      reader.readAsDataURL(file);
      setShowAttach(false);
      e.target.value = "";
    },
    [activeCategoryId, sendMessage, replyToId],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string, forEveryone: boolean) => {
      if (!activeCategoryId) return;
      deleteMessage(activeCategoryId, messageId, forEveryone);
    },
    [activeCategoryId, deleteMessage],
  );

  const handleEditMessage = useCallback((messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditText(currentContent);
    setMessageText(currentContent);
  }, []);

  const handleReply = useCallback((messageId: string) => {
    setReplyToId(messageId);
  }, []);

  const replyToMessage = replyToId
    ? activeMessages.find((m) => m.id === replyToId) ?? null
    : null;

  /* ── Chat view (full screen) ── */
  if (activeCategory) {
    let lastDateDivider = "";
    const formatDate = useFormatDateDivider();
    const typing = isTyping(activeCategory.id);

    return createPortal(
      <div className="fixed inset-0 z-[70] flex flex-col bg-background">
        {/* Chat header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="chat-input-area flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0"
        >
          <button
            onClick={() => setSearchParams({})}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: `${activeCategory.color}20` }}
          >
            {activeCategory.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{t(activeCategory.labelKey, activeCategory.label)}</p>
            <p className="text-xs flex items-center gap-1.5">
              {typing ? (
                <span className="text-emerald-400">{t("support.typing", "typing…")}</span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {t("settings.online", "Online")}
                </span>
              )}
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground">
            <Headphones className="h-5 w-5" />
          </div>
        </motion.div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 overscroll-contain">
          {activeMessages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-3xl">
                {activeCategory.icon}
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t(activeCategory.labelKey, activeCategory.label)}</p>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground/60">{t(activeCategory.descriptionKey, activeCategory.description)}</p>
              <p className="mt-3 text-xs text-muted-foreground/50">{t("support.startConversation", "Send a message to start the conversation")}</p>
            </div>
          )}
          {activeMessages.map((msg, i) => {
            const isMe = msg.senderId === "user";
            const dateDivider = formatDate(msg.createdAt);
            const showDivider = dateDivider !== lastDateDivider;
            lastDateDivider = dateDivider;
            const replyMsg = msg.replyTo
              ? activeMessages.find((m) => m.id === msg.replyTo) ?? null
              : null;

            return (
              <div key={msg.id} className="group">
                {showDivider && (
                  <div className="flex justify-center my-4">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {dateDivider}
                    </span>
                  </div>
                )}
                <MessageBubble
                  msg={msg}
                  isMe={isMe}
                  index={i}
                  replyToMessage={replyMsg}
                  onDelete={handleDeleteMessage}
                  onEdit={handleEditMessage}
                  onReply={handleReply}
                />
              </div>
            );
          })}
          <AnimatePresence>{typing && <TypingIndicator />}</AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Reply banner */}
        <AnimatePresence>
          {replyToMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="chat-input-area px-4 py-2 shrink-0"
            >
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2">
                <Reply className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">{replyToMessage.senderName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {replyToMessage.type === "text" ? replyToMessage.content : `[${t(`support.${replyToMessage.type}`, replyToMessage.type)}]`}
                  </p>
                </div>
                <button
                  onClick={() => setReplyToId(null)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit banner */}
        <AnimatePresence>
          {editingMessageId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="chat-input-area px-4 py-2 shrink-0"
            >
              <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2">
                <Pencil className="h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300/80 flex-1">{t("support.editMessagePlaceholder", "Editing message…")}</p>
                <button
                  onClick={() => { setEditingMessageId(null); setMessageText(""); }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji panel */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="chat-input-area px-4 py-3 shrink-0"
            >
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmoji(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition hover:bg-white/[0.08] active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attach panel */}
        <AnimatePresence>
          {showAttach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="chat-input-area px-4 py-3 shrink-0"
            >
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] px-5 py-3 transition hover:bg-white/[0.1] active:scale-95"
                >
                  <ImageIcon className="h-6 w-6 text-blue-400" />
                  <span className="text-xs font-medium">{t("support.photo", "Photo")}</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] px-5 py-3 transition hover:bg-white/[0.1] active:scale-95"
                >
                  <Video className="h-6 w-6 text-purple-400" />
                  <span className="text-xs font-medium">{t("support.video", "Video")}</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] px-5 py-3 transition hover:bg-white/[0.1] active:scale-95"
                >
                  <FileText className="h-6 w-6 text-emerald-400" />
                  <span className="text-xs font-medium">{t("support.file", "File")}</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area — safe area aware */}
        <div className="chat-input-area px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          <div className="flex items-end gap-2">
            <button
              onClick={() => { setShowAttach((v) => !v); setShowEmoji(false); }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] active:scale-90"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-end gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2 min-w-0">
              <textarea
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={editingMessageId ? t("support.editMessagePlaceholder", "Edit message…") : t("support.messagePlaceholder", "Message OXEN Support…")}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none max-h-24 min-w-0"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={() => { setShowEmoji((v) => !v); setShowAttach(false); }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground active:scale-90"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleSend}
              disabled={!messageText.trim()}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
                messageText.trim()
                  ? "gold-gradient text-primary-foreground shadow-lg"
                  : "bg-white/[0.06] text-muted-foreground",
              )}
            >
              <Send className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  /* ── Category list view ── */

  return (
    <div className="relative mx-auto max-w-2xl px-4 pt-2 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pt-2 pb-4"
      >
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-extrabold truncate flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            {t("support.title", "Help & Support")}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {t("support.hereToHelp", "We're here to help")} · {totalUnread > 0 ? `${totalUnread} ${t("settings.unread", "new")}` : t("settings.caughtUp", "All caught up")}
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative mb-4"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("support.search", "Search support categories…")}
          className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] py-3 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </motion.div>

      {/* Category list */}
      <div className="space-y-2">
        {filteredCategories.map((cat, i) => {
          const lastMsg = getLastMessage(cat.id);
          const unread = unreadCount(cat.id);

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, type: "spring" as const, stiffness: 300, damping: 26 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSearchParams({ category: cat.id })}
              className="glass flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:border-white/[0.12]"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold truncate">{t(cat.labelKey, cat.label)}</p>
                  {lastMsg && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(lastMsg.createdAt)}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {lastMsg
                    ? lastMsg.type === "image"
                      ? `📷 ${t("support.photo", "Photo")}`
                      : lastMsg.type === "video"
                        ? `🎥 ${t("support.video", "Video")}`
                        : lastMsg.type === "file"
                          ? `📎 ${t("support.file", "File")}`
                          : lastMsg.deletedForEveryone
                            ? `🚫 ${t("support.messageDeleted", "Message deleted")}`
                            : lastMsg.content
                    : t(cat.descriptionKey, cat.description)}
                </p>
              </div>
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                  {unread}
                </span>
              )}
              {!lastMsg && !unread && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("support.noCategories", "No support categories found")}</p>
        </div>
      )}

      {/* Info footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4 text-center"
      >
        <p className="text-xs text-muted-foreground/70">
          {t("support.urgentHelp", "Need urgent help? Our support team typically responds within a few minutes.")}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/40">
          {t("support.confidential", "All conversations are stored securely and confidentially.")}
        </p>
      </motion.div>
    </div>
  );
}
