import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  UserCog,
  Plus,
  Search,
  Mail,
  Phone,
  Loader2,
  X,
  Edit3,
  UserPlus,
  UserMinus,
  ShieldCheck,
  ShieldOff,
  Ban,
  CheckCircle2,
  Users,
  DollarSign,
  Activity,
  Calendar,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { DataTable, type Column } from "@/components/consulting/DataTable";
import { StatusBadge } from "@/components/consulting/StatusBadge";
import { EmptyState } from "@/components/consulting/EmptyState";
import { SlideOver } from "@/components/consulting/SlideOver";
import { ConfirmDialog } from "@/components/consulting/ConfirmDialog";
import { Field, SelectField } from "@/components/consulting/Field";
import { StatCard } from "@/components/consulting/StatCard";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  fetchMembers as apiFetchMembers,
  fetchInvitations as apiFetchInvitations,
  inviteMember as apiInviteMember,
  fetchEmployeeStats as apiFetchEmployeeStats,
  fetchClientById as apiFetchClientById,
  type ConsultingMember,
  type ConsultingInvitation,
  type MemberRole,
  type EmployeeStats,
} from "@/lib/consulting";
import {
  testFetchMembers,
  testFetchInvitations,
  testCreateInvitation,
  testFetchEmployeeStats,
  testAssignClientToEmployee,
  testFetchClients,
  testLogActivity,
  type TestMemberInput,
} from "@/lib/consulting-test-mode";
import { cn } from "@/lib/utils";

const ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: "owner", label: "Owner", description: "Full access to everything" },
  { value: "administrator", label: "Administrator", description: "Manage most company data" },
  { value: "manager", label: "Manager", description: "Clients, applications, employees" },
  { value: "consultant", label: "Consultant", description: "Assigned clients only" },
  { value: "support_agent", label: "Support Agent", description: "Messages and client support" },
  { value: "finance_manager", label: "Finance Manager", description: "Payments and reports" },
  { value: "content_manager", label: "Content Manager", description: "Packages and posts" },
  { value: "read_only", label: "Read Only", description: "View access only" },
];

