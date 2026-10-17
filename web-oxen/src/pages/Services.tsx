import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Briefcase, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { fetchServices, fetchCategories } from "@/lib/services";
import { ServiceCard } from "@/components/services/ServiceCard";
import { useSEO } from "@/hooks/use-seo";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

/**
 * ServicesPage — public listing of all active travel services.
 * Supports category filtering and search.
 */
export default function ServicesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useSEO({
    title: "Travel Services | OXEN",
    description: "Discover premium travel consulting services — visa support, luxury trip planning, honeymoon packages, and more.",
    keywords: "travel services, travel consulting, visa services, luxury travel, honeymoon packages",
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services", activeCategory],
    queryFn: () => fetchServices(activeCategory),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["service-categories"],
    queryFn: fetchCategories,
  });

  const allCategories = useMemo(() => ["All", ...categories], [categories]);

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [services, search]);

  return (
    <div className="relative px-5 pt-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springIn}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common.home", "Home")}
        </button>

        <div className="mt-4 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-extrabold">{t("nav.services", "Travel Services")}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("services.subtitle", "Premium consulting services from trusted travel experts worldwide.")}
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.06 }}
        className="mt-5"
      >
        <div className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("services.searchPlaceholder", "Search services...")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground/60" />
        </div>
      </motion.div>

      {/* Category chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.12 }}
        className="mt-4 flex gap-2 overflow-x-auto no-scrollbar"
      >
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
              activeCategory === cat
                ? "gold-gradient text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground",
            )}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Services grid */}
      <div className="mt-6 pb-32 lg:pb-10">
        {servicesLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass h-[340px] animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? t("services.noMatch", "No services match your search.") : t("services.noneAvailable", "No services available yet.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
