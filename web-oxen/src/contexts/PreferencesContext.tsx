import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Preferences — currency, distance unit, timezone. Persisted to      */
/*  localStorage so settings survive across sessions and devices.      */
/* ------------------------------------------------------------------ */

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "UZS", symbol: "so'm", name: "Uzbek So'm" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "KZT", symbol: "₸", name: "Kazakh Tenge" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
];

export type DistanceUnit = "km" | "mi";

interface PreferencesContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  currencyMeta: CurrencyMeta;
  distanceUnit: DistanceUnit;
  setDistanceUnit: (unit: DistanceUnit) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  /** Format a numeric amount using the active currency. */
  formatPrice: (amount: number, currencyOverride?: string) => string;
  /** Convert a distance value between km and mi based on active unit. */
  formatDistance: (km: number) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const CUR_KEY = "oxen.currency";
const DIST_KEY = "oxen.distance";
const TZ_KEY = "oxen.timezone";

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>("USD");
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("km");
  const [timezone, setTimezoneState] = useState<string>("UTC");

  useEffect(() => {
    try {
      const storedCur = localStorage.getItem(CUR_KEY);
      if (storedCur && CURRENCIES.some((c) => c.code === storedCur)) {
        setCurrencyState(storedCur);
      }
      const storedDist = localStorage.getItem(DIST_KEY);
      if (storedDist === "km" || storedDist === "mi") {
        setDistanceUnitState(storedDist);
      }
      const storedTz = localStorage.getItem(TZ_KEY);
      setTimezoneState(storedTz || detectTimezone());
    } catch {
      setTimezoneState(detectTimezone());
    }
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    try { localStorage.setItem(CUR_KEY, code); } catch { /* ignore */ }
  }, []);

  const setDistanceUnit = useCallback((unit: DistanceUnit) => {
    setDistanceUnitState(unit);
    try { localStorage.setItem(DIST_KEY, unit); } catch { /* ignore */ }
  }, []);

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    try { localStorage.setItem(TZ_KEY, tz); } catch { /* ignore */ }
  }, []);

  const currencyMeta = useMemo(
    () => CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0],
    [currency],
  );

  const formatPrice = useCallback(
    (amount: number, currencyOverride?: string) => {
      const meta = CURRENCIES.find((c) => c.code === (currencyOverride ?? currency)) ?? currencyMeta;
      const isAsian = ["JPY", "KRW", "UZS", "KZT"].includes(meta.code);
      const formatted = isAsian
        ? Math.round(amount).toLocaleString("en-US")
        : amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${meta.symbol}${formatted}`;
    },
    [currency, currencyMeta],
  );

  const formatDistance = useCallback(
    (km: number) => {
      if (distanceUnit === "mi") {
        return `${Math.round(km * 0.621371).toLocaleString("en-US")} mi`;
      }
      return `${Math.round(km).toLocaleString("en-US")} km`;
    },
    [distanceUnit],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      currency,
      setCurrency,
      currencyMeta,
      distanceUnit,
      setDistanceUnit,
      timezone,
      setTimezone,
      formatPrice,
      formatDistance,
    }),
    [currency, setCurrency, currencyMeta, distanceUnit, setDistanceUnit, timezone, setTimezone, formatPrice, formatDistance],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}
