import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Data models                                                        */
/* ------------------------------------------------------------------ */

export type SupportMessageStatus = "sending" | "sent" | "delivered" | "read";
export type SupportMediaType = "text" | "image" | "video" | "file";

export interface SupportMessage {
  id: string;
  categoryId: string;
  senderId: string; // "user" | "developer"
  senderName: string;
  senderAvatar: string | null;
  type: SupportMediaType;
  content: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string | null; // message id being replied to
  status: SupportMessageStatus;
  createdAt: number;
  editedAt?: number;
  deletedForEveryone?: boolean;
}

export interface SupportCategory {
  id: string;
  label: string;
  description: string;
  labelKey: string;
  descriptionKey: string;
  icon: string; // emoji or lucide name key
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Categories — predefined support topics                             */
/* ------------------------------------------------------------------ */

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  { id: "general", label: "General Support", labelKey: "support.category.general", description: "Questions about the app, features, or your account", descriptionKey: "support.categoryDesc.general", icon: "💬", color: "#3B82F6" },
  { id: "account", label: "Account & Security", labelKey: "support.category.account", description: "Login, password, privacy, and account settings", descriptionKey: "support.categoryDesc.account", icon: "🔐", color: "#8B5CF6" },
  { id: "bookings", label: "Travel & Bookings", labelKey: "support.category.bookings", description: "Trips, itineraries, bookings, and travel plans", descriptionKey: "support.categoryDesc.bookings", icon: "✈️", color: "#F59E0B" },
  { id: "payments", label: "Payments & Billing", labelKey: "support.category.payments", description: "Subscriptions, refunds, and payment issues", descriptionKey: "support.categoryDesc.payments", icon: "💳", color: "#10B981" },
  { id: "bug", label: "Report a Bug", labelKey: "support.category.bug", description: "Something not working? Tell us what happened", descriptionKey: "support.categoryDesc.bug", icon: "🐞", color: "#EF4444" },
  { id: "feedback", label: "Feature Request", labelKey: "support.category.feedback", description: "Suggest new features or improvements", descriptionKey: "support.categoryDesc.feedback", icon: "💡", color: "#F97316" },
  { id: "safety", label: "Safety & Reports", labelKey: "support.category.safety", description: "Report users, content, or safety concerns", descriptionKey: "support.categoryDesc.safety", icon: "🛡️", color: "#EC4899" },
  { id: "technical", label: "Technical Issues", labelKey: "support.category.technical", description: "App crashes, loading problems, performance", descriptionKey: "support.categoryDesc.technical", icon: "⚙️", color: "#6366F1" },
];

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

