import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Coins,
  Languages,
  CloudSun,
  CalendarHeart,
  ShieldCheck,
  StampIcon,
  Heart,
  MapPin,
  Check,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useTravel } from "@/contexts/TravelContext";
import { getCountry } from "@/data/countries";
import { cn } from "@/lib/utils";

export default function Country() {
  const { countryId = "" } = useParams();
  const navigate = useNavigate();
  const country = getCountry(countryId);
  const { isWishlisted, toggleWishlist, isVisited, toggleVisited } = useTravel();

  if (!country) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🗺️</div>
        <p className="text-muted-foreground">We couldn't find that destination.</p>
        <button onClick={() => navigate("/")} className="gold-gradient rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground">
          Back to globe
        </button>
      </div>
    );
  }

  const wished = isWishlisted(country.id);
  const visited = isVisited(country.id);

  const facts = [
    { icon: Building2, label: "Capital", value: country.capital },
    { icon: Coins, label: "Currency", value: country.currency },
    { icon: Languages, label: "Language", value: country.language },
    { icon: CloudSun, label: "Weather", value: country.weather },
    { icon: CalendarHeart, label: "Best season", value: country.bestSeason },
    { icon: StampIcon, label: "Visa", value: country.visa },
  ];

  return (
    <div className="relative">
      {/* Header */}
      <section className="relative overflow-hidden px-5 pb-6 pt-6">
        <div className="absolute -right-10 -top-10 text-[10rem] opacity-10 blur-[1px]">{country.flag}</div>
        <button
          onClick={() => navigate("/")}
          className="relative z-10 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Globe
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mt-5"
        >
          <div className="text-6xl">{country.flag}</div>
          <span className="mt-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {country.continent} · {country.region}
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{country.name}</h1>
          <p className="mt-1 text-sm font-medium text-primary/90">{country.tagline}</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{country.blurb}</p>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => toggleWishlist(country.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition active:scale-95",
                wished ? "gold-gradient text-primary-foreground shadow-lg" : "glass text-foreground hover:border-primary/40",
              )}
            >
              <Heart className={cn("h-4 w-4", wished && "fill-current")} />
              {wished ? "Wishlisted" : "Add to wishlist"}
            </button>
            <button
              onClick={() => toggleVisited(country.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition active:scale-95",
                visited ? "border border-primary/50 bg-primary/10 text-primary" : "glass text-foreground hover:border-primary/40",
              )}
            >
              <Check className="h-4 w-4" />
              {visited ? "Visited" : "Mark visited"}
            </button>
          </div>
        </motion.div>
      </section>

      {/* Safety index */}
      <section className="px-5">
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Safety index
            </span>
            <span className="font-display text-lg font-bold text-primary">{country.safety}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${country.safety}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full gold-gradient"
            />
          </div>
        </div>
      </section>

      {/* Facts grid */}
      <section className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {facts.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-2xl p-4"
              >
                <Icon className="h-4 w-4 text-primary" />
                <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
                <div className="mt-0.5 text-sm font-semibold leading-snug">{f.value}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Popular cities */}
      <section className="px-5 pt-6">
        <h2 className="mb-3 font-display text-lg font-bold">Popular cities</h2>
        <div className="space-y-3">
          {country.cities.map((city, i) => (
            <motion.button
              key={city.id}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              onClick={() => navigate(`/country/${country.id}/city/${city.id}`)}
              className="glass group flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:border-primary/40"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-bold">{city.name}</div>
                <div className="truncate text-xs text-muted-foreground">{city.blurb}</div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
