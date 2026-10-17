import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Briefcase,
  Building2,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  fetchConsultingCompany,
  fetchMyServices,
  getOrCreateConsultingCompany,
  deleteService,
  type Service,
} from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

/**
 * ConsultingDashboard — lists the consulting company's own services.
 * Allows creating, editing, toggling visibility, and deleting services.
 */
export default function ConsultingDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  useSEO({
    title: "Consulting Dashboard | OXEN",
    description: "Manage your travel consulting services.",
  });

  // First, ensure a consulting company exists for this user
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["consulting-company", user?.id],
    queryFn: async () => {
      if (!user || user.isGuest) return null;
      // Try to fetch existing, or create one
      const existing = await fetchConsultingCompany(user.id);
      if (existing) return existing;
      // Auto-create with user's name
      return getOrCreateConsultingCompany(user.id, user.name + " Consulting");
    },
    enabled: !!user && !user.isGuest,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["my-services", company?.id],
    queryFn: () => fetchMyServices(company!.id),
    enabled: !!company,
  });

  const handleDelete = useCallback(
    async (service: Service) => {
      if (!confirm(`Delete "${service.title}"? This cannot be undone.`)) return;
      const ok = await deleteService(service.id);
      if (ok) {
        toast({ title: "Service deleted", variant: "default" });
        queryClient.invalidateQueries({ queryKey: ["my-services"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
      } else {
        toast({ title: "Failed to delete service", variant: "destructive" });
      }
    },
    [queryClient],
  );

  const handleCreate = useCallback(async () => {
    if (!company) return;
    setCreating(true);
    try {
      // Navigate to editor — the editor will handle creation
      navigate(`/dashboard/services/new`);
    } finally {
      setCreating(false);
    }
  }, [company, navigate]);

  // Guest user
  if (user?.isGuest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-bold">Consulting Dashboard</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sign in to create and manage your travel consulting services.
        </p>
        <button
          onClick={() => navigate("/auth")}
          className="gold-gradient rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-5 pt-6 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springIn}>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </button>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-extrabold">Consulting Dashboard</h1>
              {company && (
                <p className="text-xs text-muted-foreground">{company.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !company}
            className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> New Service
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      {company && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.06 }}
          className="mt-5 grid grid-cols-3 gap-3"
        >
          <div className="glass rounded-2xl p-4 text-center">
            <div className="font-display text-2xl font-extrabold">{services.length}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Services</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="font-display text-2xl font-extrabold">
              {services.filter((s) => s.is_active).length}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Active</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="font-display text-2xl font-extrabold">
              {services.reduce((sum, s) => sum + s.review_count, 0)}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Reviews</div>
          </div>
        </motion.div>
      )}

      {/* Services list */}
      <div className="mt-6 space-y-3">
        {companyLoading || servicesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No services yet. Create your first one!</p>
            <button
              onClick={handleCreate}
              className="gold-gradient rounded-full px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Create Service
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="glass flex items-center gap-4 rounded-2xl p-4"
              >
                {/* Cover image */}
                {service.cover_image ? (
                  <img
                    src={service.cover_image}
                    alt={service.title}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-sm font-bold">{service.title}</h3>
                    {!service.is_active && (
                      <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                      ${Number(service.price).toLocaleString()}
                    </span>
                    {service.rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {Number(service.rating).toFixed(1)} ({service.review_count})
                      </span>
                    )}
                    <span>{service.category}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => navigate(`/services/${service.id}`)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                    aria-label="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/services/edit/${service.id}`)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
                    aria-label="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
