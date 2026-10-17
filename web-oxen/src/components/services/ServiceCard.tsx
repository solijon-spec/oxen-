import { memo } from "react";
import { motion } from "framer-motion";
import { Star, ArrowRight, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { ServiceWithConsulting } from "@/lib/services";

/**
 * ServiceCard — reusable card for displaying a service in lists/grids.
 */
function ServiceCardBase({
  service,
  index = 0,
}: {
  service: ServiceWithConsulting;
  index?: number;
}) {
  const navigate = useNavigate();
  const consulting = service.consulting_companies;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 260,
        damping: 24,
        mass: 0.8,
      }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/services/${service.id}`)}
      className="travel-card group relative w-full shrink-0 overflow-hidden rounded-3xl text-left"
    >
      {/* Cover image */}
      <div className="relative h-[200px] w-full overflow-hidden">
        {service.cover_image ? (
          <img
            src={service.cover_image}
            alt={service.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Category badge */}
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
          {service.category}
        </span>

        {/* Rating badge */}
        {service.rating > 0 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {Number(service.rating).toFixed(1)}
          </span>
        )}

        {/* Company logo */}
        {consulting?.logo_url && (
          <img
            src={consulting.logo_url}
            alt={consulting.name}
            className="absolute bottom-3 right-3 h-8 w-8 rounded-lg border border-white/20 object-cover shadow-lg"
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {consulting && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate font-medium">{consulting.name}</span>
            {consulting.is_verified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
          </div>
        )}
        <h3 className="mt-1 line-clamp-2 font-display text-base font-bold text-foreground">
          {service.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {service.description}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="font-display text-lg font-extrabold text-primary">
              ${Number(service.price).toLocaleString()}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">{service.currency}</span>
          </div>
          {service.duration && (
            <span className="text-xs text-muted-foreground">{service.duration}</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-all group-hover:opacity-100">
          View details
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.button>
  );
}

export const ServiceCard = memo(ServiceCardBase);
