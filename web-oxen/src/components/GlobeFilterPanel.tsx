import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, MapPin, Package, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { COUNTRIES, type Country } from "@/data/countries";

type Currency = "UZS" | "USD" | "EUR";
type Tab = "budget" | "tours";

const RATES: Record<Currency, number> = { USD: 1, EUR: 0.92, UZS: 12600 };
const SYMBOL: Record<Currency, string> = { USD: "$", EUR: "€", UZS: "so'm" };

function fmtPrice(usd: number, cur: Currency): string {
  const v = Math.round(usd * RATES[cur]);
  if (cur === "UZS") return `${v.toLocaleString("en-US")} ${SYMBOL[cur]}`;
  return `${SYMBOL[cur]}${v.toLocaleString("en-US")}`;
}

/** Lightweight per-country daily cost estimate (USD per person). */
function dailyCost(c: Country): number {
  const base = 30 + (c.safety / 100) * 90; // $30–$120
  const factor = c.continent === "Europe" ? 1.25
    : c.continent === "North America" ? 1.3
    : c.continent === "Oceania" ? 1.35
    : c.continent === "Asia" ? 0.85
    : c.continent === "Africa" ? 0.75
    : 1;
  return Math.round(base * factor);
}

interface BudgetResult { country: Country; priceUsd: number; }

function findBudgetCountries(
  budgetUsd: number, travelers: number, days: number, limit = 8,
): BudgetResult[] {
  const perPerson = budgetUsd / Math.max(travelers, 1) / Math.max(days, 1);
  return COUNTRIES
    .map((c) => ({ country: c, priceUsd: dailyCost(c) * travelers * days }))
    .filter((r) => r.priceUsd <= budgetUsd)
    .sort((a, b) => {
      // Prefer closest to budget (best value), with a safety bonus
      const aFit = Math.abs(a.priceUsd - perPerson * travelers * days) - (a.country.safety / 100) * 30;
      const bFit = Math.abs(b.priceUsd - perPerson * travelers * days) - (b.country.safety / 100) * 30;
      return aFit - bFit;
    })
    .slice(0, limit);
}

