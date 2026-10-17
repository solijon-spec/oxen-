import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, Search, Check } from "lucide-react";

import SettingsPageShell, { Card } from "@/components/SettingsPageShell";
import { usePreferences, CURRENCIES, type CurrencyMeta } from "@/contexts/PreferencesContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CurrencySettings() {
  const { currency, setCurrency, currencyMeta } = usePreferences();
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter((c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = useCallback((meta: CurrencyMeta) => {
    setCurrency(meta.code);
    toast({
      title: "Currency updated",
      description: `All prices now display in ${meta.name} (${meta.code}).`,
    });
  }, [setCurrency, toast]);

  return (
    <SettingsPageShell
      title="Currency"
      subtitle={`Current: ${currencyMeta.symbol} ${currencyMeta.code} — ${currencyMeta.name}`}
      icon={<DollarSign className="h-4.5 w-4.5" />}
    >
      {/* Search */}
      <div className="profile-input-field rounded-2xl px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Search currencies..."
          />
        </div>
      </div>

      {/* Currency list */}
      <Card className="max-h-[480px] overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-muted-foreground">No currencies found</p>
            <button
              onClick={() => setQuery("")}
              className="mt-2 text-xs font-semibold text-primary"
            >
              Clear search
            </button>
          </div>
        ) : (
          filtered.map((meta) => (
            <button
              key={meta.code}
              onClick={() => handleSelect(meta)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]",
                currency === meta.code && "bg-primary/5",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-base font-bold">
                {meta.symbol}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{meta.code}</span>
                  <span className="text-xs text-muted-foreground">— {meta.name}</span>
                </div>
              </div>
              {currency === meta.code && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20"
                >
                  <Check className="h-3.5 w-3.5 text-primary" />
                </motion.span>
              )}
            </button>
          ))
        )}
      </Card>

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Prices across travel, services, and bookings update instantly.
      </p>
    </SettingsPageShell>
  );
}
