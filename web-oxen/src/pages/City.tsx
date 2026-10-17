import { motion } from "framer-motion";
import { ArrowLeft, Landmark, BedDouble, UtensilsCrossed, TramFront } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getCity } from "@/data/countries";

export default function City() {
  const { countryId = "", cityId = "" } = useParams();
  const navigate = useNavigate();
  const result = getCity(countryId, cityId);

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🏙️</div>
        <p className="text-muted-foreground">We couldn't find that city.</p>
        <button onClick={() => navigate("/")} className="gold-gradient rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground">
          Back to globe
        </button>
      </div>
    );
  }

  const { country, city } = result;

  return (
    <div className="relative px-5 pt-6">
      <button
        onClick={() => navigate(`/country/${country.id}`)}
        className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {country.name}
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-5">
        <span className="text-sm text-muted-foreground">
          {country.flag} {country.name}
        </span>
        <h1 className="mt-1 font-display text-3xl font-extrabold">{city.name}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{city.blurb}</p>
      </motion.div>

      {/* Attractions */}
      <Section icon={Landmark} title="Top attractions" delay={0.05}>
        <div className="flex flex-wrap gap-2">
          {city.attractions.map((a) => (
            <span key={a} className="rounded-full border border-border bg-card/50 px-3.5 py-1.5 text-sm font-medium">
              {a}
            </span>
          ))}
        </div>
      </Section>

      {/* Hotels */}
      <Section icon={BedDouble} title="Where to stay" delay={0.1}>
        <div className="space-y-2.5">
          {city.hotels.map((h) => (
            <div key={h.name} className="glass flex items-center justify-between rounded-xl px-4 py-3">
              <span className="text-sm font-semibold">{h.name}</span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{h.tier}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Restaurants */}
      <Section icon={UtensilsCrossed} title="Where to eat" delay={0.15}>
        <div className="space-y-2.5">
          {city.restaurants.map((r) => (
            <div key={r.name} className="glass flex items-center justify-between rounded-xl px-4 py-3">
              <span className="text-sm font-semibold">{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.cuisine}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Transport */}
      <Section icon={TramFront} title="Getting around" delay={0.2}>
        <div className="glass rounded-xl p-4 text-sm leading-relaxed text-muted-foreground">{city.transport}</div>
      </Section>

      <button
        onClick={() => navigate("/planner")}
        className="gold-gradient mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-[1.02] active:scale-95"
      >
        Plan a trip to {city.name}
      </button>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  delay,
  children,
}: {
  icon: typeof Landmark;
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="pt-6"
    >
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      {children}
    </motion.section>
  );
}
