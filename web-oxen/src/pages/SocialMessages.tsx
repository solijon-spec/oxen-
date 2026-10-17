import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Search, Check, CheckCheck, Camera,
  Image as ImageIcon, Smile, MoreVertical, X, MessageSquare,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useSocial } from "@/contexts/SocialContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getMessages, sendMessage, markConversationRead, subscribeToMessages,
  getSocialProfile, getSocialProfileForConversation, resolveDisplayName,
  formatMessageTime, formatChatTime, formatDateDivider,
  getInitials, type ChatMessage, type SocialProfile,
} from "@/lib/social";
import { cn } from "@/lib/utils";

const EMOJIS = ["😀", "😂", "😍", "🥰", "😎", "🤔", "😢", "😡", "👍", "👎", "❤️", "🔥", "✨", "🎉", "🚀", "🌍", "✈️", "🏝️", "📸", "🙌"];

/**
 * Social Messages page — real conversation list + real-time chat.
 * Replaces the demo ChatContext-based Messages for authenticated users.
 * Route: /messages (list) or /messages?conv=<id> (chat view)
 */
export default function SocialMessages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { conversations, refreshConversations, loading } = useSocial();
  const { toast } = useToast();

  const activeConvId = searchParams.get("conv");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<SocialProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.other_user?.name ?? "").toLowerCase();
    const username = (c.other_user?.username ?? "").toLowerCase();
    const lastMsg = (c.last_message?.content ?? "").toLowerCase();
    return name.includes(q) || username.includes(q) || lastMsg.includes(q);
  });

  // Load messages when a conversation is opened
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setOtherUser(null);
      return;
    }

    let active = true;
    setMessagesLoading(true);
    setProfileLoading(true);

    void (async () => {
      // Find the conversation in our list to get the other user
      const conv = conversations.find((c) => c.id === activeConvId);
      if (conv?.other_user) {
        if (active) setOtherUser(conv.other_user);
        if (active) setProfileLoading(false);
      } else {
        // Fallback: fetch the other participant's profile directly
        const profile = await getSocialProfileForConversation(activeConvId, currentUser?.id ?? "");
        if (active) {
          setOtherUser(profile);
          setProfileLoading(false);
        }
      }

      // Load messages
      const msgs = await getMessages(activeConvId, 100);
      if (!active) return;
      setMessages(msgs);
      setMessagesLoading(false);

      // Mark as read
      await markConversationRead(activeConvId);
      void refreshConversations();
    })();

    // Subscribe to new messages in real time
    const unsub = subscribeToMessages(activeConvId, (newMsg) => {
      if (!active) return;
      setMessages((prev) => {
        // Avoid duplicates — check if message already exists
        const exists = prev.some((m) => m.id === newMsg.id);
        if (exists) {
          // Update existing (e.g. is_read changed)
          return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
        }
        return [...prev, newMsg];
      });

      // If the message is from the other user, mark as read
      if (newMsg.sender_id !== currentUser?.id) {
        void markConversationRead(activeConvId);
      }
      void refreshConversations();
    });

    return () => {
      active = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, currentUser?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !activeConvId || sending) return;
    const content = messageText.trim();
    setMessageText("");
    setShowEmoji(false);
    setSending(true);

    try {
      const { error, message } = await sendMessage(activeConvId, content);
      if (error) {
        toast({ title: "Failed to send", description: error, variant: "destructive" });
        setMessageText(content); // Restore the text so the user can retry
        return;
      }
      if (message) {
        setMessages((prev) => {
          // Avoid duplicates
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
      void refreshConversations();
    } finally {
      setSending(false);
    }
  }, [messageText, activeConvId, sending, toast, refreshConversations]);

  const handleEmoji = useCallback((emoji: string) => {
    setMessageText((prev) => prev + emoji);
  }, []);

  // ── Chat view (full screen) ──
  if (activeConvId) {
    const displayName = resolveDisplayName(otherUser);
    let lastDateDivider = "";

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
          <button
            onClick={() => otherUser && navigate(`/user/${otherUser.id}`)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div className="relative shrink-0">
              {profileLoading ? (
                <div className="h-10 w-10 rounded-full bg-white/[0.06] animate-pulse" />
              ) : otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-primary/30 text-sm font-bold">
                  {getInitials(displayName)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {profileLoading ? (
                <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse" />
              ) : (
                <p className="text-sm font-bold truncate">{displayName}</p>
              )}
              {!profileLoading && otherUser?.username && (
                <p className="text-xs text-muted-foreground truncate">@{otherUser.username}</p>
              )}
            </div>
          </button>
        </motion.div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 overscroll-contain">
          {messagesLoading && (
            <div className="flex h-full items-center justify-center">
              <div className="oxen-skeleton-globe" aria-label="Loading" />
            </div>
          )}

          {!messagesLoading && messages.length === 0 && !profileLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Send className="h-7 w-7 text-white/20" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Say hello to {displayName}!</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Start a conversation by sending a message below.</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.sender_id === currentUser?.id;
            const dateDivider = formatDateDivider(msg.created_at);
            const showDivider = dateDivider !== lastDateDivider;
            lastDateDivider = dateDivider;

            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="flex justify-center my-4">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {dateDivider}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2), type: "spring" as const, stiffness: 400, damping: 28 }}
                  className={cn("flex", isMe ? "justify-end" : "justify-start")}
                >
                  <div className={cn("max-w-[78%]", isMe ? "items-end" : "items-start")}>
                    <div className={cn("relative px-4 py-2.5", isMe ? "chat-bubble-sent" : "chat-bubble-received")}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <div className={cn("flex items-center gap-1 mt-1 px-1", isMe ? "justify-end" : "justify-start")}>
                      <span className="text-[10px] text-muted-foreground">{formatChatTime(msg.created_at)}</span>
                      {isMe && (
                        <span className="text-muted-foreground">
                          {msg.is_read ? (
                            <CheckCheck className="h-3 w-3 text-blue-400" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji panel */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="chat-input-area px-4 py-3 shrink-0"
            >
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
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

        {/* Input area */}
        <div className="chat-input-area px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2 min-w-0">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                placeholder="Message..."
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none max-h-24 min-w-0"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={() => setShowEmoji((v) => !v)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground active:scale-90"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => void handleSend()}
              disabled={!messageText.trim() || sending}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
                messageText.trim() && !sending
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

  // ── Conversation list view ──
  return (
    <div className="relative mx-auto max-w-2xl px-3 pt-2 pb-28 sm:px-4">
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
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold truncate">Messages</h1>
          <p className="text-xs text-muted-foreground truncate">Direct messages with travelers</p>
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
          placeholder="Search conversations..."
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

      {/* Conversation list */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="oxen-skeleton-globe" aria-label="Loading" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
            <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {searchQuery ? "No conversations found" : "No conversations yet"}
          </p>
          {!searchQuery && (
            <p className="mt-1 text-xs text-muted-foreground/60">
              Search for people and start a conversation
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv, i) => {
            const lastMsg = conv.last_message;
            const unread = conv.unread_count;
            const displayName = resolveDisplayName(conv.other_user);
            const isProfileLoading = !conv.other_user;

            return (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, type: "spring" as const, stiffness: 300, damping: 26 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSearchParams({ conv: conv.id })}
                className="glass flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:border-white/[0.12]"
              >
                <div className="relative shrink-0">
                  {isProfileLoading ? (
                    <div className="h-12 w-12 rounded-full bg-white/[0.06] animate-pulse" />
                  ) : conv.other_user?.avatar_url ? (
                    <img
                      src={conv.other_user.avatar_url}
                      alt={displayName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-primary/30 text-lg font-bold">
                      {getInitials(displayName)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    {isProfileLoading ? (
                      <div className="h-4 w-20 rounded bg-white/[0.06] animate-pulse" />
                    ) : (
                      <p className="text-sm font-bold truncate">{displayName}</p>
                    )}
                    {lastMsg && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatMessageTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lastMsg
                      ? lastMsg.message_type === "image"
                        ? "📷 Photo"
                        : lastMsg.message_type === "video"
                          ? "🎥 Video"
                          : lastMsg.content || "Message deleted"
                      : !isProfileLoading && conv.other_user?.username
                        ? `@${conv.other_user.username}`
                        : "Tap to start chatting"}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                    {unread}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}


