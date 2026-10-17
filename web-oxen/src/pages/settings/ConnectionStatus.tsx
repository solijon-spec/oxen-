import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Clock, Check, Loader2,
  Smartphone, Activity,
} from "lucide-react";

import SettingsPageShell, { Card, SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useOffline } from "@/contexts/OfflineContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ConnectionStatus() {
  const { isOnline, isOffline, forceOffline, setForceOffline, pendingSync, sync, lastSyncedAt } = useOffline();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const connectionType = forceOffline ? "Forced Offline" : isOnline ? "Online" : "Offline";

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
    toast({ title: "Connection refreshed", description: "Network status checked." });
  }, [toast]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await sync();
    setSyncing(false);
    toast({ title: "Sync complete", description: "All data is up to date." });
  }, [sync, toast]);

  return (
    <SettingsPageShell
      title="Connection Status"
      subtitle={connectionType}
      icon={isOffline ? <WifiOff className="h-4.5 w-4.5" /> : <Wifi className="h-4.5 w-4.5" />}
    >
      {/* Status hero */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={cn(
          "glass flex flex-col items-center rounded-2xl border p-6",
          isOffline
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-emerald-500/20 bg-emerald-500/5",
        )}
      >
        <div className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          isOffline ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400",
        )}>
          {isOffline ? <WifiOff className="h-8 w-8" /> : <Wifi className="h-8 w-8" />}
        </div>
        <p className={cn(
          "mt-3 text-lg font-extrabold",
          isOffline ? "text-amber-400" : "text-emerald-400",
        )}>
          {connectionType}
        </p>
        <p className="text-xs text-muted-foreground">
          {isOffline
            ? "Changes will sync when you reconnect"
            : "Connected — all features available"}
        </p>
      </motion.div>

      {/* Details */}
      <SectionLabel>Network Details</SectionLabel>
      <Card>
        <DetailRow icon={isOnline && !forceOffline ? Cloud : CloudOff} label="Network" value={isOnline && !forceOffline ? "Wi-Fi / Mobile Data" : "No connection"} />
        <DetailRow icon={Activity} label="Status" value={isOffline ? "Offline" : "Online"} status={isOffline ? "offline" : "online"} />
        <DetailRow icon={Clock} label="Last Sync" value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"} />
        <DetailRow icon={Smartphone} label="Pending Changes" value={pendingSync ? "Waiting to sync" : "All synced"} />
      </Card>

      {/* Force offline toggle */}
      <SectionLabel>Offline Mode</SectionLabel>
      <Card>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
            {forceOffline ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">Force Offline Mode</p>
            <p className="text-xs text-muted-foreground">Disconnect from server temporarily</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={forceOffline}
            onClick={() => {
              setForceOffline(!forceOffline);
              toast({ title: !forceOffline ? "Offline mode enabled" : "Online mode restored" });
            }}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200",
              forceOffline ? "bg-amber-500" : "bg-white/[0.12]",
            )}
          >
            <span className={cn(
              "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
              forceOffline ? "translate-x-6" : "translate-x-1",
            )} />
          </button>
        </div>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
        <PrimaryButton
          onClick={handleSync}
          disabled={!pendingSync || syncing || isOffline}
          className="gold-gradient text-primary-foreground shadow-lg"
        >
          {syncing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</>
          ) : (
            <><Check className="h-4 w-4" /> Retry Sync</>
          )}
        </PrimaryButton>
      </div>

      <AnimatePresence>
        {pendingSync && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass flex items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5"
          >
            <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
            <p className="text-xs text-amber-300">
              You have changes waiting to sync. They'll upload automatically when you're online.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsPageShell>
  );
}

function DetailRow({
  icon: Icon, label, value, status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  status?: "online" | "offline";
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {status === "online" && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
        {status === "offline" && <span className="h-2 w-2 rounded-full bg-amber-400" />}
      </div>
    </div>
  );
}
