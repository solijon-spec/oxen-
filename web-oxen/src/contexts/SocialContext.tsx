import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getConversations,
  getTotalUnreadCount,
  subscribeToConversations,
  subscribeToFollows,
  type Conversation,
} from "@/lib/social";

interface SocialContextValue {
  /** Conversations list with last message + unread count. */
  conversations: Conversation[];
  /** Total unread messages across all conversations. */
  totalUnread: number;
  /** Refresh conversations list from server. */
  refreshConversations: () => Promise<void>;
  /** True while loading initial data. */
  loading: boolean;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnread, setTotalUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshConversations = useCallback(async () => {
    const [convs, unread] = await Promise.all([
      getConversations(),
      getTotalUnreadCount(),
    ]);
    setConversations(convs);
    setTotalUnread(unread);
  }, []);

  // Load conversations when user authenticates
  useEffect(() => {
    if (!user || user.isGuest) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      await refreshConversations();
      if (active) setLoading(false);
    })();

    return () => { active = false; };
  }, [user?.id, user?.isGuest, refreshConversations]);

  // Realtime subscription for conversation/message updates
  useEffect(() => {
    if (!user || user.isGuest) return;

    const unsub = subscribeToConversations(() => {
      void refreshConversations();
    });

    return () => { unsub(); };
  }, [user?.id, user?.isGuest, refreshConversations]);

  // Realtime subscription for follow updates (refreshes counts indirectly)
  useEffect(() => {
    if (!user || user.isGuest) return;

    const unsub = subscribeToFollows(() => {
      // Follow changes don't need to refresh conversations,
      // but could refresh profile counts in the future.
    });

    return () => { unsub(); };
  }, [user?.id, user?.isGuest]);

  const value = useMemo<SocialContextValue>(
    () => ({
      conversations,
      totalUnread,
      refreshConversations,
      loading,
    }),
    [conversations, totalUnread, refreshConversations, loading],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialContextValue {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within a SocialProvider");
  return ctx;
}
