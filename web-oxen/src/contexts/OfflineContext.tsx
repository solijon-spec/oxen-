import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Offline context — tracks connectivity, force-offline toggle, sync  */
/* ------------------------------------------------------------------ */

interface OfflineContextValue {
  isOnline: boolean;
  forceOffline: boolean;
  setForceOffline: (v: boolean) => void;
  isOffline: boolean;
  pendingSync: boolean;
  markPendingSync: () => void;
  sync: () => Promise<void>;
  lastSyncedAt: number | null;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

const OFFLINE_KEY = "oxen.force-offline";
const SYNC_KEY = "oxen.last-sync";

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [forceOffline, setForceOfflineState] = useState<boolean>(false);
  const [pendingSync, setPendingSync] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      setForceOfflineState(localStorage.getItem(OFFLINE_KEY) === "true");
      const sync = localStorage.getItem(SYNC_KEY);
      if (sync) setLastSyncedAt(Number(sync));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const setForceOffline = useCallback((v: boolean) => {
    setForceOfflineState(v);
    try {
      localStorage.setItem(OFFLINE_KEY, String(v));
    } catch {
      // ignore
    }
  }, []);

  const markPendingSync = useCallback(() => setPendingSync(true), []);

  const sync = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800));
    const now = Date.now();
    setLastSyncedAt(now);
    setPendingSync(false);
    try {
      localStorage.setItem(SYNC_KEY, String(now));
    } catch {
      // ignore
    }
  }, []);

  const isOffline = forceOffline || !isOnline;

  useEffect(() => {
    if (!isOffline && pendingSync) {
      sync();
    }
  }, [isOffline, pendingSync, sync]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      forceOffline,
      setForceOffline,
      isOffline,
      pendingSync,
      markPendingSync,
      sync,
      lastSyncedAt,
    }),
    [isOnline, forceOffline, setForceOffline, isOffline, pendingSync, markPendingSync, sync, lastSyncedAt],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within an OfflineProvider");
  return ctx;
}