// ── Demo tour packages ──────────────────────────────────────
interface DemoPackage {
  agency: string; destination: string; priceUsd: number; duration: string; countryId: string;
}
const DEMO_PACKAGES: DemoPackage[] = [
  { agency: "Silk Road Travel", destination: "Uzbekistan", priceUsd: 680, duration: "7 days", countryId: "uzbekistan" },
  { agency: "Alpine Tours", destination: "Switzerland", priceUsd: 1850, duration: "5 days", countryId: "switzerland" },
  { agency: "Sahara Adventures", destination: "Morocco", priceUsd: 920, duration: "8 days", countryId: "morocco" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onViewGlobe: (country: Country) => void;
}

export default function GlobeFilterPanel({ open, onClose, onViewGlobe }: Props) {
  const [tab, setTab] = useState<Tab>("budget");
  const [results, setResults] = useState<BudgetResult[] | DemoPackage[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Budget form
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [travelers, setTravelers] = useState("2");
  const [days, setDays] = useState("7");

  // Tour form
  const [dest, setDest] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [tourTravelers, setTourTravelers] = useState("2");

  const handleFindCountries = useCallback(() => {
    const b = parseFloat(budget);
    if (!b || b <= 0) { setResults(null); return; }
    setSearching(true);
    const budgetUsd = b / RATES[currency];
    const found = findBudgetCountries(budgetUsd, parseInt(travelers) || 1, parseInt(days) || 1);
    setResults(found);
    setSearching(false);
  }, [budget, currency, travelers, days]);

  const handleFindTours = useCallback(() => {
    setSearching(true);
    const max = parseFloat(maxBudget);
    const t = parseInt(tourTravelers) || 1;
    let found: DemoPackage[] = DEMO_PACKAGES.filter((p) => {
      if (dest.trim()) {
        const q = dest.toLowerCase();
        if (!p.destination.toLowerCase().includes(q) && !p.agency.toLowerCase().includes(q)) return false;
      }
      if (max && max > 0) {
        const budgetUsd = max / RATES[currency];
        if (p.priceUsd * t > budgetUsd) return false;
      }
      return true;
    });
    if (found.length === 0) found = DEMO_PACKAGES; // show all if no match
    setResults(found);
    setSearching(false);
  }, [dest, maxBudget, tourTravelers, currency]);

  const handleViewGlobe = useCallback((country: Country) => {
    onViewGlobe(country);
    onClose();
  }, [onViewGlobe, onClose]);

  const isBudgetResults = Array.isArray(results) && results.length > 0 && "country" in (results[0] as BudgetResult);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex justify-end"
          onClick={onClose}
        >
          {/* Desktop: right panel, Mobile: bottom sheet */}
          <motion.div
            initial={{ x: "100%", y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: "100%", y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass-strong relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-white/10 p-4 md:rounded-none
                       max-md:mt-auto max-md:h-auto max-md:max-h-[80vh] max-md:rounded-t-3xl max-md:border-l-0 max-md:border-t"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-bold">Filter</span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] hover:text-foreground active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-xl bg-white/[0.04] p-1">
              {(["budget", "tours"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setResults(null); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                    tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "budget" ? <MapPin className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                  {t === "budget" ? "Budget" : "Tour Packages"}
                </button>
              ))}
            </div>

            {/* ── Budget Tab ── */}
            {tab === "budget" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Budget Amount</label>
                  <input
                    type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                    placeholder="1000" className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/30 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["USD", "EUR", "UZS"] as Currency[]).map((c) => (
                    <button
                      key={c} onClick={() => setCurrency(c)}
                      className={`rounded-xl py-2 text-xs font-bold transition ${currency === c ? "bg-primary/15 text-primary" : "bg-white/[0.04] text-muted-foreground hover:text-foreground"}`}
                    >{c}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Travelers</label>
                    <input type="number" value={travelers} onChange={(e) => setTravelers(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-sm focus:border-primary/30 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Days</label>
                    <input type="number" value={days} onChange={(e) => setDays(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-sm focus:border-primary/30 focus:outline-none" />
                  </div>
                </div>
                <button
                  onClick={handleFindCountries}
                  disabled={searching}
                  className="gold-gradient w-full rounded-xl py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
                >Find Countries</button>

                {/* Budget Results */}
                {isBudgetResults && (results as BudgetResult[]).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {(results as BudgetResult[]).length} destinations
                    </p>
                    {(results as BudgetResult[]).map((r) => (
                      <div key={r.country.id} className="glass flex items-center gap-3 rounded-xl p-2.5">
                        <span className="text-xl">{r.country.flag}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{r.country.name}</p>
                          <p className="text-xs text-muted-foreground">{fmtPrice(r.priceUsd, currency)}</p>
                        </div>
                        <button
                          onClick={() => handleViewGlobe(r.country)}
                          className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary/20 active:scale-90"
                        >View on Globe</button>
                      </div>
                    ))}
                  </div>
                )}
                {isBudgetResults && (results as BudgetResult[]).length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">No countries found for this budget. Try increasing it.</p>
                )}
              </div>
            )}

            {/* ── Tour Packages Tab ── */}
            {tab === "tours" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Destination</label>
                  <input value={dest} onChange={(e) => setDest(e.target.value)}
                    placeholder="e.g. Uzbekistan" className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-primary/30 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max Budget ({currency})</label>
                    <input type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)}
                      placeholder="2000" className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-sm focus:border-primary/30 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Travelers</label>
                    <input type="number" value={tourTravelers} onChange={(e) => setTourTravelers(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-sm focus:border-primary/30 focus:outline-none" />
                  </div>
                </div>
                <button
                  onClick={handleFindTours}
                  disabled={searching}
                  className="gold-gradient w-full rounded-xl py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
                >Find Tours</button>

                {/* Tour Results */}
                {results && !isBudgetResults && (results as DemoPackage[]).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {(results as DemoPackage[]).length} packages found
                    </p>
                    {(results as DemoPackage[]).map((p, i) => {
                      const country = COUNTRIES.find((c) => c.id === p.countryId);
                      const totalUsd = p.priceUsd * (parseInt(tourTravelers) || 1);
                      return (
                        <div key={i} className="glass rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{p.agency}</p>
                              <p className="text-xs text-muted-foreground">{country?.flag} {p.destination}</p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-primary">{fmtPrice(totalUsd, currency)}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">{p.duration}</span>
                            <button className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary/20 active:scale-90">View Package</button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="pt-1 text-center text-[10px] text-muted-foreground/50">Demo packages — real integration coming soon</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Floating Filter button for the globe top bar */
export function FilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 backdrop-blur-xl border border-white/10 text-sm text-white/60 transition hover:bg-white/12 hover:text-white active:scale-95"
      aria-label="Filter destinations"
    >
      <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
      <span className="hidden sm:inline">Filter</span>
    </button>
  );
}
