import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Languages, Search, Check, Globe2 } from "lucide-react";

import SettingsPageShell, { Card } from "@/components/SettingsPageShell";
import { useLanguage, LANGUAGES, type Language } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter((l) =>
      l.code.toLowerCase().includes(q) ||
      l.label.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = useCallback((lang: Language) => {
    setLanguage(lang);
    const meta = LANGUAGES.find((l) => l.code === lang);
    toast({
      title: `Language changed`,
      description: `The entire app is now in ${meta?.native ?? lang}.`,
    });
  }, [setLanguage, toast]);

  const currentMeta = LANGUAGES.find((l) => l.code === language);

  return (
    <SettingsPageShell
      title={t("profile.language", "Language")}
      subtitle={`Current: ${currentMeta?.native ?? language} · ${LANGUAGES.length} languages`}
      icon={<Languages className="h-4.5 w-4.5" />}
    >
      {/* Search */}
      <div className="profile-input-field rounded-2xl px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            placeholder="Search languages..."
          />
        </div>
      </div>

      {/* Language list */}
      <Card className="max-h-[480px] overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Globe2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No languages found</p>
          </div>
        ) : (
          filtered.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code as Language)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.98]",
                  isActive && "bg-primary/5",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg">
                  {lang.flag}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-bold">{lang.native}</span>
                  <span className="block text-xs text-muted-foreground">{lang.label}</span>
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

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        {t("profile.selectLanguage", "Select Language")} — updates instantly across the entire app.
      </p>
    </SettingsPageShell>
  );
}
