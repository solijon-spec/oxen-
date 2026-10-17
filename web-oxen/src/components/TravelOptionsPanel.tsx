import { motion, AnimatePresence } from "framer-motion";
import {
  X, Building2, Star, Clock, Banknote, Cloud, Shield, Camera,
  Hotel, Plane, MapPin, ChevronRight, ExternalLink, Calendar,
} from "lucide-react";
import { useMemo } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import type { Country } from "@/data/countries";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface TravelAgency {
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  tagline: string;
  tourCount: number;
}

interface TourPackage {
  name: string;
  duration: string;
  price: number;
  currency: string;
  type: string;
}

interface FlightOption {
  from: string;
  airline: string;
  price: number;
  currency: string;
  duration: string;
  stops: number;
}

interface HotelOption {
  name: string;
  tier: string;
  pricePerNight: number;
  currency: string;
  rating: number;
}

interface TravelOptionsData {
  agencies: TravelAgency[];
  packages: TourPackage[];
  flights: FlightOption[];
  hotels: HotelOption[];
  weather: string;
  bestSeason: string;
  visa: string;
  attractions: string[];
  estimatedTotal: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data generator                                               */
/* ------------------------------------------------------------------ */

const AGENCY_POOL: Pick<TravelAgency, "name" | "logo" | "rating" | "reviewCount" | "tagline" | "tourCount">[] = [
  { name: "GlobeTrotter Expeditions", logo: "🌍", rating: 4.8, reviewCount: 2340, tagline: "Curated adventures since 1998", tourCount: 142 },
  { name: "LuxeVoyage", logo: "✨", rating: 4.9, reviewCount: 1872, tagline: "Premium travel, redefined", tourCount: 89 },
  { name: "WanderWise", logo: "🧭", rating: 4.7, reviewCount: 3156, tagline: "Smart travel for curious minds", tourCount: 203 },
  { name: "NomadPath", logo: "⛺", rating: 4.6, reviewCount: 4218, tagline: "Off the beaten path", tourCount: 176 },
  { name: "Apex Travel Co.", logo: "🏔️", rating: 4.8, reviewCount: 1120, tagline: "Peak experiences worldwide", tourCount: 67 },
  { name: "Voyager Pro", logo: "✈️", rating: 4.5, reviewCount: 5630, tagline: "Millions of trips, one app", tourCount: 410 },
];

const AIRLINE_POOL = [
  { airline: "Turkish Airlines", from: "Istanbul" },
  { airline: "Emirates", from: "Dubai" },
  { airline: "Qatar Airways", from: "Doha" },
  { airline: "Singapore Airlines", from: "Singapore" },
  { airline: "Lufthansa", from: "Frankfurt" },
  { airline: "Air France", from: "Paris" },
  { airline: "British Airways", from: "London" },
  { airline: "Delta", from: "Atlanta" },
  { airline: "ANA", from: "Tokyo" },
];

function generateOptions(country: Country): TravelOptionsData {
  // Deterministic-ish seed from country id
  const seed = country.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  const currencySymbol = country.currency.includes("$") ? "$"
    : country.currency.includes("€") ? "€"
    : country.currency.includes("¥") ? "¥"
    : country.currency.includes("£") ? "£"
    : country.currency.split(" ")[1]?.replace(/[()]/g, "") ?? "$";

  const currencyCode = country.currency.split(" ")[0];

  // Pick 3-4 agencies
  const agencies = AGENCY_POOL.slice(0, 3 + (seed % 3)).map((a, i) => ({
    ...a,
    priceRange: i === 0 ? `${currencySymbol}${800 + (seed % 500)}–${currencySymbol}${3500 + (seed % 2000)}` : i === 1 ? `${currencySymbol}${1500 + (seed % 1000)}–${currencySymbol}${6000 + (seed % 3000)}` : `${currencySymbol}${400 + (seed % 300)}–${currencySymbol}${2000 + (seed % 1000)}`,
  }));

  // Tour packages
  const durations = ["5 days", "7 days", "10 days", "14 days"];
  const types = ["Cultural", "Adventure", "Luxury", "Budget", "Family", "Solo"];
  const packages: TourPackage[] = country.cities.slice(0, 3).flatMap((city, ci) =>
    durations.slice(0, 2).map((dur, di) => ({
      name: `${city.name} ${types[(ci + di) % types.length]} Explorer`,
      duration: dur,
      price: 500 + (seed % 800) + ci * 300 + di * 200,
      currency: currencyCode,
      type: types[(ci + di) % types.length],
    })),
  ).slice(0, 4);

  // Flights
  const flights: FlightOption[] = AIRLINE_POOL.slice(0, 3 + (seed % 4)).map((a, i) => ({
    ...a,
    price: 400 + (seed % 1200) + i * 150,
    currency: currencyCode,
    duration: `${4 + (i * 2) + (seed % 4)}h ${10 + (seed % 50)}m`,
    stops: i === 0 ? 0 : (seed + i) % 2,
  }));

  // Hotels from existing data
  const hotels: HotelOption[] = country.cities.flatMap((city) =>
    city.hotels.map((h) => ({
      name: h.name,
      tier: h.tier,
      pricePerNight: h.tier === "Luxury" ? 250 + (seed % 350) : h.tier === "Mid-range" ? 80 + (seed % 120) : 25 + (seed % 45),
      currency: currencyCode,
      rating: h.tier === "Luxury" ? 4.6 + ((seed % 4) / 10) : h.tier === "Mid-range" ? 4.2 + ((seed % 5) / 10) : 3.8 + ((seed % 7) / 10),
    })),
  ).slice(0, 4);

  const allAttractions = country.cities.flatMap((c) => c.attractions);

  return {
    agencies,
    packages,
    flights,
    hotels,
    weather: country.weather,
    bestSeason: country.bestSeason,
    visa: country.visa,
    attractions: allAttractions,
    estimatedTotal: `${currencySymbol}${1200 + (seed % 1800)}–${currencySymbol}${4500 + (seed % 3500)}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface Props {
  country: Country;
  open: boolean;
  onClose: () => void;
}

export default function TravelOptionsPanel({ country, open, onClose }: Props) {
  const { t } = useLanguage();
  const data = useMemo(() => generateOptions(country), [country]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: "100%", scale: 0.95 }}
            animate={{ opacity: 1, y: "0%", scale: 1 }}
            exit={{ opacity: 0, y: "100%", scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 1,
            }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0c0e13]/98 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{country.flag}</span>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {t("options.title", "Travel Options")}
                  </h3>
                  <p className="text-xs text-white/45">{country.name} · {country.capital}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
              {/* Travel Agencies */}
              <Section icon={<Building2 className="h-4 w-4" />} title={t("options.agencies", "Travel Agencies")}>
                <div className="space-y-3">
                  {data.agencies.map((a) => (
                    <AgencyCard key={a.name} agency={a} />
                  ))}
                </div>
              </Section>

              {/* Tour Packages */}
              <Section icon={<Calendar className="h-4 w-4" />} title={t("options.packages", "Tour Packages")}>
                <div className="space-y-2">
                  {data.packages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/85 truncate">{pkg.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
                          <Clock className="h-3 w-3" />
                          {pkg.duration}
                          <span className="text-white/20">·</span>
                          <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">{pkg.type}</span>
                        </div>
                      </div>
                      <span className="ml-3 shrink-0 text-sm font-bold text-white">{pkg.currency} {pkg.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Flights */}
              <Section icon={<Plane className="h-4 w-4" />} title={t("options.flights", "Flight Options")}>
                <div className="space-y-2">
                  {data.flights.map((f) => (
                    <div
                      key={f.airline + f.from}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white/80">{f.airline}</span>
                          {f.stops === 0 && <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-400">Direct</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-white/40">
                          {f.from} → {country.capital} · {f.duration}
                        </p>
                      </div>
                      <span className="ml-3 shrink-0 text-sm font-bold text-white">{f.currency} {f.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Hotels */}
              <Section icon={<Hotel className="h-4 w-4" />} title={t("options.hotels", "Hotel Recommendations")}>
                <div className="space-y-2">
                  {data.hotels.map((h) => (
                    <div
                      key={h.name}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/85 truncate">{h.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-white/50">{h.rating}</span>
                          <span className="text-xs text-white/30">· {h.tier}</span>
                        </div>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <span className="text-sm font-bold text-white">{h.currency} {h.pricePerNight}</span>
                        <span className="block text-[10px] text-white/35">/night</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-2">
                <InfoTile icon={<Cloud className="h-4 w-4 text-sky-400" />} label={t("options.weather", "Weather")} value={data.weather} />
                <InfoTile icon={<Calendar className="h-4 w-4 text-amber-400" />} label={t("options.bestSeason", "Best Season")} value={data.bestSeason} />
                <InfoTile icon={<Shield className="h-4 w-4 text-green-400" />} label={t("options.visa", "Visa")} value={data.visa} />
                <InfoTile icon={<Banknote className="h-4 w-4 text-emerald-400" />} label={t("options.estimated", "Est. Total")} value={data.estimatedTotal} />
              </div>

              {/* Attractions */}
              <Section icon={<Camera className="h-4 w-4" />} title={t("options.attractions", "Popular Attractions")}>
                <div className="flex flex-wrap gap-1.5">
                  {data.attractions.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60"
                    >
                      <MapPin className="mr-1 inline h-3 w-3 text-blue-400/70" />
                      {a}
                    </span>
                  ))}
                </div>
              </Section>

              {/* Bottom spacing */}
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-blue-400">{icon}</span>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function AgencyCard({ agency }: { agency: TravelAgency }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition hover:border-blue-500/20 hover:bg-white/[0.06]">
      <span className="text-2xl">{agency.logo}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-white/85 truncate">{agency.name}</p>
          <div className="flex items-center gap-0.5 shrink-0">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-white/70">{agency.rating}</span>
            <span className="text-[10px] text-white/35">({(agency.reviewCount / 1000).toFixed(1)}k)</span>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-0.5">{agency.tagline} · {agency.tourCount} tours · {agency.priceRange}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition group-hover:text-blue-400 group-hover:translate-x-0.5" />
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="mb-1.5">{icon}</div>
      <p className="text-xs font-medium text-white/80 leading-snug">{value}</p>
      <p className="mt-0.5 text-[10px] text-white/35">{label}</p>
    </div>
  );
}
