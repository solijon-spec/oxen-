import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, MapPin, Globe2, Clock, Check, X, Download,
  Smartphone, Monitor, Laptop,
} from "lucide-react";

import SettingsPageShell, { Card, SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LoginEvent {
  id: string;
  date: string;
  time: string;
  ip: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  success: boolean;
  device: "smartphone" | "laptop" | "monitor";
}

const MOCK_HISTORY: LoginEvent[] = [
  { id: "1", date: "2026-07-06", time: "14:32", ip: "85.65.12.34", country: "Uzbekistan", city: "Tashkent", browser: "Safari 17", os: "iOS 18", success: true, device: "smartphone" },
  { id: "2", date: "2026-07-06", time: "08:15", ip: "85.65.12.34", country: "Uzbekistan", city: "Tashkent", browser: "Chrome 125", os: "macOS 14", success: true, device: "laptop" },
  { id: "3", date: "2026-07-05", time: "22:41", ip: "91.196.44.12", country: "Uzbekistan", city: "Samarkand", browser: "Edge 125", os: "Windows 11", success: true, device: "monitor" },
  { id: "4", date: "2026-07-05", time: "09:03", ip: "45.22.11.99", country: "Unknown", city: "Unknown", browser: "Chrome 125", os: "Android 14", success: false, device: "smartphone" },
  { id: "5", date: "2026-07-04", time: "18:27", ip: "85.65.12.34", country: "Uzbekistan", city: "Tashkent", browser: "Safari 17", os: "iOS 18", success: true, device: "smartphone" },
  { id: "6", date: "2026-07-03", time: "12:10", ip: "78.111.22.55", country: "Uzbekistan", city: "Bukhara", browser: "Chrome 125", os: "Android 14", success: true, device: "smartphone" },
  { id: "7", date: "2026-07-02", time: "16:55", ip: "45.22.11.99", country: "Unknown", city: "Unknown", browser: "Firefox 127", os: "Linux", success: false, device: "laptop" },
];

const DEVICE_ICONS = { smartphone: Smartphone, laptop: Laptop, monitor: Monitor };

export default function LoginActivity() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  const filtered = useMemo(() => {
    if (filter === "success") return MOCK_HISTORY.filter((e) => e.success);
    if (filter === "failed") return MOCK_HISTORY.filter((e) => !e.success);
    return MOCK_HISTORY;
  }, [filter]);

  const successCount = MOCK_HISTORY.filter((e) => e.success).length;
  const failedCount = MOCK_HISTORY.filter((e) => !e.success).length;

  const handleExport = useCallback((format: "csv" | "pdf") => {
    const headers = ["Date", "Time", "IP", "Country", "City", "Browser", "OS", "Status"];
    const rows = MOCK_HISTORY.map((e) => [
      e.date, e.time, e.ip, e.country, e.city, e.browser, e.os, e.success ? "Success" : "Failed",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxen-login-history.${format === "csv" ? "csv" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `History exported as ${format.toUpperCase()}` });
  }, [toast]);

  return (
    <SettingsPageShell
      title="Login Activity"
      subtitle="Your recent sign-in history"
      icon={<Activity className="h-4.5 w-4.5" />}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="font-display text-2xl font-extrabold text-emerald-400">{successCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Successful</p>
        </div>
        <div className="glass rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="font-display text-2xl font-extrabold text-red-400">{failedCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { id: "all" as const, label: "All" },
          { id: "success" as const, label: "Successful" },
          { id: "failed" as const, label: "Failed" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95",
              filter === tab.id
                ? "bg-primary text-primary-foreground shadow-lg"
                : "border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History list */}
      <Card>
        {filtered.map((event) => {
          const Icon = DEVICE_ICONS[event.device];
          return (
            <div key={event.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                event.success ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
              )}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">
                    {event.city}, {event.country}
                  </p>
                  {event.success ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400">
                      <X className="h-2.5 w-2.5" /> Failed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {event.browser} · {event.os}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/70">
                  <span className="flex items-center gap-0.5">
                    <Globe2 className="h-2.5 w-2.5" /> {event.ip}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> {event.date} {event.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Export */}
      <SectionLabel>Export History</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleExport("csv")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.08] active:scale-95"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
        <button
          onClick={() => handleExport("pdf")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.08] active:scale-95"
        >
          <Download className="h-4 w-4" /> PDF
        </button>
      </div>
    </SettingsPageShell>
  );
}