function roleLabel(role: MemberRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function roleDescription(role: MemberRole): string {
  return ROLES.find((r) => r.value === role)?.description ?? "";
}

interface InviteInput {
  email: string;
  full_name: string;
  role: MemberRole;
}

export default function ConsultingEmployees() {
  const { company, can, isTestMode, changeMemberRole, changeMemberStatus, removeMember, logActivity } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id ?? "";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "invited" | "suspended" | "removed">("all");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<ConsultingMember | null>(null);
  const [profileMember, setProfileMember] = useState<ConsultingMember | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ConsultingMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ConsultingMember | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  useSEO({ title: "Employees | OXEN Consulting", description: "Manage your team and roles" });

  // Members
  const testMembers = useQuery({
    queryKey: ["consulting-members-test", companyId],
    queryFn: () => testFetchMembers(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realMembers = useQuery({
    queryKey: ["consulting-members", companyId],
    queryFn: () => apiFetchMembers(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const members = (isTestMode ? (testMembers.data ?? []) : (realMembers.data ?? [])) as ConsultingMember[];

  // Invitations
  const testInvites = useQuery({
    queryKey: ["consulting-invitations-test", companyId],
    queryFn: () => testFetchInvitations(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realInvites = useQuery({
    queryKey: ["consulting-invitations", companyId],
    queryFn: () => apiFetchInvitations(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const invitations = isTestMode ? (testInvites.data ?? []) : (realInvites.data ?? []);

  // Employee stats
  const testStats = useQuery({
    queryKey: ["consulting-employee-stats-test", companyId],
    queryFn: () => testFetchEmployeeStats(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realStats = useQuery({
    queryKey: ["consulting-employee-stats", companyId],
    queryFn: () => apiFetchEmployeeStats(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const stats = (isTestMode ? (testStats.data ?? []) : (realStats.data ?? [])) as EmployeeStats[];

  const statsByUserId = useMemo(() => {
    const map = new Map<string, EmployeeStats>();
    for (const s of stats) map.set(s.user_id, s);
    return map;
  }, [stats]);

  const canManage = can("employees:write") || can("members:write") || (can("clients:write") && isTestMode);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["consulting-members"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-members-test"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-invitations"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-invitations-test"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-employee-stats"] });
    queryClient.invalidateQueries({ queryKey: ["consulting-employee-stats-test"] });
  }, [queryClient]);

  // ── Mutations ──────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: async (input: InviteInput) => {
      if (isTestMode) {
        const { member } = testCreateInvitation(companyId, input.email, input.role, user?.id ?? "", input.full_name);
        testLogActivity(companyId, user?.id ?? null, "employee_invited", "member", member.id, {
          email: input.email,
          role: input.role,
          name: input.full_name,
        });
        return member;
      }
      return apiInviteMember(companyId, input.email, input.role, user?.id ?? "");
    },
    onSuccess: () => {
      toast({ title: "Invitation sent" });
      setInviteOpen(false);
      invalidate();
      void logActivity("employee_invited", "member", null, null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: MemberRole }) => changeMemberRole(id, role),
    onSuccess: (_ok, vars) => {
      toast({ title: "Role updated" });
      setEditing(null);
      invalidate();
      void logActivity("employee_role_changed", "member", vars.id, { new_role: vars.role });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) =>
      changeMemberStatus(id, suspend ? "suspended" : "active"),
    onSuccess: (_ok, vars) => {
      toast({ title: vars.suspend ? "Employee suspended" : "Employee activated" });
      setSuspendTarget(null);
      invalidate();
      void logActivity(vars.suspend ? "employee_suspended" : "employee_activated", "member", vars.id);
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => removeMember(id),
    onSuccess: (_ok, id) => {
      toast({ title: "Employee removed" });
      setRemoveTarget(null);
      invalidate();
      void logActivity("employee_removed", "member", id);
    },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ clientId, employeeId }: { clientId: string; employeeId: string | null }) => {
      if (isTestMode) return testAssignClientToEmployee(companyId, clientId, employeeId);
      const { assignClientToEmployee } = await import("@/lib/consulting");
      return assignClientToEmployee(clientId, employeeId);
    },
    onSuccess: (_ok, vars) => {
      toast({ title: "Client assigned" });
      setAssignOpen(false);
      queryClient.invalidateQueries({ queryKey: ["consulting-clients"] });
      queryClient.invalidateQueries({ queryKey: ["consulting-clients-test"] });
      queryClient.invalidateQueries({ queryKey: ["consulting-employee-stats"] });
      queryClient.invalidateQueries({ queryKey: ["consulting-employee-stats-test"] });
      void logActivity("client_assigned", "client", vars.clientId, { employee_id: vars.employeeId });
    },
    onError: () => toast({ title: "Failed to assign", variant: "destructive" }),
  });

  // ── Filtering ──────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    let rows = members;
    if (statusFilter !== "all") rows = rows.filter((m) => m.status === statusFilter);
    if (roleFilter !== "all") rows = rows.filter((m) => m.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (m) =>
          (m.profile?.name ?? "").toLowerCase().includes(q) ||
          (m.profile?.email ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [members, statusFilter, roleFilter, search]);

  // ── Team-level summary stats ───────────────────────────
  const teamSummary = useMemo(() => {
    const active = members.filter((m) => m.status === "active").length;
    const invited = members.filter((m) => m.status === "invited").length;
    const suspended = members.filter((m) => m.status === "suspended").length;
    const totalClients = stats.reduce((s, e) => s + e.total_clients, 0);
    const totalRevenue = stats.reduce((s, e) => s + e.revenue_generated, 0);
    const totalSuccess = stats.reduce((s, e) => s + e.successful_clients, 0);
    return { active, invited, suspended, totalClients, totalRevenue, totalSuccess };
  }, [members, stats]);

  // ── Columns ────────────────────────────────────────────
  const columns: Column<ConsultingMember>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Full name",
        render: (m) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
              {m.profile?.avatar_url ? (
                <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {(m.profile?.name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{m.profile?.name ?? "Unknown"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{m.profile?.email ?? "—"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (m) => (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary capitalize whitespace-nowrap">
            <ShieldCheck className="h-3 w-3" />
            {roleLabel(m.role)}
          </span>
        ),
      },
      {
        key: "email",
        header: "Email",
        hideOnMobile: true,
        render: (m) => <span className="text-xs text-foreground">{m.profile?.email ?? "—"}</span>,
      },
      {
        key: "active_clients",
        header: "Active",
        hideOnMobile: true,
        render: (m) => {
          const s = statsByUserId.get(m.user_id);
          return <span className="text-xs font-semibold text-foreground">{s?.active_clients ?? 0}</span>;
        },
      },
      {
        key: "total_clients",
        header: "Total",
        hideOnMobile: true,
        render: (m) => {
          const s = statsByUserId.get(m.user_id);
          return <span className="text-xs text-foreground">{s?.total_clients ?? 0}</span>;
        },
      },
      {
        key: "successful",
        header: "Success",
        hideOnMobile: true,
        render: (m) => {
          const s = statsByUserId.get(m.user_id);
          return <span className="text-xs font-semibold text-emerald-400">{s?.successful_clients ?? 0}</span>;
        },
      },
      {
        key: "unsuccessful",
        header: "Unsucc.",
        hideOnMobile: true,
        render: (m) => {
          const s = statsByUserId.get(m.user_id);
          return <span className="text-xs font-semibold text-destructive">{s?.unsuccessful_clients ?? 0}</span>;
        },
      },
      {
        key: "revenue",
        header: "Revenue",
        hideOnMobile: true,
        render: (m) => {
          const s = statsByUserId.get(m.user_id);
          return (
            <span className="text-xs font-semibold text-primary">
              ${(s?.revenue_generated ?? 0).toLocaleString()}
            </span>
          );
        },
      },
      {
        key: "success_rate",
        header: "Rate",
        hideOnMobile: true,
        render: (m) => {
          const s = statsByUserId.get(m.user_id);
          return <span className="text-xs text-foreground">{(s?.success_rate ?? 0).toFixed(1)}%</span>;
        },
      },
      {
        key: "last_active",
        header: "Last active",
        hideOnMobile: true,
        render: (m) => (
          <span className="text-xs text-muted-foreground">
            {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (m) => <StatusBadge status={m.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (m) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setProfileMember(m); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
              aria-label="View profile"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            {canManage && m.role !== "owner" && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(m); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
                  aria-label="Change role"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                {m.status === "active" ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSuspendTarget(m); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition hover:bg-amber-500/20"
                    aria-label="Suspend"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSuspendTarget(m); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20"
                    aria-label="Activate"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setRemoveTarget(m); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                  aria-label="Remove"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [canManage, statsByUserId],
  );

  return (
    <DashboardShell
      title="Employees"
      subtitle="Invite your team, assign roles, and track performance"
      actions={
        canManage && (
          <button
            onClick={() => setInviteOpen(true)}
            className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Invite Employee
          </button>
        )
      }
    >
      {/* Team summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active" value={teamSummary.active} icon={CheckCircle2} accent="green" delay={0} />
        <StatCard label="Invited" value={teamSummary.invited} icon={UserPlus} accent="blue" delay={0.05} />
        <StatCard label="Suspended" value={teamSummary.suspended} icon={Ban} accent="red" delay={0.1} />
        <StatCard label="Total Clients" value={teamSummary.totalClients} icon={Users} accent="gold" delay={0.15} />
        <StatCard label="Successful" value={teamSummary.totalSuccess} icon={CheckCircle2} accent="green" delay={0.2} />
        <StatCard label="Revenue" value={`$${teamSummary.totalRevenue.toLocaleString()}`} icon={DollarSign} accent="gold" delay={0.25} />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as MemberRole | "all")}
          className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
          <option value="removed">Removed</option>
        </select>
        {canManage && (
          <button
            onClick={() => setAssignOpen(true)}
            className="glass flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground transition hover:border-primary/30"
          >
            <Users className="h-3.5 w-3.5" />
            Assign client
          </button>
        )}
      </motion.div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-4 rounded-2xl p-4"
        >
          <h3 className="mb-3 font-display text-sm font-bold text-foreground">Pending invitations</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{inv.email}</p>
                    <p className="truncate text-[10px] text-muted-foreground">Role: {roleLabel(inv.role)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <DataTable
        columns={columns}
        rows={filteredMembers}
        rowKey={(m) => m.id}
        onRowClick={(m) => setProfileMember(m)}
        loading={isTestMode ? testMembers.isLoading : realMembers.isLoading}
        empty={
          <EmptyState
            icon={UserCog}
            title="No employees yet"
            description="Invite consultants and managers to help handle client applications. Each role has specific permissions."
            action={canManage ? { label: "Invite your first employee", onClick: () => setInviteOpen(true) } : undefined}
          />
        }
      />

      {/* Invite modal */}
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSubmit={(input) => inviteMutation.mutate(input)}
          loading={inviteMutation.isPending}
        />
      )}

      {/* Change role modal */}
      {editing && (
        <RoleModal
          member={editing}
          onClose={() => setEditing(null)}
          onSubmit={(role) => roleMutation.mutate({ id: editing.id, role })}
          loading={roleMutation.isPending}
        />
      )}

      {/* Employee profile slide-over */}
      <SlideOver
        open={!!profileMember}
        onClose={() => setProfileMember(null)}
        title={profileMember?.profile?.name ?? "Employee"}
        subtitle={profileMember ? roleLabel(profileMember.role) : ""}
        width="max-w-lg"
      >
        {profileMember && (
          <EmployeeProfileBody
            member={profileMember}
            stats={statsByUserId.get(profileMember.user_id) ?? null}
            isTestMode={isTestMode}
            companyId={companyId}
            onAssign={() => setAssignOpen(true)}
          />
        )}
      </SlideOver>

      {/* Assign client modal */}
      {assignOpen && (
        <AssignClientModal
          isTestMode={isTestMode}
          companyId={companyId}
          members={members.filter((m) => m.status === "active")}
          onClose={() => setAssignOpen(false)}
          onSubmit={(clientId, employeeId) => assignMutation.mutate({ clientId, employeeId })}
          loading={assignMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!suspendTarget}
        title={suspendTarget?.status === "active" ? "Suspend employee" : "Activate employee"}
        message={
          suspendTarget?.status === "active"
            ? `Suspend ${suspendTarget?.profile?.name ?? "this employee"}? They will lose dashboard access until reactivated.`
            : `Reactivate ${suspendTarget?.profile?.name ?? "this employee"}? They will regain dashboard access.`
        }
        confirmLabel={suspendTarget?.status === "active" ? "Suspend" : "Activate"}
        destructive={suspendTarget?.status === "active"}
        loading={suspendMutation.isPending}
        onConfirm={() => {
          if (suspendTarget) suspendMutation.mutate({ id: suspendTarget.id, suspend: suspendTarget.status === "active" });
        }}
        onCancel={() => setSuspendTarget(null)}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove employee"
        message={`Remove ${removeTarget?.profile?.name ?? "this employee"}? They will lose all access. This can be undone by re-inviting them.`}
        confirmLabel="Remove"
        destructive
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget.id);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </DashboardShell>
  );
}

/* ── Invite modal ──────────────────────────────────────── */

function InviteModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (input: InviteInput) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<InviteInput>({
    email: "",
    full_name: "",
    role: "consultant",
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Invite Employee</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <Field
              label="Full name"
              value={form.full_name}
              onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
              placeholder="Sarah Johnson"
              required
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              type="email"
              placeholder="sarah@yourcompany.com"
              required
            />
            <SelectField<MemberRole>
              label="Role"
              value={form.role}
              onChange={(v) => setForm((f) => ({ ...f, role: v }))}
              options={ROLES.map((r) => ({ value: r.value, label: `${r.label} — ${r.description}` }))}
              required
            />
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300/90">
              <Mail className="mr-1 inline h-3 w-3" />
              In test mode, the employee is added immediately. In production, they'll receive an email invitation.
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => form.email.trim() && form.full_name.trim() && onSubmit(form)}
              disabled={loading || !form.email.trim() || !form.full_name.trim()}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invite
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Role change modal ─────────────────────────────────── */

function RoleModal({
  member,
  onClose,
  onSubmit,
  loading,
}: {
  member: ConsultingMember;
  onClose: () => void;
  onSubmit: (role: MemberRole) => void;
  loading: boolean;
}) {
  const [role, setRole] = useState<MemberRole>(member.role);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Change Role</h3>
              <p className="text-xs text-muted-foreground">{member.profile?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                  role === r.value
                    ? "border-primary/40 bg-primary/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    role === r.value ? "border-primary bg-primary text-primary-foreground" : "border-white/20",
                  )}
                >
                  {role === r.value && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-[11px] text-muted-foreground">{r.description}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => role !== member.role && onSubmit(role)}
              disabled={loading || role === member.role}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Role
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Assign client modal ───────────────────────────────── */

function AssignClientModal({
  isTestMode,
  companyId,
  members,
  onClose,
  onSubmit,
  loading,
}: {
  isTestMode: boolean;
  companyId: string;
  members: ConsultingMember[];
  onClose: () => void;
  onSubmit: (clientId: string, employeeId: string | null) => void;
  loading: boolean;
}) {
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const testClients = useQuery({
    queryKey: ["consulting-clients-test-assign", companyId],
    queryFn: () => testFetchClients(companyId, {}),
    enabled: isTestMode && !!companyId,
    staleTime: 0,
  });
  const realClientsQuery = useQuery({
    queryKey: ["consulting-clients-assign", companyId],
    queryFn: async () => {
      const { fetchClients } = await import("@/lib/consulting");
      return fetchClients(companyId, { pageSize: 200 });
    },
    enabled: !isTestMode && !!companyId,
  });
  const clients = isTestMode ? (testClients.data ?? []) : (realClientsQuery.data?.clients ?? []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
      >
        <div className="glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Assign Client</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Client</span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Assign to</span>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user_id}>
                    {m.profile?.name ?? "Member"} ({roleLabel(m.role)})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="glass flex-1 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => clientId && onSubmit(clientId, employeeId || null)}
              disabled={loading || !clientId}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Employee profile slide-over body ──────────────────── */

function EmployeeProfileBody({
  member,
  stats,
  isTestMode,
  companyId,
  onAssign,
}: {
  member: ConsultingMember;
  stats: EmployeeStats | null;
  isTestMode: boolean;
  companyId: string;
  onAssign: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary/15">
          {member.profile?.avatar_url ? (
            <img src={member.profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-primary">
              {(member.profile?.name ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-foreground">
            {member.profile?.name ?? "Unknown"}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary">
              <ShieldCheck className="h-3 w-3" />
              {roleLabel(member.role)}
            </span>
            <StatusBadge status={member.status} />
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-2">
        <InfoRow icon={Mail} label="Email" value={member.profile?.email ?? "—"} />
        <InfoRow icon={Calendar} label="Joined" value={new Date(member.created_at).toLocaleDateString()} />
        <InfoRow
          icon={Activity}
          label="Last active"
          value={member.last_active_at ? new Date(member.last_active_at).toLocaleDateString() : "—"}
        />
      </div>

      {/* Role description */}
      <div className="glass rounded-xl p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
        <p className="mt-1 font-display text-sm font-bold text-foreground">{roleLabel(member.role)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{roleDescription(member.role)}</p>
      </div>

      {/* Performance stats */}
      <div>
        <p className="mb-2 font-display text-sm font-bold text-foreground">Performance</p>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Active clients" value={stats?.active_clients ?? 0} icon={Users} />
          <StatTile label="Total clients" value={stats?.total_clients ?? 0} icon={Users} />
          <StatTile label="Successful" value={stats?.successful_clients ?? 0} icon={CheckCircle2} accent="green" />
          <StatTile label="Unsuccessful" value={stats?.unsuccessful_clients ?? 0} icon={ShieldOff} accent="red" />
          <StatTile
            label="Revenue"
            value={`$${(stats?.revenue_generated ?? 0).toLocaleString()}`}
            icon={DollarSign}
            accent="gold"
          />
          <StatTile
            label="Success rate"
            value={`${(stats?.success_rate ?? 0).toFixed(1)}%`}
            icon={Activity}
            accent="blue"
          />
        </div>
      </div>

      {/* Assign client CTA */}
      <button
        onClick={onAssign}
        className="gold-gradient flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-primary-foreground transition active:scale-95"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Assign a client
      </button>

      <p className="border-t border-white/[0.06] pt-2 text-center text-[10px] text-muted-foreground">
        Member ID: {member.id.slice(0, 8)} · {isTestMode ? "Test Mode" : "Live"}
      </p>
    </div>
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
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="truncate text-right text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "green" | "red" | "gold" | "blue" | "default";
}) {
  const accentMap: Record<string, string> = {
    green: "text-emerald-400",
    red: "text-destructive",
    gold: "text-primary",
    blue: "text-sky-400",
    default: "text-foreground",
  };
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn("mt-1 font-display text-lg font-bold", accentMap[accent])}>{value}</p>
    </div>
  );
}
