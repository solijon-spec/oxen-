import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Image, FileText, Download, AlertTriangle, Check, Loader2,
  HardDrive,
} from "lucide-react";

import SettingsPageShell, { Card, SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CacheInfo {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  size: string;
  color: string;
}

export default function ClearCache() {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [cacheInfo] = useState<CacheInfo[]>([
    { label: "Cached Images", icon: Image, size: "24.6 MB", color: "text-blue-400" },
    { label: "Offline Files", icon: FileText, size: "12.3 MB", color: "text-violet-400" },
    { label: "Downloaded Data", icon: Download, size: "8.1 MB", color: "text-amber-400" },
    { label: "Temporary Storage", icon: HardDrive, size: "5.2 MB", color: "text-emerald-400" },
  ]);

  const totalSize = "50.2 MB";
  const [currentSize, setCurrentSize] = useState(totalSize);

  const handleClear = useCallback(async () => {
    setClearing(true);
    // Simulate clearing cache
    await new Promise((r) => setTimeout(r, 1500));
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      sessionStorage.clear();
    } catch {
      // ignore
    }
    setClearing(false);
    setCleared(true);
    setCurrentSize("0 MB");
    toast({
      title: "Cache cleared",
      description: "50.2 MB of temporary data has been removed.",
    });
    setTimeout(() => { setCleared(false); setConfirming(false); }, 2500);
  }, [toast]);

  return (
    <SettingsPageShell
      title="Clear Cache"
      subtitle={`Temporary storage: ${currentSize}`}
      icon={<Trash2 className="h-4.5 w-4.5" />}
    >
      {/* Warning banner */}
      <div className="glass flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-400">What will be cleared?</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            This removes cached images, offline files, and temporary data. Your account,
            bookings, trips, and personal data will not be affected.
          </p>
        </div>
      </div>

      {/* Cache breakdown */}
      <SectionLabel>Storage Breakdown</SectionLabel>
      <Card>
        {cacheInfo.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
            <span className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]",
              item.color,
            )}>
              <item.icon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{item.label}</p>
            </div>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              cleared ? "text-emerald-400" : "text-muted-foreground",
            )}>
              {cleared ? "0 MB" : item.size}
            </span>
          </div>
        ))}
      </Card>

      {/* Total */}
      <div className="glass flex items-center justify-between rounded-2xl border border-white/[0.06] p-4">
        <span className="text-sm font-bold">Total Cache</span>
        <span className={cn(
          "font-display text-lg font-extrabold tabular-nums",
          cleared ? "text-emerald-400" : "text-primary",
        )}>
          {currentSize}
        </span>
      </div>

      {/* Confirmation / Clear button */}
      <AnimatePresence mode="wait">
        {!confirming ? (
          <motion.div
            key="clear-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PrimaryButton
              onClick={() => setConfirming(true)}
              disabled={cleared}
              className={cn(
                cleared
                  ? "bg-emerald-500 text-white"
                  : "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
              )}
            >
              {cleared ? (
                <><Check className="h-5 w-5" /> Cache Cleared</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Clear Cache</>
              )}
            </PrimaryButton>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="glass rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-center">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
              <p className="text-sm font-bold">Are you sure?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This will remove {totalSize} of cached data. The app may be slightly slower
                while it re-downloads essential resources.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-2xl border border-white/[0.08] py-3.5 text-sm font-semibold text-muted-foreground transition hover:bg-white/[0.04] active:scale-95"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleClear}
                disabled={clearing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {clearing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Clearing...</>
                ) : (
                  "Confirm Clear"
                )}
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsPageShell>
  );
}
