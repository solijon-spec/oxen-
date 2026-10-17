import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  UserCircle,
  ChevronDown,
  X,
  Eye,
  Shield,
  Ban,
  CheckCircle2,
  PauseCircle,
  Trash2,
  StickyNote,
  Mail,
  Phone,
  Globe2,
  Calendar,
  Lock,
  Building2,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllUsers,
  updateUserType,
  updateUserStatus,
  addUserNote,
  fetchUserNotes,
  type AdminUser,
  type AdminUserFilters,
  type UserType,
  type AccountStatus,
  type OwnerUserNote,
} from "@/lib/owner-admin";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

const USER_TYPE_LABEL: Record<UserType, string> = {
  ordinary: "Ordinary",
  consulting_applicant: "Consulting Applicant",
  premium_consulting: "Premium Consulting",
  owner: "Owner",
  manager: "Manager",
  employee: "Employee",
  cashier: "Cashier",
};

const STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
  blocked: "Blocked",
  deleted: "Deleted",
};

const STATUS_STYLE: Record<AccountStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  suspended: "bg-sky-500/15 text-sky-300",
  blocked: "bg-destructive/15 text-destructive",
  deleted: "bg-white/[0.06] text-muted-foreground",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function OwnerUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const useSEO_h = useSEO;
  useSEO_h({ title: "Users | OXEN Owner", description: "All registered OXEN users." });

  const [filters, setFilters] = useState<AdminUserFilters>({
    search: "",
    user_type: "all",
    account_status: "all",
    signup_period: "all",
    sort: "newest",
  });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [noteText, setNoteText] = useState("");

  const usersQ = useQuery({
    queryKey: ["owner-users", filters],
    queryFn: () => fetchAllUsers(filters),
    staleTime: 15_000,
  });

  const notesQ = useQuery({
    queryKey: ["owner-user-notes", selectedUser?.id],
    queryFn: () => fetchUserNotes(selectedUser!.id),
    enabled: !!selectedUser,
    staleTime: 0,
  });

  const users = usersQ.data ?? [];
  const notes: OwnerUserNote[] = notesQ.data ?? [];

  const handleTypeChange = useCallback(
    async (u: AdminUser, newType: UserType) => {
      const ok = await updateUserType(u.id, newType);
      if (ok) {
        toast({ title: "User type updated", description: `${u.name ?? u.email} → ${USER_TYPE_LABEL[newType]}` });
        queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      } else {
        toast({ title: "Failed to update user type", variant: "destructive" });
      }
    },
    [queryClient, toast],
  );

  const handleStatusChange = useCallback(
    async (u: AdminUser, newStatus: AccountStatus) => {
      const ok = await updateUserStatus(u.id, newStatus);
      if (ok) {
        toast({ title: "Account status updated", description: `${u.name ?? u.email} → ${STATUS_LABEL[newStatus]}` });
        queryClient.invalidateQueries({ queryKey: ["owner-users"] });
        if (selectedUser?.id === u.id) {
          setSelectedUser({ ...u, account_status: newStatus });
        }
      } else {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    },
    [queryClient, toast, selectedUser],
  );

  const handleAddNote = useCallback(async () => {
    if (!selectedUser || !noteText.trim() || !user) return;
    const ok = await addUserNote(selectedUser.id, user.id, noteText.trim());
    if (ok) {
      toast({ title: "Note added" });
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["owner-user-notes", selectedUser.id] });
    } else {
      toast({ title: "Failed to add note", variant: "destructive" });
    }
  }, [selectedUser, noteText, user, queryClient, toast]);

  const filterChips = useMemo(
    () => [
      { key: "user_type", value: "all", label: "All Types" },
      { key: "user_type", value: "ordinary", label: "Ordinary" },
      { key: "user_type", value: "consulting_applicant", label: "Applicants" },
      { key: "user_type", value: "premium_consulting", label: "Premium" },
      { key: "signup_period", value: "today", label: "New Today" },
      { key: "signup_period", value: "week", label: "This Week" },
      { key: "signup_period", value: "month", label: "This Month" },
      { key: "account_status", value: "active", label: "Active" },
      { key: "account_status", value: "suspended", label: "Suspended" },
    ],
    [],
  );

  return (
    <OwnerShell title="Users" subtitle="All registered OXEN accounts">
      {/* Search + filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.06]"
        >
          <Filter className="h-4 w-4" /> Filters
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showFilters && "rotate-180")} />
        </button>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filterChips.map((chip) => {
          const active = (filters as Record<string, string | undefined>)[chip.key] === chip.value;
          return (
            <button
              key={`${chip.key}-${chip.value}`}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  [chip.key]: active ? "all" : chip.value,
                }))
              }
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          );
        })}
        {(filters.user_type !== "all" ||
          filters.account_status !== "all" ||
          filters.signup_period !== "all" ||
          filters.search) && (
          <button
            onClick={() =>
              setFilters({ search: "", user_type: "all", account_status: "all", signup_period: "all", sort: "newest" })
            }
            className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      {usersQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Loading users…</div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="No users found"
          description={filters.search ? "Try a different search term." : "No registered OXEN users match these filters."}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/[0.04] lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ ...springIn, delay: i * 0.02 }}
                    className="transition hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-foreground">
                              {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{u.name ?? "—"}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {USER_TYPE_LABEL[u.user_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_STYLE[u.account_status])}>
                        {STATUS_LABEL[u.account_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.provider ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(u.last_login_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                      >
                        <Eye className="mr-1 inline h-3 w-3" /> View
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {users.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springIn, delay: i * 0.03 }}
                className="glass rounded-2xl p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-foreground">
                        {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{u.name ?? "—"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", STATUS_STYLE[u.account_status])}>
                    {STATUS_LABEL[u.account_status]}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{USER_TYPE_LABEL[u.user_type]}</span>
                  <span>{formatDate(u.created_at)}</span>
                </div>
                <button
                  onClick={() => setSelectedUser(u)}
                  className="mt-2 w-full rounded-lg bg-amber-500/15 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                >
                  View Details
                </button>
              </motion.div>
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            {users.length} {users.length === 1 ? "user" : "users"}
          </p>
        </>
      )}

      {/* User detail slide-over */}
      {selectedUser && (
        <UserDetailSlideover
          user={selectedUser}
          notes={notes}
          noteText={noteText}
          onNoteTextChange={setNoteText}
          onAddNote={handleAddNote}
          onTypeChange={(t) => handleTypeChange(selectedUser, t)}
          onStatusChange={(s) => handleStatusChange(selectedUser, s)}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </OwnerShell>
  );
}

/* ── User detail slide-over ──────────────────────────────── */

function UserDetailSlideover({
  user,
  notes,
  noteText,
  onNoteTextChange,
  onAddNote,
  onTypeChange,
  onStatusChange,
  onClose,
}: {
  user: AdminUser;
  notes: OwnerUserNote[];
  noteText: string;
  onNoteTextChange: (v: string) => void;
  onAddNote: () => void;
  onTypeChange: (t: UserType) => void;
  onStatusChange: (s: AccountStatus) => void;
  onClose: () => void;
}) {
  const typeOptions: UserType[] = ["ordinary", "consulting_applicant", "premium_consulting", "owner", "manager", "employee", "cashier"]; // eslint-disable-line @typescript-eslint/no-unused-vars
  const statusOptions: AccountStatus[] = ["active", "pending", "suspended", "blocked", "deleted"];

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-md flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="font-display text-base font-bold text-foreground">User Details</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Profile */}
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.06]">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserCircle className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-foreground">{user.name ?? "—"}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="mt-5 space-y-3">
            <InfoRow icon={Mail} label="Email" value={user.email ?? "—"} />
            <InfoRow icon={Phone} label="Phone" value={user.phone ?? "—"} />
            <InfoRow icon={Globe2} label="Country" value={user.country ?? "—"} />
            <InfoRow icon={Calendar} label="Joined" value={formatDate(user.created_at)} />
            <InfoRow icon={Calendar} label="Last Login" value={formatDate(user.last_login_at)} />
            <InfoRow icon={Lock} label="Provider" value={user.provider ?? "—"} />
            {user.consulting_company_name && (
              <InfoRow icon={Building2} label="Company" value={user.consulting_company_name} />
            )}
          </div>

          {/* Status + type controls */}
          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Account Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      user.account_status === s
                        ? STATUS_STYLE[s]
                        : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                User Type
              </p>
              <div className="flex flex-wrap gap-1.5">
                {typeOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => onTypeChange(t)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      user.user_type === t
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
                    )}
                  >
                    {USER_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            {user.account_status === "active" && (
              <button
                onClick={() => onStatusChange("suspended")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/10 py-2.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20"
              >
                <PauseCircle className="h-3.5 w-3.5" /> Suspend
              </button>
            )}
            {user.account_status === "suspended" && (
              <button
                onClick={() => onStatusChange("active")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Restore
              </button>
            )}
            {user.account_status !== "blocked" && (
              <button
                onClick={() => onStatusChange("blocked")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 py-2.5 text-xs font-bold text-destructive transition hover:bg-destructive/20"
              >
                <Ban className="h-3.5 w-3.5" /> Block
              </button>
            )}
          </div>

          {/* Internal notes */}
          <div className="mt-6">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <StickyNote className="h-3 w-3" /> Internal Notes
            </p>
            <div className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => onNoteTextChange(e.target.value)}
                placeholder="Add a private note…"
                className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && onAddNote()}
              />
              <button
                onClick={onAddNote}
                disabled={!noteText.trim()}
                className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {notes.length > 0 && (
              <div className="mt-3 space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-sm text-foreground">{n.note}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}


