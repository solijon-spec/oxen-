import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Plus,
  Minus,
  ArrowLeftRight,
  Download,
  Search,
  Loader2,
  X,
  Save,
  Upload,
  TrendingUp,
  TrendingDown,
  Banknote,
  AlertTriangle,
  RotateCcw,
  Filter,
  Landmark,
  BarChart3,
  BellRing,
  Phone,
  MessageSquare,
  DollarSign,
  Printer,
  FileDown,
  ChevronRight,
  Edit3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchCashierSummary,
  fetchCashierTransactions,
  fetchCategories,
  fetchCashierSettings,
  updateCashierSettings,
  createCashierTransaction,
  reverseCashierTransaction,
  addIncomeCategory,
  addExpenseCategory,
  fetchAccounts,
  createAccount,
  updateAccount,
  fetchAllAccountSummaries,
  transferBetweenAccounts,
  fetchPaymentReminders,
  fetchReport,
  exportTransactionsCSV,
  resolvePeriod,
  type CashierTransaction,
  type CashierTxnInput,
  type TransactionType,
  type PaymentMethod,
  type AccountKind,
  type CashierAccount,
  type ReportPeriod,
  type ReportFilters,
  fullName,
  addPosPayment,
  type PosPaymentInput,
} from "@/lib/consulting-pos";
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
const ACCOUNT_KINDS: { value: AccountKind; label: string }[] = [
  { value: "main_cash", label: "Main cash register" },
  { value: "office_cash", label: "Office cash" },
  { value: "bank_account", label: "Bank account" },
  { value: "bank_card", label: "Bank card" },
  { value: "online", label: "Online payment account" },
  { value: "other", label: "Other account" },
];

type Tab = "transactions" | "accounts" | "reports" | "reminders";

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

