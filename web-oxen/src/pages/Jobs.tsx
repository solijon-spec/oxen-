import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Users, DollarSign, Search, Building2, Loader2 } from "lucide-react";

import { useSEO } from "@/hooks/use-seo";
import { fetchPublishedVacancies, EMPLOYMENT_TYPE_LABELS, type Vacancy, type EmploymentType } from "@/lib/vacancies";
import { cn } from "@/lib/utils";

function money(n: number | null, currency: string): string {
  if (!n) return "—";
  return `${n.toLocaleString()} ${currency}`;
}

function salaryRange(v: Vacancy): string {
  if (v.salary_is_negotiable && !v.salary_min && !v.salary_max) return "Negotiable";
  if (v.salary_min && v.salary_max) return `${money(v.salary_min, v.currency)} – ${money(v.salary_max, v.currency)}`;
  return money(v.salary_min ?? v.salary_max, v.currency);
}

export default function Jobs() {
  const navigate = useNavigate();
  useSEO({ title: "Jobs & Vacancies | OXEN", description: "Browse open positions at travel & consulting agencies on OXEN." });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmploymentType | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["vacancies-public"],
    queryFn: () => fetchPublishedVacancies({ limit: 100 }),
    staleTime: 30_000,
    retry: false,
  });

  const vacancies = data ?? [];

  const filtered = useMemo(() => {
    return vacancies.filter((v) => {
      if (typeFilter !== "all" && v.employment_type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        (v.company?.name ?? "").toLowerCase().includes(q) ||
        (v.location_city ?? "").toLowerCase().includes(q)
      );
    });
  }, [vacancies, search, typeFilter]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Vakansiyalar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sayohat va konsalting agentliklaridagi ochiq ish o'rinlari</p>
      </motion.div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lavozim, agentlik yoki shahar bo'yicha qidirish…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(["all", ...Object.keys(EMPLOYMENT_TYPE_LABELS)] as (EmploymentType | "all")[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition",
              typeFilter === t ? "bg-primary text-primary-foreground" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]",
            )}
          >
            {t === "all" ? "Barchasi" : EMPLOYMENT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Briefcase className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">Hozircha vakansiyalar yo'q</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((v, i) => (
            <motion.button
              key={v.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring" as const, stiffness: 280, damping: 26 }}
              onClick={() => navigate(`/vacancy/${v.id}`)}
              className="glass flex w-full items-start gap-3 rounded-2xl p-4 text-left transition hover:border-white/[0.12]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                {v.company?.logo_url ? (
                  <img src={v.company.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{v.title}</p>
                <p className="truncate text-xs text-muted-foreground">{v.company?.name ?? "Agency"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {EMPLOYMENT_TYPE_LABELS[v.employment_type]}</span>
                  {(v.location_city || v.location_country) && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {[v.location_city, v.location_country].filter(Boolean).join(", ")}</span>
                  )}
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {v.openings_count}</span>
                  <span className="flex items-center gap-1 font-bold text-amber-300"><DollarSign className="h-3 w-3" /> {salaryRange(v)}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
