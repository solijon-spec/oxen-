import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Search, Check, MapPin, Globe2 } from "lucide-react";

import SettingsPageShell, { Card, SectionLabel } from "@/components/SettingsPageShell";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** A curated subset of common IANA timezones for the picker. */
const COMMON_TIMEZONES: string[] = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Tehran",
  "Asia/Karachi",
  "Asia/Tashkent",
  "Asia/Almaty",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Yerevan",
  "Asia/Baku",
  "Asia/Kabul",
];

function getTimezoneOffset(tz: string): string {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(date);
    const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return offset;
  } catch {
    return "";
  }
}

function getTimezoneLabel(tz: string): string {
  return tz.replace(/_/g, " ").replace(/\//g, " — ");
}

export default function TimeZoneSettings() {
  const { timezone, setTimezone } = usePreferences();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [detected, setDetected] = useState("");

  useEffect(() => {
    try {
      setDetected(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setDetected("UTC");
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COMMON_TIMEZONES;
    return COMMON_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q));
  }, [query]);

  const handleSelect = useCallback((tz: string) => {
    setTimezone(tz);
    toast({
      title: "Time zone updated",
      description: `Times now display in ${getTimezoneLabel(tz)} (${getTimezoneOffset(tz)}).`,
    });
  }, [setTimezone, toast]);

  const handleAutoDetect = useCallback(() => {
    if (detected) {
      handleSelect(detected);
    }
  }, [detected, handleSelect]);

  return (
    <SettingsPageShell
      title="Time Zone"
      subtitle={`Current: ${getTimezoneLabel(timezone)}`}
      icon={<Clock className="h-4.5 w-4.5" />}
    >
      {/* Auto detect */}
      <div className="glass flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Device Time Zone</p>
          <p className="text-xs text-muted-foreground truncate">
            {getTimezoneLabel(detected)} ({getTimezoneOffset(detected)})
          </p>
        </div>
        <button
          onClick={handleAutoDetect}
          className="rounded-xl bg-blue-500/20 px-3 py-2 text-xs font-bold text-blue-400 transition hover:bg-blue-500/30 active:scale-95"
        >
          Use This
        </button>
      </div>

      {/* Search */}
      <div className="profile-input-field rounded-2xl px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Search time zones..."
          />
        </div>
      </div>

      <SectionLabel>Select Time Zone</SectionLabel>
      <Card className="max-h-[420px] overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Globe2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No time zones found</p>
          </div>
        ) : (
          filtered.map((tz) => {
            const isActive = timezone === tz;
            return (
              <button
                key={tz}
                onClick={() => handleSelect(tz)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]",
                  isActive && "bg-primary/5",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{getTimezoneLabel(tz)}</p>
                  <p className="text-xs text-muted-foreground">{getTimezoneOffset(tz)}</p>
                </div>
                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20"
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </motion.span>
                )}
              </button>
            );
          })
        )}
      </Card>
    </SettingsPageShell>
  );
}
