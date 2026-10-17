import { motion } from "framer-motion";
import { Globe2, Heart, MapPinCheck, Sparkles, Trash2, Calendar, ArrowRight, Compass, BriefcaseBusiness } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useTravel } from "@/contexts/TravelContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COUNTRIES, getCountry } from "@/data/countries";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { wishlist, visited, itineraries, removeItinerary } = useTravel();

  const recommendations = COUNTRIES.filter((c) => !wishlist.includes(c.id) && !visited.includes(c.id)).slice(0, 3);

  const stats = [
    { icon: MapPinCheck, label: t("dashboard.visited", "Visited"), value: visited.length },
    { icon: Heart, label: t("dashboard.wishlist", "Wishlist"), value: wishlist.length },
    { icon: Sparkles, label: t("dashboard.tripsPlanned", "Trips planned"), value: itineraries.length },
  ];

  return (
    <div className="relative px-5 pt-7">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-extrabold">
          {t("dashboard.greeting", "Hi")}{user ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle", "Your journey so far, all in one place.")}</p>
      </motion.div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl p-4 text-center"
            >
              <Icon className="mx-auto h-5 w-5 text-primary" />
              <div className="mt-2 font-display text-2xl font-extrabold">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Wishlist */}
      <Section title={t("dashboard.yourWishlist", "Your wishlist")} icon={Heart}>
        {wishlist.length === 0 ? (
          <Empty text={t("dashboard.wishlistEmpty", "No saved destinations yet. Spin the globe to start dreaming.")} cta={t("dashboard.exploreGlobe", "Explore globe")} onClick={() => navigate("/")} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wishlist.map((id) => {
              const c = getCountry(id);
              if (!c) return null;
              return (
                <button
                  key={id}
                  onClick={() => navigate(`/country/${c.id}`)}
                  className="glass flex items-center gap-3 rounded-2xl p-3 text-left transition hover:border-primary/40"
                >
                  <span className="text-2xl">{c.flag}</span>
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Saved itineraries */}
      <Section title={t("dashboard.savedItineraries", "Saved itineraries")} icon={Calendar}>
        {itineraries.length === 0 ? (
          <Empty text={t("dashboard.itinerariesEmpty", "No itineraries yet. Let AI plan your next adventure.")} cta={t("dashboard.openPlanner", "Open planner")} onClick={() => navigate("/planner")} />
        ) : (
          <div className="space-y-3">
            {itineraries.map((it) => (
              <div key={it.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold">{it.destination}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{it.prompt}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        {it.days.length} {t("dashboard.days", "days")}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {new Date(it.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItinerary(it.id)}
                    aria-label={t("dashboard.deleteItinerary", "Delete itinerary")}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Travel Services */}
      <Section title={t("nav.services", "Travel Services")} icon={BriefcaseBusiness} >
        <button
          onClick={() => navigate("/services")}
          className="glass group flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:border-primary/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold">{t("dashboard.browseServices", "Browse Travel Services")}</div>
            <div className="truncate text-xs text-muted-foreground">{t("dashboard.browseServicesDesc", "Visa support, trip planning, honeymoon packages & more")}</div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </button>
      </Section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Section title={t("dashboard.recommended", "Recommended for you")} icon={Compass}>
          <div className="space-y-3">
            {recommendations.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/country/${c.id}`)}
                className="glass group flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:border-primary/40"
              >
                <span className="text-3xl">{c.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.tagline}</div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Globe2; children: React.ReactNode }) {
  return (
    <section className="pt-7">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <button onClick={onClick} className="gold-gradient rounded-full px-4 py-2 text-xs font-bold text-primary-foreground">
        {cta}
      </button>
    </div>
  );
}