export default function ConsultingCashier() {
  const { company, isTestMode, can } = useConsulting();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [tab, setTab] = useState<Tab>("transactions");

  // Transaction filters
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoryMgrOpen, setCategoryMgrOpen] = useState(false);
  const [accountMgrOpen, setAccountMgrOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<CashierTransaction | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  useSEO({ title: "Cashier | OXEN Consulting", description: "Financial overview — income, expenses, balances, accounts, and transactions" });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["cashier-summary"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-txns"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-categories"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-account-summaries"] });
    queryClient.invalidateQueries({ queryKey: ["pos-sales"] });
    queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
  }, [queryClient]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["cashier-summary", companyId],
    queryFn: () => fetchCashierSummary(companyId),
    enabled: !!companyId,
  });

  const { data: txns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ["cashier-txns", companyId, typeFilter, categoryFilter, search, dateFrom, dateTo],
    queryFn: () =>
      fetchCashierTransactions(companyId, {
        type: typeFilter,
        category: categoryFilter,
        search,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      }),
    enabled: !!companyId,
  });

  const { data: categories } = useQuery({
    queryKey: ["cashier-categories", companyId],
    queryFn: () => fetchCategories(companyId),
    enabled: !!companyId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["cashier-accounts", companyId],
    queryFn: () => fetchAccounts(companyId),
    enabled: !!companyId,
  });

  const { data: accountSummaries = [] } = useQuery({
    queryKey: ["cashier-account-summaries", companyId],
    queryFn: () => fetchAllAccountSummaries(companyId),
    enabled: !!companyId,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["payment-reminders", companyId],
    queryFn: () => fetchPaymentReminders(companyId),
    enabled: !!companyId,
  });

  const canWrite = can("cashier:write") || can("payments:write") || (can("payments:read") && isTestMode);
  const canManageAccounts = can("cashier:write") || can("*");
  const canViewReports = can("reports:read") || can("analytics:read") || isTestMode;

  const handleExport = useCallback(() => {
    exportTransactionsCSV(txns, `cashier-report-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: "CSV exported" });
  }, [txns]);

  const handleReverseConfirm = useCallback(() => {
    if (!reverseTarget || !reverseReason.trim()) return;
    reverseCashierTransaction(companyId, reverseTarget.id, reverseReason.trim());
    invalidateAll();
    setReverseTarget(null);
    setReverseReason("");
    toast({ title: "Transaction reversed" });
  }, [reverseTarget, reverseReason, companyId, invalidateAll]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: "transactions", label: "Transactions", icon: Banknote },
    { id: "accounts", label: "Accounts", icon: Landmark },
    { id: "reports", label: "Reports", icon: BarChart3, badge: undefined },
    { id: "reminders", label: "Reminders", icon: BellRing, badge: reminders.length || undefined },
  ];

  return (
    <DashboardShell
      title="Cashier"
      subtitle="Financial overview, income, expenses, and transactions"
      showBack
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
          >
            <Wallet className="h-3.5 w-3.5" />
            Opening balance
          </button>
          <button
            onClick={() => setCategoryMgrOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
          >
            <Filter className="h-3.5 w-3.5" />
            Categories
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      }
    >
      {/* Top action buttons */}
      {canWrite && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setIncomeOpen(true)}
            className="gold-gradient flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add income
          </button>
          <button
            onClick={() => setExpenseOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground transition active:scale-95"
          >
            <Minus className="h-4 w-4" />
            Add expense
          </button>
          <button
            onClick={() => setTransferOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-white/[0.1] active:scale-95"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </button>
        </div>
      )}

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="mb-8 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : summary ? (
        <section className="mb-6">
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Current Balance" value={money(summary.currentBalance, summary.currency)} icon={Wallet} accent="gold" delay={0} />
            <SummaryCard label="Total Income" value={money(summary.totalIncome, summary.currency)} icon={TrendingUp} accent="green" delay={0.05} />
            <SummaryCard label="Total Expenses" value={money(summary.totalExpenses, summary.currency)} icon={TrendingDown} accent="red" delay={0.1} />
            <SummaryCard label="Net Profit" value={money(summary.netProfit, summary.currency)} icon={Banknote} accent={summary.netProfit >= 0 ? "green" : "red"} delay={0.15} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Today's Income" value={money(summary.todayIncome, summary.currency)} icon={TrendingUp} accent="green" delay={0.2} compact />
            <SummaryCard label="Today's Expenses" value={money(summary.todayExpenses, summary.currency)} icon={TrendingDown} accent="red" delay={0.22} compact />
            <SummaryCard label="Month Income" value={money(summary.monthIncome, summary.currency)} icon={TrendingUp} accent="green" delay={0.24} compact />
            <SummaryCard label="Month Expenses" value={money(summary.monthExpenses, summary.currency)} icon={TrendingDown} accent="red" delay={0.26} compact />
            <SummaryCard label="Outstanding" value={money(summary.outstandingPayments, summary.currency)} icon={AlertTriangle} accent="gold" delay={0.28} compact />
            <SummaryCard label="Refund Total" value={money(summary.refundTotal, summary.currency)} icon={RotateCcw} accent="red" delay={0.3} compact />
          </div>
          <div className="mt-3 glass rounded-2xl p-3 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/70">Formula:</span> Current Balance = Opening Balance ({money(summary.openingBalance, summary.currency)}) + Total Income − Total Expenses. Net Profit = Total Income − Total Expenses.
          </div>
        </section>
      ) : null}

      {/* Tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.03] p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap",
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.badge != null && (
                <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "transactions" && (
        <TransactionsTab
          txns={txns}
          txnsLoading={txnsLoading}
          canWrite={canWrite}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          categories={categories}
          onReverse={(t) => { setReverseTarget(t); setReverseReason(""); }}
        />
      )}
      {tab === "accounts" && (
        <AccountsTab
          accounts={accounts}
          accountSummaries={accountSummaries}
          canManageAccounts={canManageAccounts}
          onManage={() => setAccountMgrOpen(true)}
          onTransfer={() => setTransferOpen(true)}
        />
      )}
      {tab === "reports" && canViewReports && (
        <ReportsTab companyId={companyId} onExport={handleExport} />
      )}
      {tab === "reminders" && (
        <RemindersTab reminders={reminders} companyId={companyId} onPaymentAdded={invalidateAll} />
      )}

      {/* Modals */}
      {incomeOpen && (
        <TxnModal
          type="income"
          companyId={companyId}
          categories={categories?.income ?? []}
          accounts={accounts}
          onClose={() => setIncomeOpen(false)}
          onSaved={() => { invalidateAll(); setIncomeOpen(false); toast({ title: "Income recorded" }); }}
        />
      )}
      {expenseOpen && (
        <TxnModal
          type="expense"
          companyId={companyId}
          categories={categories?.expense ?? []}
          accounts={accounts}
          onClose={() => setExpenseOpen(false)}
          onSaved={() => { invalidateAll(); setExpenseOpen(false); toast({ title: "Expense recorded" }); }}
        />
      )}
      {transferOpen && (
        <TransferModal
          companyId={companyId}
          accounts={accounts}
          onClose={() => setTransferOpen(false)}
          onSaved={() => { invalidateAll(); setTransferOpen(false); toast({ title: "Transfer completed" }); }}
        />
      )}
      {settingsOpen && (
        <SettingsModal companyId={companyId} onClose={() => setSettingsOpen(false)} onSaved={() => { invalidateAll(); setSettingsOpen(false); toast({ title: "Opening balance updated" }); }} />
      )}
      {categoryMgrOpen && (
        <CategoryManagerModal companyId={companyId} onClose={() => setCategoryMgrOpen(false)} onSaved={() => { invalidateAll(); setCategoryMgrOpen(false); }} />
      )}
      {accountMgrOpen && (
        <AccountManagerModal companyId={companyId} accounts={accounts} onClose={() => setAccountMgrOpen(false)} onSaved={() => { invalidateAll(); }} />
      )}

      <ConfirmDialog
        open={!!reverseTarget}
        title="Reverse transaction"
        message={reverseTarget ? `Reverse this ${reverseTarget.type} of ${money(reverseTarget.amount, reverseTarget.currency)}? This creates an audit entry — the transaction is never deleted.` : ""}
        confirmLabel="Reverse"
        destructive
        onConfirm={handleReverseConfirm}
        onCancel={() => { setReverseTarget(null); setReverseReason(""); }}
      />
      <AnimatePresenceReasonInput open={!!reverseTarget} reason={reverseReason} onChange={setReverseReason} />
    </DashboardShell>
  );
}

/* ── Transactions tab ────────────────────────────────────── */

function TransactionsTab({
  txns, txnsLoading, canWrite, search, setSearch, typeFilter, setTypeFilter,
  categoryFilter, setCategoryFilter, dateFrom, setDateFrom, dateTo, setDateTo,
  categories, onReverse,
}: {
  txns: CashierTransaction[];
  txnsLoading: boolean;
  canWrite: boolean;
  search: string;
  setSearch: (v: string) => void;
  typeFilter: TransactionType | "all";
  setTypeFilter: (v: TransactionType | "all") => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  categories: { income: string[]; expense: string[] } | undefined;
  onReverse: (t: CashierTransaction) => void;
}) {
  return (
    <section>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, client, reference…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TransactionType | "all")} className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
          <option value="all">All categories</option>
          {(categories?.income ?? []).map((c) => <option key={`i-${c}`} value={c}>{c}</option>)}
          {(categories?.expense ?? []).map((c) => <option key={`e-${c}`} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>

      {txnsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : txns.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No transactions yet"
          description="Record income and expenses to see your financial overview. POS client payments appear here automatically as income."
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Date", "Type", "Category", "Amount", "Method", "Description", "Related", "Employee", "Status", "Actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {txns.map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2) }} className={cn("hover:bg-white/[0.03]", t.is_reversed && "opacity-60")}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="px-4 py-3"><TxnTypeBadge type={t.type} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-foreground">{t.category}</td>
                    <td className={cn("whitespace-nowrap px-4 py-3 text-xs font-bold", t.type === "income" ? "text-emerald-400" : t.type === "expense" ? "text-destructive" : "text-foreground")}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{money(t.amount, t.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs capitalize text-muted-foreground">{t.method ?? "—"}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-foreground">{t.description ?? "—"}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs text-muted-foreground">
                      {t.related_client_name ? <span>{t.related_client_name}{t.related_package_title ? ` · ${t.related_package_title}` : ""}</span> : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{t.responsible_employee_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {t.is_reversed ? <StatusBadge status="cancelled" label="Reversed" /> : t.source_pos_payment_id ? <StatusBadge status="active" label="POS-linked" /> : <StatusBadge status="active" label="Active" />}
                    </td>
                    <td className="px-4 py-3">
                      {canWrite && !t.is_reversed && (
                        <button onClick={() => onReverse(t)} className="rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive transition hover:bg-destructive/20">Reverse</button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 p-3 md:hidden">
            {txns.map((t) => (
              <div key={t.id} className={cn("rounded-xl border border-white/[0.04] bg-white/[0.02] p-3", t.is_reversed && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <TxnTypeBadge type={t.type} />
                      <span className="text-[10px] text-muted-foreground">{formatDate(t.date)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-foreground">{t.description ?? t.category}</p>
                    <p className="text-[10px] text-muted-foreground">{t.category}</p>
                  </div>
                  <p className={cn("shrink-0 text-sm font-bold", t.type === "income" ? "text-emerald-400" : t.type === "expense" ? "text-destructive" : "text-foreground")}>
                    {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{money(t.amount, t.currency)}
                  </p>
                </div>
                {t.is_reversed && <p className="mt-1 text-[10px] text-amber-400">Reversed{t.reversal_reason ? `: ${t.reversal_reason}` : ""}</p>}
                {canWrite && !t.is_reversed && (
                  <button onClick={() => onReverse(t)} className="mt-2 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive">Reverse</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Accounts tab ────────────────────────────────────────── */

function AccountsTab({
  accounts, accountSummaries, canManageAccounts, onManage, onTransfer,
}: {
  accounts: CashierAccount[];
  accountSummaries: { account: CashierAccount; currentBalance: number; totalIncome: number; totalExpenses: number; lastTransactionDate: string | null }[];
  canManageAccounts: boolean;
  onManage: () => void;
  onTransfer: () => void;
}) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="No accounts configured"
        description="Set up your financial accounts (cash register, bank, online) to track balances and transfers."
        action={canManageAccounts ? { label: "Manage accounts", onClick: onManage } : undefined}
      />
    );
  }
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-bold text-foreground">Financial Accounts</h3>
        </div>
        {canManageAccounts && (
          <div className="flex gap-2">
            <button onClick={onTransfer} className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold text-foreground transition hover:bg-white/[0.1]">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
            </button>
            <button onClick={onManage} className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/20">
              <Edit3 className="h-3.5 w-3.5" /> Manage
            </button>
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accountSummaries.map((s, i) => (
          <motion.div
            key={s.account.id}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: Math.min(i * 0.05, 0.2) }}
            className={cn("glass rounded-2xl p-4", s.account.is_archived && "opacity-50")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foreground">{s.account.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.account.kind.replace(/_/g, " ")}</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Landmark className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white/[0.03] p-2">
                <p className="text-[10px] text-muted-foreground">Balance</p>
                <p className="font-display font-bold text-foreground">{money(s.currentBalance, s.account.currency)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2">
                <p className="text-[10px] text-muted-foreground">Income</p>
                <p className="font-display font-bold text-emerald-400">{money(s.totalIncome, s.account.currency)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2">
                <p className="text-[10px] text-muted-foreground">Expenses</p>
                <p className="font-display font-bold text-destructive">{money(s.totalExpenses, s.account.currency)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2">
                <p className="text-[10px] text-muted-foreground">Last txn</p>
                <p className="font-display font-bold text-foreground">{formatDate(s.lastTransactionDate)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── Reports tab ─────────────────────────────────────────── */

function ReportsTab({ companyId, onExport }: { companyId: string; onExport: () => void }) {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "all">("all");

  const filters: ReportFilters = useMemo(() => ({
    period,
    dateFrom: customFrom || null,
    dateTo: customTo || null,
    type: typeFilter,
    category: categoryFilter,
    employeeId: "all",
    method: methodFilter,
    accountId: "all",
    clientSearch: "",
    packageId: "all",
  }), [period, customFrom, customTo, typeFilter, categoryFilter, methodFilter]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["cashier-report", companyId, filters],
    queryFn: () => fetchReport(companyId, filters),
    enabled: !!companyId,
  });

  const { data: categories } = useQuery({
    queryKey: ["cashier-categories", companyId],
    queryFn: () => fetchCategories(companyId),
    enabled: !!companyId,
  });

  const periods: { id: ReportPeriod; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "custom", label: "Custom" },
  ];

  const maxIncome = Math.max(...(report?.incomeByCategory.map((c) => c.amount) ?? [0]), 1);
  const maxExpense = Math.max(...(report?.expensesByCategory.map((c) => c.amount) ?? [0]), 1);
  const maxMonthlyNet = Math.max(...(report?.monthlyNet.map((m) => Math.abs(m.net)) ?? [0]), 1);
  const maxPackageRevenue = Math.max(...(report?.topPackages.map((p) => p.revenue) ?? [0]), 1);

  return (
    <section>
      {/* Period + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition", period === p.id ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground")}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-input bg-background/50 px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none" />
            <span className="text-xs text-muted-foreground">→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-input bg-background/50 px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none" />
          </div>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TransactionType | "all")} className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
          <option value="all">All types</option>
          <option value="income">Income only</option>
          <option value="expense">Expenses only</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
          <option value="all">All categories</option>
          {(categories?.income ?? []).map((c) => <option key={`i-${c}`} value={c}>{c}</option>)}
          {(categories?.expense ?? []).map((c) => <option key={`e-${c}`} value={c}>{c}</option>)}
        </select>
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | "all")} className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
          <option value="all">All methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : report ? (
        <>
          {/* Summary */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Income" value={money(report.totalIncome, "USD")} icon={TrendingUp} accent="green" delay={0} />
            <SummaryCard label="Expenses" value={money(report.totalExpenses, "USD")} icon={TrendingDown} accent="red" delay={0.05} />
            <SummaryCard label="Net Profit" value={money(report.netProfit, "USD")} icon={Banknote} accent={report.netProfit >= 0 ? "green" : "red"} delay={0.1} />
          </div>

          {/* Export buttons */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={onExport} className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]">
              <FileDown className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.08]">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>

          {/* Visual summaries */}
          <div className="grid gap-3 lg:grid-cols-2">
            {/* Income vs Expenses */}
            <ReportCard title="Income vs Expenses">
              <div className="flex items-end gap-4 pt-2">
                <div className="flex-1">
                  <div className="h-32 rounded-xl bg-emerald-500/15 flex items-end overflow-hidden">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(report.totalIncome / Math.max(report.totalIncome + report.totalExpenses, 1)) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} className="w-full bg-emerald-500" />
                  </div>
                  <p className="mt-1.5 text-center text-[11px] font-semibold text-emerald-400">{money(report.totalIncome, "USD")}</p>
                </div>
                <div className="flex-1">
                  <div className="h-32 rounded-xl bg-destructive/15 flex items-end overflow-hidden">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(report.totalExpenses / Math.max(report.totalIncome + report.totalExpenses, 1)) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} className="w-full bg-destructive" />
                  </div>
                  <p className="mt-1.5 text-center text-[11px] font-semibold text-destructive">{money(report.totalExpenses, "USD")}</p>
                </div>
              </div>
            </ReportCard>

            {/* Monthly net profit */}
            <ReportCard title="Monthly Net Profit">
              <div className="flex items-end gap-2 pt-2" style={{ height: 128 }}>
                {report.monthlyNet.map((m, i) => (
                  <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(Math.abs(m.net) / maxMonthlyNet) * 80}%` }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 26 }}
                      className={cn("w-full rounded-t-md", m.net >= 0 ? "bg-emerald-500" : "bg-destructive")}
                      style={{ minHeight: 4 }}
                    />
                    <span className="text-[8px] text-muted-foreground">{m.label.slice(5)}</span>
                  </div>
                ))}
              </div>
            </ReportCard>

            {/* Expenses by category */}
            <ReportCard title="Expenses by Category">
              {report.expensesByCategory.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No expenses in this period</p>
              ) : (
                <div className="space-y-2">
                  {report.expensesByCategory.slice(0, 6).map((c) => (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{c.category}</span>
                        <span className="font-semibold text-foreground">{money(c.amount, "USD")}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(c.amount / maxExpense) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} className="h-full rounded-full bg-destructive" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ReportCard>

            {/* Top packages */}
            <ReportCard title="Top-Selling Packages">
              {report.topPackages.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No package sales yet</p>
              ) : (
                <div className="space-y-2">
                  {report.topPackages.map((p, i) => (
                    <div key={p.packageTitle} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{p.packageTitle}</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(p.revenue / maxPackageRevenue) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} className="h-full rounded-full bg-primary" />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-bold text-foreground">{money(p.revenue, "USD")}</p>
                        <p className="text-[9px] text-muted-foreground">{p.sold} sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ReportCard>

            {/* Outstanding payments */}
            <ReportCard title="Outstanding Client Payments">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">Total outstanding</p>
                  <p className="font-display text-2xl font-extrabold text-amber-400">{money(report.outstandingPayments, "USD")}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-400/50" />
              </div>
            </ReportCard>

            {/* Package sales revenue */}
            <ReportCard title="Package Sales Revenue">
              {report.revenueByPackage.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No revenue yet</p>
              ) : (
                <div className="space-y-2">
                  {report.revenueByPackage.slice(0, 5).map((p) => (
                    <div key={p.packageTitle} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">{p.packageTitle}</span>
                      <span className="shrink-0 font-semibold text-foreground">{money(p.amount, "USD")} ({p.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </ReportCard>
          </div>
        </>
      ) : null}
    </section>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </motion.div>
  );
}

/* ── Reminders tab ───────────────────────────────────────── */

function RemindersTab({
  reminders, companyId, onPaymentAdded,
}: {
  reminders: { sale: import("@/lib/consulting-pos").PosSale; kind: "overdue" | "due_today" | "due_soon"; daysLabel: string }[];
  companyId: string;
  onPaymentAdded: () => void;
}) {
  const { user } = useAuth();
  const [addPaymentFor, setAddPaymentFor] = useState<import("@/lib/consulting-pos").PosSale | null>(null);

  const handleCall = useCallback((phone: string) => {
    window.location.href = `tel:${phone}`;
  }, []);

  const handleSendMessage = useCallback((sale: import("@/lib/consulting-pos").PosSale) => {
    // Safe handler — no real SMS/WhatsApp unless integration exists
    toast({ title: "Message interface ready", description: `SMS/WhatsApp integration not connected. Client: ${fullName(sale)}` });
  }, []);

  const handleAddPayment = useCallback((sale: import("@/lib/consulting-pos").PosSale) => {
    setAddPaymentFor(sale);
  }, []);

  const handleQuickPayment = useCallback((sale: import("@/lib/consulting-pos").PosSale) => {
    const amountStr = window.prompt(`Add payment for ${fullName(sale)} (remaining: ${sale.remaining_amount} ${sale.currency})`, String(sale.remaining_amount));
    if (!amountStr) return;
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const input: PosPaymentInput = {
      amount,
      currency: sale.currency,
      payment_date: new Date().toISOString().slice(0, 10),
      method: sale.payment_method ?? "cash",
      transaction_reference: null,
      received_by: user?.id ?? null,
      received_by_name: user?.name ?? null,
      comment: "Quick payment from reminders",
      receipt_url: null,
    };
    addPosPayment(companyId, sale.id, input, user?.id ?? "", user?.name ?? null);
    onPaymentAdded();
    toast({ title: "Payment recorded" });
  }, [companyId, user, onPaymentAdded]);

  const kindStyle: Record<string, string> = {
    overdue: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    due_today: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    due_soon: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  };

  if (reminders.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="No payment reminders"
        description="Clients with overdue payments or upcoming due dates will appear here so you can follow up."
      />
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <BellRing className="h-5 w-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Payment Reminders</h3>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {reminders.map((r, i) => (
          <motion.div
            key={r.sale.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.2) }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foreground">{fullName(r.sale)}</p>
                <p className="text-[11px] text-muted-foreground">{r.sale.package_title}</p>
              </div>
              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold", kindStyle[r.kind])}>
                {r.daysLabel}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-white/[0.03] p-2">
                <p className="text-[10px] text-muted-foreground">Remaining</p>
                <p className="font-display font-bold text-amber-400">{money(r.sale.remaining_amount, r.sale.currency)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2">
                <p className="text-[10px] text-muted-foreground">Due date</p>
                <p className="font-display font-bold text-foreground">{formatDate(r.sale.next_payment_date)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2">
                <p className="text-[10px] text-muted-foreground">Employee</p>
                <p className="font-display font-bold text-foreground">{r.sale.assigned_employee_name ?? "—"}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => handleCall(r.sale.phone)} className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/20">
                <Phone className="h-3 w-3" /> Call
              </button>
              <button onClick={() => handleSendMessage(r.sale)} className="flex items-center gap-1 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-sky-400 transition hover:bg-sky-500/20">
                <MessageSquare className="h-3 w-3" /> Message
              </button>
              <button onClick={() => handleQuickPayment(r.sale)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20">
                <DollarSign className="h-3 w-3" /> Add payment
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── Summary card ─────────────────────────────────────────── */

function SummaryCard({
  label, value, icon: Icon, accent, delay = 0, compact = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "gold" | "green" | "red" | "blue";
  delay?: number;
  compact?: boolean;
}) {
  const accentMap: Record<string, string> = {
    gold: "bg-primary/15 text-primary",
    green: "bg-emerald-500/15 text-emerald-400",
    red: "bg-destructive/15 text-destructive",
    blue: "bg-sky-500/15 text-sky-400",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 26, delay }} className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("mt-1.5 font-display font-extrabold text-foreground", compact ? "text-lg" : "text-2xl")}>{value}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </motion.div>
  );
}

/* ── Transaction type badge ───────────────────────────────── */

function TxnTypeBadge({ type }: { type: TransactionType }) {
  const map: Record<TransactionType, { cls: string; label: string }> = {
    income: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Income" },
    expense: { cls: "bg-destructive/15 text-destructive border-destructive/20", label: "Expense" },
    transfer: { cls: "bg-sky-500/15 text-sky-400 border-sky-500/20", label: "Transfer" },
  };
  const s = map[type];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize whitespace-nowrap", s.cls)}>{s.label}</span>
  );
}

/* ── Transaction modal (income/expense) ──────────────────── */

interface TxnModalProps {
  type: TransactionType;
  companyId: string;
  categories: string[];
  accounts: CashierAccount[];
  onClose: () => void;
  onSaved: () => void;
}

function TxnModal({ type, companyId, categories, accounts, onClose, onSaved }: TxnModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(() => fetchCashierSettings(companyId).currency);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(categories[0] ?? "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");

  const handleReceiptUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setReceiptUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(async () => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) { toast({ title: "Amount must be greater than 0", variant: "destructive" }); return; }
    if (!category.trim()) { toast({ title: "Category is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let finalCategory = category;
      if (newCategory.trim() && !categories.includes(newCategory.trim())) {
        if (type === "income") addIncomeCategory(companyId, newCategory.trim());
        else if (type === "expense") addExpenseCategory(companyId, newCategory.trim());
        finalCategory = newCategory.trim();
      }
      const input: CashierTxnInput = {
        type,
        category: finalCategory,
        amount: amountNum,
        currency,
        date,
        method,
        description: description || null,
        related_sale_id: null,
        related_client_name: null,
        related_package_title: null,
        responsible_employee_id: user?.id ?? null,
        responsible_employee_name: user?.name ?? null,
        receipt_url: receiptUrl,
        transaction_reference: reference || null,
        source_pos_payment_id: null,
      };
      const txn = createCashierTransaction(companyId, input, user?.id ?? "", user?.name ?? null);
      // Attach account_id
      if (accountId) {
        const k = `oxen.consulting.test.${companyId}.cashierTxns`;
        try {
          const raw = localStorage.getItem(k);
          const rows = raw ? JSON.parse(raw) as (CashierTransaction & { account_id?: string })[] : [];
          const idx = rows.findIndex((r) => r.id === txn.id);
          if (idx !== -1) {
            rows[idx] = { ...rows[idx], account_id: accountId };
            localStorage.setItem(k, JSON.stringify(rows));
          }
        } catch { /* ignore */ }
      }
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [amount, category, newCategory, categories, type, companyId, currency, date, method, description, reference, receiptUrl, user, onSaved, accountId]);

  const title = type === "income" ? "Add Income" : type === "expense" ? "Add Expense" : "Transfer";

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
            <h3 className="font-display text-base font-bold">{title}</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount" type="number" value={amount} onChange={setAmount} placeholder="0" required />
              <SelectField<string> label="Currency" value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date" type="date" value={date} onChange={setDate} />
              <SelectField<PaymentMethod> label="Payment method" value={method} onChange={setMethod} options={PAYMENT_METHODS} />
            </div>
            <SelectField<string> label="Account" value={accountId} onChange={setAccountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
            <SelectField<string> label="Category" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} required />
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Add new category (optional)</span>
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Legal fees" className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none" />
            </div>
            <Field label="Description" type="textarea" value={description} onChange={setDescription} placeholder="Optional note about this transaction…" />
            <Field label="Transaction reference" value={reference} onChange={setReference} placeholder="TXN-0001" />
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Receipt / document</span>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-4 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                <Upload className="h-4 w-4" />
                {receiptUrl ? "Receipt attached" : "Upload receipt"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
              </label>
              {receiptUrl && <div className="mt-2 overflow-hidden rounded-lg border border-white/[0.06]"><img src={receiptUrl} alt="Receipt" className="h-24 w-full object-cover" /></div>}
            </div>
          </div>
          <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
            <button onClick={onClose} className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">Cancel</button>
            <button onClick={handleSave} disabled={saving} className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition active:scale-95 disabled:opacity-50", type === "expense" ? "bg-destructive text-destructive-foreground" : "gold-gradient text-primary-foreground")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Transfer modal ──────────────────────────────────────── */

function TransferModal({ companyId, accounts, onClose, onSaved }: { companyId: string; accounts: CashierAccount[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(accounts[0]?.currency ?? "USD");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const handleSave = useCallback(async () => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) { toast({ title: "Amount must be greater than 0", variant: "destructive" }); return; }
    if (fromAccountId === toAccountId) { toast({ title: "Select different accounts", variant: "destructive" }); return; }
    setSaving(true);
    try {
      transferBetweenAccounts(companyId, { fromAccountId, toAccountId, amount: amountNum, currency, date, description: description || null }, user?.id ?? "", user?.name ?? null);
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Transfer failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [companyId, fromAccountId, toAccountId, amount, currency, date, description, user, onSaved]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2">
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="font-display text-base font-bold">Transfer Between Accounts</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"><X className="h-4 w-4" /></button>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            <SelectField<string> label="From account" value={fromAccountId} onChange={setFromAccountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
            <SelectField<string> label="To account" value={toAccountId} onChange={setToAccountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount" type="number" value={amount} onChange={setAmount} placeholder="0" required />
              <SelectField<string> label="Currency" value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </div>
            <Field label="Date" type="date" value={date} onChange={setDate} />
            <Field label="Description" value={description} onChange={setDescription} placeholder="Optional note…" />
            <p className="text-[11px] text-muted-foreground">Transfers move money between accounts without counting as company income or expense.</p>
          </div>
          <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
            <button onClick={onClose} className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />} Transfer
            </button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Settings modal ──────────────────────────────────────── */

function SettingsModal({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const [settings, setSettings] = useState(() => fetchCashierSettings(companyId));
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(() => {
    setSaving(true);
    try {
      updateCashierSettings(companyId, { opening_balance: parseFloat(String(settings.opening_balance)) || 0, currency: settings.currency });
      onSaved();
    } finally { setSaving(false); }
  }, [companyId, settings, onSaved]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2">
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="font-display text-base font-bold">Cashier Settings</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"><X className="h-4 w-4" /></button>
          </header>
          <div className="space-y-4 px-5 py-4">
            <Field label="Opening balance" type="number" value={String(settings.opening_balance)} onChange={(v) => setSettings((s) => ({ ...s, opening_balance: parseFloat(v) || 0 }))} placeholder="0" />
            <SelectField<string> label="Currency" value={settings.currency} onChange={(v) => setSettings((s) => ({ ...s, currency: v }))} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            <p className="text-[11px] text-muted-foreground">Current Balance = Opening Balance + Total Income − Total Expenses.</p>
          </div>
          <footer className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
            <button onClick={onClose} className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Category manager modal ──────────────────────────────── */

function CategoryManagerModal({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const [cats, setCats] = useState(() => fetchCategories(companyId));
  const [newIncome, setNewIncome] = useState("");
  const [newExpense, setNewExpense] = useState("");

  const handleAddIncome = useCallback(() => {
    if (!newIncome.trim()) return;
    setCats(addIncomeCategory(companyId, newIncome.trim()));
    setNewIncome("");
  }, [companyId, newIncome]);

  const handleAddExpense = useCallback(() => {
    if (!newExpense.trim()) return;
    setCats(addExpenseCategory(companyId, newExpense.trim()));
    setNewExpense("");
  }, [companyId, newExpense]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2">
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="font-display text-base font-bold">Categories</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"><X className="h-4 w-4" /></button>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Income categories</h4>
              <div className="flex flex-wrap gap-1.5">{cats.income.map((c) => <span key={c} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">{c}</span>)}</div>
              <div className="mt-2 flex gap-2">
                <input value={newIncome} onChange={(e) => setNewIncome(e.target.value)} placeholder="New income category" className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none" />
                <button onClick={handleAddIncome} className="gold-gradient flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Add</button>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-destructive">Expense categories</h4>
              <div className="flex flex-wrap gap-1.5">{cats.expense.map((c) => <span key={c} className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">{c}</span>)}</div>
              <div className="mt-2 flex gap-2">
                <input value={newExpense} onChange={(e) => setNewExpense(e.target.value)} placeholder="New expense category" className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none" />
                <button onClick={handleAddExpense} className="flex items-center gap-1 rounded-xl bg-destructive px-3 py-2.5 text-xs font-bold text-destructive-foreground"><Plus className="h-3.5 w-3.5" /> Add</button>
              </div>
            </div>
          </div>
          <footer className="border-t border-white/[0.06] px-5 py-4">
            <button onClick={onSaved} className="gold-gradient w-full rounded-2xl py-3 text-sm font-bold text-primary-foreground">Done</button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Account manager modal ───────────────────────────────── */

function AccountManagerModal({ companyId, accounts, onClose, onSaved }: { companyId: string; accounts: CashierAccount[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [list, setList] = useState(accounts);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank_account");
  const [currency, setCurrency] = useState("USD");
  const [openingBalance, setOpeningBalance] = useState("0");

  const handleAdd = useCallback(() => {
    if (!name.trim()) { toast({ title: "Account name required", variant: "destructive" }); return; }
    const acc = createAccount(companyId, { name: name.trim(), kind, currency, opening_balance: parseFloat(openingBalance) || 0 }, user?.id ?? "");
    setList(fetchAccounts(companyId));
    setName("");
    setOpeningBalance("0");
    onSaved();
    toast({ title: "Account created" });
  }, [companyId, name, kind, currency, openingBalance, user, onSaved]);

  const handleArchive = useCallback((id: string) => {
    updateAccount(companyId, id, { is_archived: true });
    setList(fetchAccounts(companyId));
    onSaved();
    toast({ title: "Account archived" });
  }, [companyId, onSaved]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2">
        <div className="glass-strong rounded-3xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="font-display text-base font-bold">Manage Accounts</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"><X className="h-4 w-4" /></button>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              {list.map((a) => (
                <div key={a.id} className={cn("flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3", a.is_archived && "opacity-50")}>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.kind.replace(/_/g, " ")} · {a.currency}</p>
                  </div>
                  {!a.is_archived && (
                    <button onClick={() => handleArchive(a.id)} className="rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive">Archive</button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.06] pt-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Add new account</h4>
              <div className="space-y-3">
                <Field label="Account name" value={name} onChange={setName} placeholder="e.g. PayPal Business" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField<AccountKind> label="Type" value={kind} onChange={setKind} options={ACCOUNT_KINDS} />
                  <SelectField<string> label="Currency" value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
                </div>
                <Field label="Opening balance" type="number" value={openingBalance} onChange={setOpeningBalance} placeholder="0" />
                <button onClick={handleAdd} className="gold-gradient flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95">
                  <Plus className="h-4 w-4" /> Add account
                </button>
              </div>
            </div>
          </div>
          <footer className="border-t border-white/[0.06] px-5 py-4">
            <button onClick={onClose} className="gold-gradient w-full rounded-2xl py-3 text-sm font-bold text-primary-foreground">Done</button>
          </footer>
        </div>
      </motion.div>
    </>
  );
}

/* ── Reverse reason input ────────────────────────────────── */

function AnimatePresenceReasonInput({ open, reason, onChange }: { open: boolean; reason: string; onChange: (v: string) => void }) {
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fixed left-1/2 top-[calc(50%+120px)] z-[92] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2">
      <div className="glass-strong rounded-2xl p-3 shadow-2xl">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Reason for reversal</span>
          <input value={reason} onChange={(e) => onChange(e.target.value)} placeholder="Refund / correction / etc." className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary focus:outline-none" autoFocus />
        </label>
      </div>
    </motion.div>
  );
}
