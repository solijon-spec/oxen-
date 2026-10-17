import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Search,
  Plus,
  Eye,
  Loader2,
  X,
  Save,
  Upload,
  UserPlus,
  DollarSign,
  Printer,
  Download,
  History,
  CheckCircle2,
  XCircle,
  Edit3,
  Receipt,
  Filter,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { SlideOver } from "@/components/consulting/SlideOver";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { testFetchPackages, testFetchMembers } from "@/lib/consulting-test-mode";
import {
  fetchPosSales,
  createPosSale,
  updatePosSale,
  setSaleStatus,
  fetchSalePayments,
  addPosPayment,
  reversePosPayment,
  derivePackageStatus,
  countSoldForPackage,
  computePaymentProgress,
  buildReceipt,
  printReceipt,
  downloadReceipt,
  fullName,
  type PosSale,
  type PosSaleInput,
  type PosPayment,
  type PosPaymentInput,
  type PaymentMethod,
  type SaleStatus,
  type PackageSaleStatus,
  type PaymentProgressTier,
} from "@/lib/consulting-pos";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "RUB", "UZS", "JPY"] as const;
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_card", label: "Bank card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "online", label: "Online payment" },
  { value: "installment", label: "Installment" },
  { value: "other", label: "Other" },
];
const GENDERS = ["Male", "Female", "Other"] as const;

const PROGRESS_TIER_LABEL: Record<PaymentProgressTier, string> = {
  low: "Low payment",
  partial: "Partially paid",
  mostly: "Mostly paid",
  full: "Fully paid",
};

const PROGRESS_TIER_COLOR: Record<PaymentProgressTier, string> = {
  low: "bg-rose-500",
  partial: "bg-amber-500",
  mostly: "bg-sky-500",
  full: "bg-emerald-500",
};