interface SupportContextValue {
  categories: SupportCategory[];
  getCategoryMessages: (categoryId: string) => SupportMessage[];
  sendMessage: (categoryId: string, type: SupportMediaType, content: string, fileName?: string, fileSize?: number, replyTo?: string | null) => void;
  editMessage: (categoryId: string, messageId: string, newContent: string) => void;
  deleteMessage: (categoryId: string, messageId: string, forEveryone: boolean) => void;
  markCategoryRead: (categoryId: string) => void;
  setTyping: (categoryId: string, isTyping: boolean) => void;
  isTyping: (categoryId: string) => boolean;
  unreadCount: (categoryId: string) => number;
  totalUnread: number;
  getLastMessage: (categoryId: string) => SupportMessage | null;
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const SUPPORT_KEY = "oxen.support.messages";
const TYPING_KEY = "oxen.support.typing";
const CURRENT_USER = { id: "user", name: "You", avatar: null as string | null };
const DEVELOPER = { id: "developer", name: "OXEN Support", avatar: "🛡️" };

const SupportContext = createContext<SupportContextValue | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

/* ------------------------------------------------------------------ */
/*  Developer auto-replies — context-aware responses                    */
/* ------------------------------------------------------------------ */

const DEV_REPLIES: Record<string, string[]> = {
  general: [
    "Hi! Welcome to OXEN Support 🌍 How can I help you today?",
    "Thanks for reaching out! Our team will look into this right away.",
    "Is there anything else I can help you with?",
  ],
  account: [
    "I understand you're having account issues. Can you share your registered email?",
    "For security, we've sent a verification link. Please check your inbox.",
    "Your account security is our priority. The issue has been escalated to our security team.",
  ],
  bookings: [
    "Let me check your travel booking details... 🔍",
    "Your itinerary has been updated successfully! ✈️",
    "Would you like me to help you modify your travel dates?",
  ],
  payments: [
    "I can see your payment concern. Could you share the transaction ID?",
    "A refund has been initiated and should appear in 3-5 business days. 💳",
    "Your subscription has been updated. Is there anything else about billing?",
  ],
  bug: [
    "Thanks for reporting this bug! 🐞 Can you share steps to reproduce it?",
    "I've logged this issue with our engineering team. Ticket #OX-" + Math.floor(Math.random() * 9000 + 1000) + " has been created.",
    "The fix is being worked on and will be in the next update. Thank you for your patience!",
  ],
  feedback: [
    "Thank you for your feature suggestion! 💡 We love hearing from our community.",
    "This is a great idea — I've forwarded it to our product team.",
    "We'll consider this for a future release. Stay tuned to our updates!",
  ],
  safety: [
    "We take safety reports very seriously. 🛡️ Our moderation team is reviewing this now.",
    "The reported content has been flagged for immediate review.",
    "Appropriate action will be taken within 24 hours. Thank you for helping keep OXEN safe.",
  ],
  technical: [
    "Let me help you with this technical issue. ⚙️ Have you tried clearing the app cache?",
    "Can you share what device and browser you're using?",
    "We've identified a potential issue and are deploying a fix. Please try again shortly.",
  ],
};

function pickDevReply(categoryId: string, messageCount: number): string {
  const replies = DEV_REPLIES[categoryId] ?? DEV_REPLIES.general;
  // Pick reply based on position in conversation for contextual flow
  const idx = Math.min(messageCount, replies.length - 1);
  return replies[idx];
}

/* ------------------------------------------------------------------ */
/*  Notification email — stored for backend processing                  */
/*  (Emails are notification-only, never used as chat)                 */
/* ------------------------------------------------------------------ */

const NOTIFICATION_EMAILS = ["solisulhiddinov@gmail.com", "az1mboevvv@gmail.com"];

function queueEmailNotification(categoryId: string, categoryName: string, messageContent: string, messageType: SupportMediaType): void {
  // In a real backend this would call a Supabase edge function.
  // For now, we store the notification in localStorage so a backend
  // worker or edge function can pick it up and send the email.
  try {
    const notifications = load<any[]>("oxen.support.email_queue", []);
    notifications.push({
      id: crypto.randomUUID(),
      to: NOTIFICATION_EMAILS,
      subject: `[OXEN Support] New ${messageType === "text" ? "message" : messageType} in ${categoryName}`,
      body: `A user sent a new support message.\n\nCategory: ${categoryName}\nType: ${messageType}\nContent: ${messageType === "text" ? messageContent : `[${messageType} attachment]`}\nTimestamp: ${new Date().toISOString()}`,
      createdAt: Date.now(),
      sent: false,
    });
    save("oxen.support.email_queue", notifications);
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function SupportProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [typingState, setTypingState] = useState<Record<string, boolean>>({});
  const [readState, setReadState] = useState<Record<string, number>>({}); // categoryId -> lastReadTimestamp

  useEffect(() => {
    const stored = load<SupportMessage[]>(SUPPORT_KEY, []);
    setMessages(stored);
    const storedTyping = load<Record<string, boolean>>(TYPING_KEY, {});
    setTypingState(storedTyping);
  }, []);

  const persistMessages = useCallback((next: SupportMessage[]) => {
    save(SUPPORT_KEY, next);
  }, []);

  const persistTyping = useCallback((next: Record<string, boolean>) => {
    save(TYPING_KEY, next);
  }, []);

  const getCategoryMessages = useCallback(
    (categoryId: string): SupportMessage[] =>
      messages.filter((m) => m.categoryId === categoryId).sort((a, b) => a.createdAt - b.createdAt),
    [messages],
  );

  const getLastMessage = useCallback(
    (categoryId: string): SupportMessage | null => {
      const msgs = messages.filter((m) => m.categoryId === categoryId);
      if (msgs.length === 0) return null;
      return msgs.reduce((latest, m) => (m.createdAt > latest.createdAt ? m : latest));
    },
    [messages],
  );

  const updateMessage = useCallback(
    (categoryId: string, messageId: string, updater: (m: SupportMessage) => SupportMessage) => {
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === messageId ? updater(m) : m));
        persistMessages(next);
        return next;
      });
    },
    [persistMessages],
  );

  const sendMessage = useCallback(
    (
      categoryId: string,
      type: SupportMediaType,
      content: string,
      fileName?: string,
      fileSize?: number,
      replyTo?: string | null,
    ) => {
      const category = SUPPORT_CATEGORIES.find((c) => c.id === categoryId);
      const now = Date.now();
      const msg: SupportMessage = {
        id: crypto.randomUUID(),
        categoryId,
        senderId: CURRENT_USER.id,
        senderName: CURRENT_USER.name,
        senderAvatar: CURRENT_USER.avatar,
        type,
        content,
        fileName,
        fileSize,
        replyTo: replyTo ?? null,
        status: "sending",
        createdAt: now,
      };

      setMessages((prev) => {
        const next = [...prev, msg];
        persistMessages(next);
        return next;
      });

      // Queue email notification to developers
      queueEmailNotification(categoryId, category?.label ?? "General", content, type);

      // Simulate status progression: sending → sent → delivered
      setTimeout(() => updateMessage(categoryId, msg.id, (m) => ({ ...m, status: "sent" })), 250);
      setTimeout(() => updateMessage(categoryId, msg.id, (m) => ({ ...m, status: "delivered" })), 800);

      // Developer typing indicator
      const existingMsgs = messages.filter((m) => m.categoryId === categoryId);
      setTimeout(() => {
        setTypingState((prev) => {
          const next = { ...prev, [categoryId]: true };
          persistTyping(next);
          return next;
        });
      }, 1200);

      // Developer auto-reply with realistic delay
      setTimeout(() => {
        setTypingState((prev) => {
          const next = { ...prev, [categoryId]: false };
          persistTyping(next);
          return next;
        });

        const replyText = pickDevReply(categoryId, Math.floor(existingMsgs.length / 2));
        const replyMsg: SupportMessage = {
          id: crypto.randomUUID(),
          categoryId,
          senderId: DEVELOPER.id,
          senderName: DEVELOPER.name,
          senderAvatar: DEVELOPER.avatar,
          type: "text",
          content: replyText,
          status: "delivered",
          createdAt: Date.now(),
        };
        setMessages((prev) => {
          const next = [...prev, replyMsg];
          persistMessages(next);
          return next;
        });

        // If user hasn't opened this category, mark as unread
        setReadState((prev) => {
          const lastRead = prev[categoryId] ?? 0;
          if (lastRead < replyMsg.createdAt) {
            // unread — don't update readState
          }
          return prev;
        });
      }, 2500);
    },
    [messages, persistMessages, persistTyping, updateMessage],
  );

  const editMessage = useCallback(
    (categoryId: string, messageId: string, newContent: string) => {
      updateMessage(categoryId, messageId, (m) => ({
        ...m,
        content: newContent,
        editedAt: Date.now(),
      }));
    },
    [updateMessage],
  );

  const deleteMessage = useCallback(
    (categoryId: string, messageId: string, forEveryone: boolean) => {
      setMessages((prev) => {
        if (forEveryone) {
          const next = prev.map((m) =>
            m.id === messageId
              ? { ...m, deletedForEveryone: true, content: "", type: "text" as SupportMediaType }
              : m,
          );
          persistMessages(next);
          return next;
        }
        // Delete for me — remove from view
        const next = prev.filter((m) => m.id !== messageId);
        persistMessages(next);
        return next;
      });
    },
    [persistMessages],
  );

  const markCategoryRead = useCallback(
    (categoryId: string) => {
      setReadState((prev) => ({ ...prev, [categoryId]: Date.now() }));
      // Mark all developer messages as read
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.categoryId === categoryId && m.senderId === DEVELOPER.id
            ? { ...m, status: "read" as SupportMessageStatus }
            : m,
        );
        persistMessages(next);
        return next;
      });
    },
    [persistMessages],
  );

  const setTyping = useCallback(
    (categoryId: string, isTyping: boolean) => {
      setTypingState((prev) => {
        const next = { ...prev, [categoryId]: isTyping };
        persistTyping(next);
        return next;
      });
    },
    [persistTyping],
  );

  const isTypingFn = useCallback(
    (categoryId: string): boolean => typingState[categoryId] ?? false,
    [typingState],
  );

  const unreadCount = useCallback(
    (categoryId: string): number => {
      const lastRead = readState[categoryId] ?? 0;
      return messages.filter(
        (m) => m.categoryId === categoryId && m.senderId === DEVELOPER.id && m.createdAt > lastRead,
      ).length;
    },
    [messages, readState],
  );

  const totalUnread = useMemo(
    () => SUPPORT_CATEGORIES.reduce((sum, cat) => sum + unreadCount(cat.id), 0),
    [unreadCount],
  );

  const value = useMemo<SupportContextValue>(
    () => ({
      categories: SUPPORT_CATEGORIES,
      getCategoryMessages,
      sendMessage,
      editMessage,
      deleteMessage,
      markCategoryRead,
      setTyping,
      isTyping: isTypingFn,
      unreadCount,
      totalUnread,
      getLastMessage,
    }),
    [getCategoryMessages, sendMessage, editMessage, deleteMessage, markCategoryRead, setTyping, isTypingFn, unreadCount, totalUnread, getLastMessage],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport(): SupportContextValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error("useSupport must be used within a SupportProvider");
  return ctx;
}