const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  not_paid: "Not paid",
  partially_paid: "Partially paid",
  fully_paid: "Fully paid",
  overdue: "Overdue",
  completed: "Completed",
  cancelled: "Cancelled",
};

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function ConsultingPOS() {
  const { company, isTestMode, can } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [pkgSearch, setPkgSearch] = useState("");
  const [pkgCategory, setPkgCategory] = useState<string>("all");
  const [pkgDestination, setPkgDestination] = useState<string>("all");
  const [pkgStatus, setPkgStatus] = useState<PackageSaleStatus | "all">("all");
  const [pkgPayment, setPkgPayment] = useState<string>("all");

  const [saleSearch, setSaleSearch] = useState("");
  const [saleStatusFilter, setSaleStatusFilter] = useState<SaleStatus | "all">("all");
  const [saleEmployee, setSaleEmployee] = useState<string>("all");
  const [salePackage, setSalePackage] = useState<string>("all");

  const [addClientForPkg, setAddClientForPkg] = useState<{ packageId: string } | null>(null);
  const [viewSalesForPkg, setViewSalesForPkg] = useState<{ packageId: string } | null>(null);
  const [editingSale, setEditingSale] = useState<PosSale | null>(null);
  const [saleDetail, setSaleDetail] = useState<PosSale | null>(null);
  const [addPaymentFor, setAddPaymentFor] = useState<PosSale | null>(null);
  const [historyFor, setHistoryFor] = useState<PosSale | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PosSale | null>(null);
  const [completeTarget, setCompleteTarget] = useState<PosSale | null>(null);

  useSEO({ title: "POS | OXEN Consulting", description: "Point-of-sale — sell packages to clients and track payments" });

  const { data: packages = [], isLoading: pkgLoading } = useQuery({
    queryKey: ["consulting-packages", companyId, isTestMode],
    queryFn: () => testFetchPackages(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["consulting-members", companyId, isTestMode],
    queryFn: () => testFetchMembers(companyId),
    enabled: !!companyId && isTestMode,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pos-sales"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-txns"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-summary"] });
  }, [queryClient]);

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["pos-sales", companyId, saleSearch, saleStatusFilter, saleEmployee, salePackage],
    queryFn: () =>
      fetchPosSales(companyId, {
        search: saleSearch,
        status: saleStatusFilter,
        employeeId: saleEmployee,
        packageId: salePackage,
      }),
    enabled: !!companyId,
  });

  const canWrite = can("packages:write") || can("payments:write");

  const categories = useMemo(
    () => Array.from(new Set(packages.map((p) => p.service?.category).filter(Boolean))) as string[],
    [packages],
  );
  const destinations = useMemo(
    () => Array.from(new Set(packages.map((p) => p.destination_country).filter(Boolean))) as string[],
    [packages],
  );

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      if (pkgSearch.trim()) {
        const q = pkgSearch.toLowerCase();
        if (!p.service?.title?.toLowerCase().includes(q)) return false;
      }
      if (pkgCategory !== "all" && p.service?.category !== pkgCategory) return false;
      if (pkgDestination !== "all" && p.destination_country !== pkgDestination) return false;
      const sold = countSoldForPackage(companyId, p.id);
      const status = derivePackageStatus(p.available_slots ?? null, p.is_published, sold);
      if (pkgStatus !== "all" && status !== pkgStatus) return false;
      if (pkgPayment !== "all") {
        const pkgSales = sales.filter((s) => s.package_id === p.id);
        const hasStatus = pkgSales.some((s) => s.payment_status === pkgPayment);
        if (!hasStatus) return false;
      }
      return true;
    });
  }, [packages, pkgSearch, pkgCategory, pkgDestination, pkgStatus, pkgPayment, companyId, sales]);

  const handlePrintReceipt = useCallback((sale: PosSale) => {
    const payments = fetchSalePayments(companyId, sale.id).filter((p) => !p.is_reversed);
    const latest = payments[0];
    if (!latest) { toast({ title: "No payments to receipt", variant: "destructive" }); return; }
    if (!company) return;
    const receipt = buildReceipt({ name: company.name, logo_url: company.logo_url, contact_phone: company.contact_phone, contact_email: company.contact_email, address: company.address }, sale, latest);
    printReceipt(receipt);
  }, [companyId, company]);

  return (
    <DashboardShell
      title="POS"
      subtitle="Sell service packages to clients and track payments"
      showBack
    >
      {/* Package section */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-bold text-foreground">Service Packages</h3>
        </div>

        {/* Filters */}
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={pkgSearch}
              onChange={(e) => setPkgSearch(e.target.value)}
              placeholder="Search packages…"
              className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={pkgCategory}
            onChange={(e) => setPkgCategory(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={pkgDestination}
            onChange={(e) => setPkgDestination(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All destinations</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={pkgStatus}
            onChange={(e) => setPkgStatus(e.target.value as PackageSaleStatus | "all")}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="sold_out">Sold out</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {pkgLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No packages to sell"
            description="Create and publish service packages first. They will appear here as POS package cards you can sell to clients."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map((pkg, i) => {
              const sold = countSoldForPackage(companyId, pkg.id);
              const available = pkg.available_slots ?? null;
              const status = derivePackageStatus(available, pkg.is_published, sold);
              const price = Number(pkg.service?.price ?? 0);
              const currency = pkg.service?.currency ?? "USD";
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2) }}
                  className="glass flex flex-col overflow-hidden rounded-2xl"
                >
                  <div className="relative h-28 w-full overflow-hidden bg-white/[0.03]">
                    {pkg.service?.cover_image ? (
                      <img src={pkg.service.cover_image} alt={pkg.service.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingCart className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <PackageStatusBadge status={status} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="truncate font-display text-sm font-bold text-foreground">
                      {pkg.service?.title ?? "Untitled"}
                    </h3>
                    <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground/70">Destination:</span>
                        <span>{pkg.destination_country ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground/70">Category:</span>
                        <span>{pkg.service?.category ?? "General"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground/70">Price:</span>
                        <span className="font-display font-bold text-primary">{money(price, currency)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground/70">Duration:</span>
                        <span>{(pkg.contact_info as { long_description?: string } | null)?.long_description ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground/70">Available:</span>
                          <span>{available == null ? "Unlimited" : Math.max(0, available - sold)}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground/70">Sold:</span>
                          <span>{sold}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3">
                      <button
                        onClick={() => setAddClientForPkg({ packageId: pkg.id })}
                        disabled={!canWrite || status === "draft"}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-2 py-2 text-[11px] font-bold text-primary transition hover:bg-primary/20 disabled:opacity-40"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add client
                      </button>
                      <button
                        onClick={() => setViewSalesForPkg({ packageId: pkg.id })}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View sales
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sales table */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-bold text-foreground">Client Sales</h3>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={saleSearch}
              onChange={(e) => setSaleSearch(e.target.value)}
              placeholder="Search by client, phone, package, contract…"
              className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={saleStatusFilter}
            onChange={(e) => setSaleStatusFilter(e.target.value as SaleStatus | "all")}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All payment statuses</option>
            <option value="not_paid">Not paid</option>
            <option value="partially_paid">Partially paid</option>
            <option value="fully_paid">Fully paid</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={salePackage}
            onChange={(e) => setSalePackage(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All packages</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{p.service?.title ?? "Untitled"}</option>
            ))}
          </select>
          <select
            value={saleEmployee}
            onChange={(e) => setSaleEmployee(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none lg:col-span-1"
          >
            <option value="all">All employees</option>
            {members.map((m) => (
              <option key={m.id} value={m.user_id}>{m.profile?.name ?? "Member"}</option>
            ))}
          </select>
        </div>

        {salesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales yet"
            description="Use “Add client” on a package above to record your first sale. Each sale tracks payments, documents, and contract status."
          />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Package</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paid</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Remaining</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Next pay</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Employee</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sales.map((s, i) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{fullName(s)}</p>
                        <p className="text-[10px] text-muted-foreground">{s.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-xs text-foreground">{s.package_title}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-foreground">{money(s.final_price, s.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-emerald-400">{money(s.total_paid, s.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-amber-400">{money(s.remaining_amount, s.currency)}</td>
                      <td className="px-4 py-3">
                        <ProgressBar percentage={s.payment_percentage} tier={computePaymentProgress(s.total_paid, s.final_price).tier} compact />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(s.next_payment_date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{s.assigned_employee_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <SaleStatusBadge status={s.sale_status} paymentStatus={s.payment_status} />
                      </td>
                      <td className="px-4 py-3">
                        <SaleActions
                          sale={s}
                          canWrite={canWrite}
                          onView={() => setSaleDetail(s)}
                          onAddPayment={() => setAddPaymentFor(s)}
                          onEdit={() => setEditingSale(s)}
                          onHistory={() => setHistoryFor(s)}
                          onComplete={() => setCompleteTarget(s)}
                          onCancel={() => setCancelTarget(s)}
                          onPrintReceipt={() => handlePrintReceipt(s)}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 p-3 md:hidden">
              {sales.map((s) => (
                <div key={s.id} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{fullName(s)}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{s.package_title}</p>
                    </div>
                    <SaleStatusBadge status={s.sale_status} paymentStatus={s.payment_status} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold text-foreground">{money(s.final_price, s.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-semibold text-emerald-400">{money(s.total_paid, s.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-amber-400">{money(s.remaining_amount, s.currency)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <ProgressBar percentage={s.payment_percentage} tier={computePaymentProgress(s.total_paid, s.final_price).tier} compact />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <SaleActions
                      sale={s}
                      canWrite={canWrite}
                      onView={() => setSaleDetail(s)}
                      onAddPayment={() => setAddPaymentFor(s)}
                      onEdit={() => setEditingSale(s)}
                      onHistory={() => setHistoryFor(s)}
                      onComplete={() => setCompleteTarget(s)}
                      onCancel={() => setCancelTarget(s)}
                      onPrintReceipt={() => handlePrintReceipt(s)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      <AnimatePresence>
        {addClientForPkg && (
          <AddClientModal
            companyId={companyId}
            packageId={addClientForPkg.packageId}
            members={members}
            onClose={() => setAddClientForPkg(null)}
            onSaved={() => {
              invalidateAll();
              setAddClientForPkg(null);
              toast({ title: "Sale created" });
            }}
          />
        )}
        {editingSale && (
          <AddClientModal
            companyId={companyId}
            existingSale={editingSale}
            members={members}
            onClose={() => setEditingSale(null)}
            onSaved={() => {
              invalidateAll();
              setEditingSale(null);
              toast({ title: "Sale updated" });
            }}
          />
        )}
        {addPaymentFor && (
          <AddPaymentModal
            sale={addPaymentFor}
            members={members}
            onClose={() => setAddPaymentFor(null)}
            onSaved={() => {
              invalidateAll();
              setAddPaymentFor(null);
              toast({ title: "Payment recorded" });
            }}
          />
        )}
      </AnimatePresence>

      {/* Slidovers */}
      <SlideOver
        open={!!saleDetail}
        onClose={() => setSaleDetail(null)}
        title={saleDetail ? fullName(saleDetail) : ""}
        subtitle="Sale details"
        width="max-w-lg"
      >
        {saleDetail && <SaleDetail sale={saleDetail} onAddPayment={() => { setAddPaymentFor(saleDetail); setSaleDetail(null); }} />}
      </SlideOver>

      <SlideOver
        open={!!viewSalesForPkg}
        onClose={() => setViewSalesForPkg(null)}
        title="Package sales"
        subtitle={packages.find((p) => p.id === viewSalesForPkg?.packageId)?.service?.title ?? ""}
        width="max-w-lg"
      >
        {viewSalesForPkg && (
          <PackageSalesList
            companyId={companyId}
            packageId={viewSalesForPkg.packageId}
            onView={(s) => { setViewSalesForPkg(null); setSaleDetail(s); }}
          />
        )}
      </SlideOver>

      <SlideOver
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title="Payment history"
        subtitle={historyFor ? `${fullName(historyFor)} · ${historyFor.package_title}` : ""}
        width="max-w-lg"
      >
        {historyFor && <PaymentHistoryList companyId={companyId} sale={historyFor} />}
      </SlideOver>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel sale"
        message={`Cancel the sale to ${cancelTarget ? fullName(cancelTarget) : ""}? Remaining balance will be written off. This can be reversed by editing the sale.`}
        confirmLabel="Cancel sale"
        destructive
        onConfirm={() => {
          if (!cancelTarget) return;
          setSaleStatus(companyId, cancelTarget.id, "cancelled");
          invalidateAll();
          setCancelTarget(null);
          toast({ title: "Sale cancelled" });
        }}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={!!completeTarget}
        title="Mark contract completed"
        message={`Mark the contract for ${completeTarget ? fullName(completeTarget) : ""} as completed?`}
        confirmLabel="Mark completed"
        onConfirm={() => {
          if (!completeTarget) return;
          setSaleStatus(companyId, completeTarget.id, "completed");
          invalidateAll();
          setCompleteTarget(null);
          toast({ title: "Contract completed" });
        }}
        onCancel={() => setCompleteTarget(null)}
      />
    </DashboardShell>
  );
}

/* ── Package status badge ─────────────────────────────────── */

function PackageStatusBadge({ status }: { status: PackageSaleStatus }) {
  const map: Record<PackageSaleStatus, { cls: string; label: string }> = {
    active: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Active" },
    draft: { cls: "bg-muted text-muted-foreground border-border", label: "Draft" },
    sold_out: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Sold out" },
    closed: { cls: "bg-rose-500/15 text-rose-400 border-rose-500/20", label: "Closed" },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize whitespace-nowrap", s.cls)}>
      {s.label}
    </span>
  );
}

/* ── Sale status badge ────────────────────────────────────── */

function SaleStatusBadge({ status, paymentStatus }: { status: SaleStatus; paymentStatus: string }) {
  if (status === "completed") return <StatusBadge status="completed" label="Completed" />;
  if (status === "cancelled") return <StatusBadge status="cancelled" label="Cancelled" />;
  return <StatusBadge status={paymentStatus} label={SALE_STATUS_LABEL[paymentStatus as SaleStatus] ?? paymentStatus} />;
}

/* ── Progress bar ─────────────────────────────────────────── */

function ProgressBar({
  percentage,
  tier,
  compact = false,
}: {
  percentage: number;
  tier: PaymentProgressTier;
  compact?: boolean;
}) {
  return (
    <div className={cn("w-full", compact ? "min-w-[100px]" : "")}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percentage)}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
          className={cn("absolute inset-y-0 left-0 rounded-full", PROGRESS_TIER_COLOR[tier])}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px]">
        <span className="font-semibold text-foreground">{percentage.toFixed(0)}%</span>
        <span className="text-muted-foreground">{PROGRESS_TIER_LABEL[tier]}</span>
      </div>
    </div>
  );
}

/* ── Sale actions ─────────────────────────────────────────── */

function SaleActions({
  sale,
  canWrite,
  onView,
  onAddPayment,
  onEdit,
  onHistory,
  onComplete,
  onCancel,
  onPrintReceipt,
}: {
  sale: PosSale;
  canWrite: boolean;
  onView: () => void;
  onAddPayment: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onPrintReceipt: () => void;
}) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-lg transition";
  return (
    <div className="flex items-center gap-1">
      <button onClick={onView} className={cn(btn, "bg-white/[0.04] text-muted-foreground hover:text-foreground")} aria-label="View client" title="View client">
        <Eye className="h-3.5 w-3.5" />
      </button>
      {canWrite && sale.sale_status !== "cancelled" && sale.sale_status !== "completed" && (
        <button onClick={onAddPayment} className={cn(btn, "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20")} aria-label="Add payment" title="Add payment">
          <DollarSign className="h-3.5 w-3.5" />
        </button>
      )}
      {canWrite && (
        <button onClick={onEdit} className={cn(btn, "bg-primary/10 text-primary hover:bg-primary/20")} aria-label="Edit sale" title="Edit sale">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      )}
      <button onClick={onHistory} className={cn(btn, "bg-white/[0.04] text-muted-foreground hover:text-foreground")} aria-label="Payment history" title="Payment history">
        <History className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onPrintReceipt}
        className={cn(btn, "bg-white/[0.04] text-muted-foreground hover:text-foreground")}
        aria-label="Print receipt"
        title="Print receipt"
        disabled={sale.total_paid <= 0}
      >
        <Printer className="h-3.5 w-3.5" />
      </button>
      {canWrite && sale.sale_status !== "completed" && (
        <button onClick={onComplete} className={cn(btn, "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20")} aria-label="Mark completed" title="Mark completed">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
      )}
      {canWrite && sale.sale_status !== "cancelled" && (
        <button onClick={onCancel} className={cn(btn, "bg-destructive/10 text-destructive hover:bg-destructive/20")} aria-label="Cancel sale" title="Cancel sale">
          <XCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ── Add / Edit client modal (all spec fields) ────────────── */

interface AddClientModalProps {
  companyId: string;
  packageId?: string;
  existingSale?: PosSale;
  members: { id: string; user_id: string; profile?: { name: string | null } | null }[];
  onClose: () => void;
  onSaved: () => void;
}

function AddClientModal({ companyId, packageId, existingSale, members, onClose, onSaved }: AddClientModalProps) {
  const { user } = useAuth();
  const isEdit = !!existingSale;

  // Load packages to populate package selector + price
  const [packages] = useState(() => testFetchPackages(companyId));
  const [saving, setSaving] = useState(false);

  const initial = existingSale;
  const [form, setForm] = useState(() => ({
    package_id: initial?.package_id ?? packageId ?? "",
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    phone: initial?.phone ?? "",
    additional_phone: initial?.additional_phone ?? "",
    email: initial?.email ?? "",
    passport_number: initial?.passport_number ?? "",
    date_of_birth: initial?.date_of_birth ?? "",
    gender: initial?.gender ?? "",
    citizenship: initial?.citizenship ?? "",
    current_city: initial?.current_city ?? "",
    address: initial?.address ?? "",
    travel_or_program_date: initial?.travel_or_program_date ?? "",
    discount_amount: String(initial?.discount_amount ?? 0),
    assigned_employee_id: initial?.assigned_employee_id ?? "",
    contract_number: initial?.contract_number ?? "",
    application_date: initial?.application_date ?? new Date().toISOString().slice(0, 10),
    notes: initial?.notes ?? "",
    doc_passport_received: initial?.doc_passport_received ?? false,
    doc_photo_received: initial?.doc_photo_received ?? false,
    doc_application_form_received: initial?.doc_application_form_received ?? false,
    doc_diploma_received: initial?.doc_diploma_received ?? false,
    doc_translation_received: initial?.doc_translation_received ?? false,
    doc_other: initial?.doc_other ?? "",
    doc_missing_notes: initial?.doc_missing_notes ?? "",
    next_payment_date: initial?.next_payment_date ?? "",
    payment_method: (initial?.payment_method ?? "cash") as PaymentMethod,
  }));

  const set = useCallback(<K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const selectedPkg = packages.find((p) => p.id === form.package_id) ?? null;
  const pkgPrice = Number(selectedPkg?.service?.price ?? 0);
  const pkgCurrency = (selectedPkg?.service?.currency ?? "USD") as string;
  const pkgDestination = selectedPkg?.destination_country ?? "";
  const pkgDuration = (selectedPkg?.contact_info as { long_description?: string } | null)?.long_description ?? "";
  const discount = parseFloat(form.discount_amount) || 0;
  const finalPrice = Math.max(0, pkgPrice - discount);

  const handleSave = useCallback(async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      toast({ title: "First name, last name, and phone are required", variant: "destructive" });
      return;
    }
    if (!form.package_id) {
      toast({ title: "Select a service package", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const input: PosSaleInput = {
        package_id: form.package_id,
        package_title: selectedPkg?.service?.title ?? "Untitled",
        package_image: selectedPkg?.service?.cover_image ?? null,
        package_category: selectedPkg?.service?.category ?? null,
        destination_country: pkgDestination || null,
        duration: pkgDuration || null,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        additional_phone: form.additional_phone || null,
        email: form.email || null,
        passport_number: form.passport_number || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        citizenship: form.citizenship || null,
        current_city: form.current_city || null,
        address: form.address || null,
        travel_or_program_date: form.travel_or_program_date || null,
        package_full_price: pkgPrice,
        currency: pkgCurrency,
        discount_amount: discount,
        assigned_employee_id: form.assigned_employee_id || null,
        assigned_employee_name: members.find((m) => m.user_id === form.assigned_employee_id)?.profile?.name ?? null,
        contract_number: form.contract_number || null,
        application_date: form.application_date || null,
        notes: form.notes || null,
        doc_passport_received: form.doc_passport_received,
        doc_photo_received: form.doc_photo_received,
        doc_application_form_received: form.doc_application_form_received,
        doc_diploma_received: form.doc_diploma_received,
        doc_translation_received: form.doc_translation_received,
        doc_other: form.doc_other || null,
        doc_missing_notes: form.doc_missing_notes || null,
        next_payment_date: form.next_payment_date || null,
        payment_method: form.payment_method,
      };
      if (existingSale) {
        updatePosSale(companyId, existingSale.id, input as Partial<PosSale>);
      } else {
        createPosSale(companyId, input, user?.id ?? "");
      }
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [form, selectedPkg, pkgDestination, pkgDuration, pkgPrice, pkgCurrency, discount, members, existingSale, companyId, user, onSaved]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-2xl flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-bold">{isEdit ? "Edit Sale" : "Add Client to Package"}</h3>
            <p className="text-[11px] text-muted-foreground">Record a new sale and assign a client to a service package</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Package info */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Package information</h4>
            <SelectField<string>
              label="Service package"
              value={form.package_id}
              onChange={(v) => set("package_id", v)}
              options={[{ value: "", label: "Select a package" }, ...packages.map((p) => ({ value: p.id, label: p.service?.title ?? "Untitled" }))]}
              required
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Destination country" value={pkgDestination || "—"} onChange={() => {}} />
              <Field label="Travel / program date" type="date" value={form.travel_or_program_date} onChange={(v) => set("travel_or_program_date", v)} />
              <Field label="Package full price" value={pkgPrice ? String(pkgPrice) : "—"} onChange={() => {}} />
              <Field label="Currency" value={pkgCurrency} onChange={() => {}} />
              <Field label="Discount amount" type="number" value={form.discount_amount} onChange={(v) => set("discount_amount", v)} placeholder="0" />
              <Field label="Final price after discount" value={String(finalPrice)} onChange={() => {}} />
              <Field label="Duration" value={pkgDuration || "—"} onChange={() => {}} />
              <SelectField<string>
                label="Assigned employee / manager"
                value={form.assigned_employee_id}
                onChange={(v) => set("assigned_employee_id", v)}
                options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.user_id, label: m.profile?.name ?? "Member" }))]}
              />
              <Field label="Contract number" value={form.contract_number} onChange={(v) => set("contract_number", v)} placeholder="CTR-0001" />
              <Field label="Application date" type="date" value={form.application_date} onChange={(v) => set("application_date", v)} />
            </div>
            <div className="mt-3">
              <Field label="Notes" type="textarea" value={form.notes} onChange={(v) => set("notes", v)} placeholder="Internal notes about this sale…" />
            </div>
          </section>

          {/* Personal info */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Personal information</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" value={form.first_name} onChange={(v) => set("first_name", v)} required placeholder="John" />
              <Field label="Last name" value={form.last_name} onChange={(v) => set("last_name", v)} required placeholder="Doe" />
              <Field label="Phone number" type="tel" value={form.phone} onChange={(v) => set("phone", v)} required placeholder="+1…" />
              <Field label="Additional phone" type="tel" value={form.additional_phone} onChange={(v) => set("additional_phone", v)} placeholder="+1…" />
              <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="john@example.com" />
              <Field label="Passport number" value={form.passport_number} onChange={(v) => set("passport_number", v)} placeholder="P1234567" />
              <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => set("date_of_birth", v)} />
              <SelectField<string>
                label="Gender"
                value={form.gender}
                onChange={(v) => set("gender", v)}
                options={[{ value: "", label: "Not specified" }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
              />
              <SelectField<string>
                label="Citizenship"
                value={form.citizenship}
                onChange={(v) => set("citizenship", v)}
                options={[{ value: "", label: "None" }, ...COUNTRIES.map((c) => ({ value: c.name, label: c.name }))]}
              />
              <Field label="Current city" value={form.current_city} onChange={(v) => set("current_city", v)} />
              <Field label="Address" value={form.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
            </div>
          </section>

          {/* Document status */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Document status</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <DocToggle label="Passport received" checked={form.doc_passport_received} onChange={(v) => set("doc_passport_received", v)} />
              <DocToggle label="Photo received" checked={form.doc_photo_received} onChange={(v) => set("doc_photo_received", v)} />
              <DocToggle label="Application form received" checked={form.doc_application_form_received} onChange={(v) => set("doc_application_form_received", v)} />
              <DocToggle label="Diploma received" checked={form.doc_diploma_received} onChange={(v) => set("doc_diploma_received", v)} />
              <DocToggle label="Translation received" checked={form.doc_translation_received} onChange={(v) => set("doc_translation_received", v)} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Other documents" value={form.doc_other} onChange={(v) => set("doc_other", v)} placeholder="Notarized copy, bank statement…" />
              <Field label="Missing documents notes" type="textarea" value={form.doc_missing_notes} onChange={(v) => set("doc_missing_notes", v)} />
            </div>
          </section>

          {/* Payment info */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Payment</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Next payment date" type="date" value={form.next_payment_date} onChange={(v) => set("next_payment_date", v)} />
              <SelectField<PaymentMethod>
                label="Payment method"
                value={form.payment_method}
                onChange={(v) => set("payment_method", v)}
                options={PAYMENT_METHODS}
              />
            </div>
          </section>

          {/* Document upload placeholder */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Documents (upload later)</h4>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-6 text-muted-foreground transition hover:border-primary/40 hover:text-primary">
              <Upload className="h-5 w-5" />
              <span className="text-xs font-semibold">Files and document images can be uploaded after saving</span>
              <span className="text-[10px] text-muted-foreground/70">Stored alongside the sale without breaking existing storage</span>
            </label>
          </section>
        </div>

        <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
          <button onClick={onClose} className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save Changes" : "Create Sale"}
          </button>
        </footer>
      </motion.div>
    </>
  );
}

function DocToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="glass flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-primary" : "bg-muted")}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
        />
      </button>
    </label>
  );
}

/* ── Add payment modal ────────────────────────────────────── */

interface AddPaymentModalProps {
  sale: PosSale;
  members: { id: string; user_id: string; profile?: { name: string | null } | null }[];
  onClose: () => void;
  onSaved: () => void;
}

function AddPaymentModal({ sale, members, onClose, onSaved }: AddPaymentModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(String(sale.remaining_amount > 0 ? sale.remaining_amount : ""));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>(sale.payment_method ?? "cash");
  const [reference, setReference] = useState("");
  const [receivedBy, setReceivedBy] = useState(user?.id ?? "");
  const [comment, setComment] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const newTotal = sale.total_paid + amountNum;
  const newRemaining = Math.max(0, sale.final_price - newTotal);
  const newPct = sale.final_price > 0 ? Math.min(100, (newTotal / sale.final_price) * 100) : 0;

  const handleReceiptUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setReceiptUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(async () => {
    if (amountNum <= 0) {
      toast({ title: "Payment amount must be greater than 0", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const input: PosPaymentInput = {
        amount: amountNum,
        currency: sale.currency,
        payment_date: paymentDate,
        method,
        transaction_reference: reference || null,
        received_by: receivedBy || null,
        received_by_name: members.find((m) => m.user_id === receivedBy)?.profile?.name ?? user?.name ?? null,
        comment: comment || null,
        receipt_url: receiptUrl,
      };
      addPosPayment(sale.consulting_company_id, sale.id, input, user?.id ?? "", user?.name ?? null);
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Payment failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [amountNum, sale, paymentDate, method, reference, receivedBy, comment, receiptUrl, members, user, onSaved]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h3 className="font-display text-base font-bold">Add Payment</h3>
              <p className="text-[11px] text-muted-foreground">{fullName(sale)} · {sale.package_title}</p>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            {/* Payment summary preview */}
            <div className="glass rounded-2xl p-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-display font-bold text-foreground">{money(sale.final_price, sale.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid so far</p>
                  <p className="font-display font-bold text-emerald-400">{money(sale.total_paid, sale.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-display font-bold text-amber-400">{money(sale.remaining_amount, sale.currency)}</p>
                </div>
              </div>
              <div className="mt-2">
                <ProgressBar percentage={sale.payment_percentage} tier={computePaymentProgress(sale.total_paid, sale.final_price).tier} />
              </div>
            </div>

            <Field label="Payment amount" type="number" value={amount} onChange={setAmount} placeholder="0" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Payment date" type="date" value={paymentDate} onChange={setPaymentDate} />
              <SelectField<PaymentMethod> label="Payment method" value={method} onChange={setMethod} options={PAYMENT_METHODS} />
            </div>
            <Field label="Transaction reference" value={reference} onChange={setReference} placeholder="TXN-0001" />
            <SelectField<string>
              label="Cashier / employee who received payment"
              value={receivedBy}
              onChange={setReceivedBy}
              options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.user_id, label: m.profile?.name ?? "Member" }))]}
            />
            <Field label="Comment" type="textarea" value={comment} onChange={setComment} placeholder="Optional note…" />

            {/* Receipt upload */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Receipt image / document</span>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-4 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                <Upload className="h-4 w-4" />
                {receiptUrl ? "Receipt attached" : "Upload receipt"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReceiptUpload(f);
                  }}
                />
              </label>
              {receiptUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border border-white/[0.06]">
                  <img src={receiptUrl} alt="Receipt" className="h-24 w-full object-cover" />
                </div>
              )}
            </div>

            {/* New totals preview */}
            {amountNum > 0 && (
              <div className="glass rounded-2xl p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">After saving</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground">New paid</p>
                    <p className="font-display font-bold text-emerald-400">{money(newTotal, sale.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">New remaining</p>
                    <p className="font-display font-bold text-amber-400">{money(newRemaining, sale.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">New %</p>
                    <p className="font-display font-bold text-foreground">{newPct.toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
            <button onClick={onClose} className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Payment
            </button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Sale detail slidover content ─────────────────────────── */

function SaleDetail({ sale, onAddPayment }: { sale: PosSale; onAddPayment: () => void }) {
  const prog = computePaymentProgress(sale.total_paid, sale.final_price);
  return (
    <div className="space-y-4">
      {/* Package */}
      <div className="glass overflow-hidden rounded-2xl">
        {sale.package_image && (
          <div className="h-32 w-full overflow-hidden">
            <img src={sale.package_image} alt={sale.package_title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <h4 className="font-display text-sm font-bold text-foreground">{sale.package_title}</h4>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {sale.package_category && <span>Category: {sale.package_category}</span>}
            {sale.destination_country && <span>Destination: {sale.destination_country}</span>}
            {sale.duration && <span>Duration: {sale.duration}</span>}
          </div>
        </div>
      </div>

      {/* Payment tracker */}
      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment tracker</h4>
          <SaleStatusBadge status={sale.sale_status} paymentStatus={sale.payment_status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="font-display font-bold text-foreground">{money(sale.final_price, sale.currency)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[10px] text-muted-foreground">Discount</p>
            <p className="font-display font-bold text-foreground">{money(sale.discount_amount, sale.currency)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[10px] text-muted-foreground">Paid</p>
            <p className="font-display font-bold text-emerald-400">{money(sale.total_paid, sale.currency)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[10px] text-muted-foreground">Remaining</p>
            <p className="font-display font-bold text-amber-400">{money(sale.remaining_amount, sale.currency)}</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar percentage={sale.payment_percentage} tier={prog.tier} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>Next payment: <span className="text-foreground">{formatDate(sale.next_payment_date)}</span></div>
          <div>Method: <span className="text-foreground capitalize">{sale.payment_method ?? "—"}</span></div>
        </div>
        <button
          onClick={onAddPayment}
          className="gold-gradient mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold text-primary-foreground transition active:scale-95"
        >
          <DollarSign className="h-3.5 w-3.5" />
          Add payment
        </button>
      </div>

      {/* Client info */}
      <div className="glass rounded-2xl p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</h4>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <Detail label="Name" value={fullName(sale)} />
          <Detail label="Phone" value={sale.phone} />
          <Detail label="Email" value={sale.email ?? "—"} />
          <Detail label="Passport" value={sale.passport_number ?? "—"} />
          <Detail label="Date of birth" value={formatDate(sale.date_of_birth)} />
          <Detail label="Gender" value={sale.gender ?? "—"} />
          <Detail label="Citizenship" value={sale.citizenship ?? "—"} />
          <Detail label="City" value={sale.current_city ?? "—"} />
          <Detail label="Address" value={sale.address ?? "—"} />
          <Detail label="Contract #" value={sale.contract_number ?? "—"} />
          <Detail label="Employee" value={sale.assigned_employee_name ?? "—"} />
          <Detail label="Application date" value={formatDate(sale.application_date)} />
        </dl>
      </div>

      {/* Documents */}
      <div className="glass rounded-2xl p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Documents</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <DocRow label="Passport" ok={sale.doc_passport_received} />
          <DocRow label="Photo" ok={sale.doc_photo_received} />
          <DocRow label="Application form" ok={sale.doc_application_form_received} />
          <DocRow label="Diploma" ok={sale.doc_diploma_received} />
          <DocRow label="Translation" ok={sale.doc_translation_received} />
        </div>
        {sale.doc_other && <p className="mt-2 text-[11px] text-muted-foreground">Other: {sale.doc_other}</p>}
        {sale.doc_missing_notes && <p className="mt-1 text-[11px] text-amber-400">Missing: {sale.doc_missing_notes}</p>}
      </div>

      {sale.notes && (
        <div className="glass rounded-2xl p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</h4>
          <p className="text-sm text-foreground">{sale.notes}</p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function DocRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

/* ── Package sales list (slidover) ────────────────────────── */

function PackageSalesList({
  companyId,
  packageId,
  onView,
}: {
  companyId: string;
  packageId: string;
  onView: (sale: PosSale) => void;
}) {
  const sales = useMemo(() => fetchPosSales(companyId, { packageId }), [companyId, packageId]);
  if (sales.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
        No sales recorded for this package yet.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {sales.map((s) => (
        <button
          key={s.id}
          onClick={() => onView(s)}
          className="glass flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[0.04]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{fullName(s)}</p>
            <p className="text-[11px] text-muted-foreground">{formatDate(s.created_at)} · {s.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-foreground">{money(s.final_price, s.currency)}</p>
            <p className="text-[11px] text-emerald-400">{money(s.total_paid, s.currency)} paid</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Payment history list (slidover) ──────────────────────── */

function PaymentHistoryList({ companyId, sale }: { companyId: string; sale: PosSale }) {
  const [payments, setPayments] = useState<PosPayment[]>(() => fetchSalePayments(companyId, sale.id));
  const [reversingId, setReversingId] = useState<string | null>(null);

  const handleReverse = useCallback(
    (p: PosPayment) => {
      const reason = window.prompt("Reason for reversing this payment? (Refund / cancel)", "Refund");
      if (!reason) return;
      reversePosPayment(companyId, p.id, reason, sale.created_by, null);
      setPayments(fetchSalePayments(companyId, sale.id));
      toast({ title: "Payment reversed" });
    },
    [companyId, sale],
  );

  const handlePrint = useCallback((p: PosPayment) => {
    const freshSale = fetchPosSales(companyId).find((s) => s.id === sale.id) ?? sale;
    const receipt = buildReceipt(
      { name: "OXEN Consulting", logo_url: null, contact_phone: null, contact_email: null, address: null },
      freshSale,
      p,
    );
    printReceipt(receipt);
  }, [companyId, sale]);

  const handleDownload = useCallback((p: PosPayment) => {
    const freshSale = fetchPosSales(companyId).find((s) => s.id === sale.id) ?? sale;
    const receipt = buildReceipt(
      { name: "OXEN Consulting", logo_url: null, contact_phone: null, contact_email: null, address: null },
      freshSale,
      p,
    );
    downloadReceipt(receipt);
  }, [companyId, sale]);

  if (payments.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
        No payments recorded yet. Use “Add payment” to record the first installment.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((p) => (
        <div key={p.id} className={cn("glass rounded-2xl p-3", p.is_reversed && "opacity-60")}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-sm font-bold text-foreground">{money(p.amount, p.currency)}</p>
              <p className="text-[11px] text-muted-foreground">{formatDate(p.payment_date)} · {p.method}</p>
            </div>
            {p.is_reversed ? (
              <StatusBadge status="cancelled" label="Reversed" />
            ) : (
              <button
                onClick={() => handleReverse(p)}
                className="rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive transition hover:bg-destructive/20"
              >
                Reverse
              </button>
            )}
          </div>
          {p.transaction_reference && <p className="mt-1 text-[10px] text-muted-foreground">Ref: {p.transaction_reference}</p>}
          {p.received_by_name && <p className="text-[10px] text-muted-foreground">Received by: {p.received_by_name}</p>}
          {p.comment && <p className="mt-1 text-[11px] text-foreground/80">{p.comment}</p>}
          {p.reversal_reason && <p className="mt-1 text-[10px] text-amber-400">Reason: {p.reversal_reason}</p>}
          {!p.is_reversed && (
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => handlePrint(p)} className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground">
                <Printer className="h-3 w-3" /> Print receipt
              </button>
              <button onClick={() => handleDownload(p)} className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
