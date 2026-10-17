import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Search, Building2, MapPin, LogIn,
  Check, Clock, AlertCircle, Send,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  findAgencyByCode, requestJoinAgency,
  type JoinRequestRole,
} from "@/lib/consulting";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

type LookupResult = {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  agency_code: string | null;
} | null;

/**
 * JoinAgency — find an agency by code and request access.
 *
 * Flow:
 * 1. User enters Agency Code + optional nickname/message
 * 2. Click "Find Agency" → lookup via findAgencyByCode()
 * 3. If found, show agency card + "Request Access" button
 * 4. Click request → creates pending join request (owner must approve)
 */
export default function JoinAgency() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useConsulting();

  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<LookupResult>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [requestedRole, setRequestedRole] = useState<JoinRequestRole>("employee");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useSEO({
    title: "Join Agency | OXEN CRM",
    description: "Find and join a travel agency by code.",
  });

  const handleFind = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setLookupError("Enter an agency code.");
      return;
    }
    setLooking(true);
    setLookupError(null);
    setFound(null);
    setRequestSent(false);
    try {
      const result = await findAgencyByCode(cleanCode);
      if (result.error) {
        setLookupError(result.error);
      } else if (result.agency) {
        setFound({
          id: result.agency.id,
          name: result.agency.name,
          logo_url: result.agency.logo_url ?? null,
          city: result.agency.city ?? null,
          country: result.agency.country ?? null,
          agency_code: result.agency.agency_code ?? null,
        });
      } else {
        setLookupError("No agency found with that code.");
      }
    } catch {
      setLookupError("Failed to search. Please try again.");
    } finally {
      setLooking(false);
    }
  };

  const handleRequest = async () => {
    if (!found || !user) return;
    setRequesting(true);
    try {
      const result = await requestJoinAgency({
        agencyId: found.id,
        userId: user.id,
        requestedRole,
        message: nickname.trim() || undefined,
      });
      if (result.ok) {
        setRequestSent(true);
        refresh();
        toast({
          title: "Request sent!",
          description: `Your request to join ${found.name} has been submitted. The owner will review it.`,
        });
      } else {
        toast({
          title: "Could not send request",
          description: result.error ?? "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Could not send request",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-5">
          <button
            onClick={() => navigate("/consulting/workspace")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Join Existing Agency</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8"
        >
          {/* Agency Code input */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              Agency Code <span className="text-destructive">*</span>
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              Ask the agency owner for the code (format: OX-XXX-XXXXX).
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setLookupError(null);
                  setFound(null);
                  setRequestSent(false);
                }}
                placeholder="OX-TRV-7K29Q"
                maxLength={20}
                className={cn(
                  "flex-1 rounded-xl border bg-white/[0.03] px-4 py-3 text-sm font-mono uppercase tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-none",
                  lookupError
                    ? "border-destructive/40 focus:border-destructive"
                    : "border-white/[0.06] focus:border-primary/40",
                )}
              />
              <button
                onClick={handleFind}
                disabled={looking || !code.trim()}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {looking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Find Agency
              </button>
            </div>
            {lookupError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {lookupError}
              </p>
            )}
          </div>

          {/* Nickname / message */}
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
              Agency Nickname <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="A short note for the agency owner…"
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
            />
          </div>

          {/* Found agency card */}
          {found && !requestSent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springIn}
              className="mb-6"
            >
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
                    {found.logo_url ? (
                      <img src={found.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-bold text-foreground">
                      {found.name}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {found.country && <span>{found.country}</span>}
                      {found.city && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> {found.city}
                        </span>
                      )}
                      {found.agency_code && (
                        <span className="font-mono text-[10px] tracking-wider">
                          {found.agency_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role selector */}
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Request Role
                  </label>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "admin", label: "Admin" },
                        { value: "manager", label: "Manager" },
                        { value: "employee", label: "Employee" },
                      ] as { value: JoinRequestRole; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setRequestedRole(opt.value)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                          requestedRole === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "border border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Request button */}
                <button
                  onClick={handleRequest}
                  disabled={requesting}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Request…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Request Access
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Request sent confirmation */}
          {requestSent && found && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springIn}
              className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">
                Request Sent!
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Your request to join <strong className="text-foreground">{found.name}</strong> has been
                submitted. The agency owner will review and approve it.
              </p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Pending approval
              </div>
              <button
                onClick={() => navigate("/consulting/workspace")}
                className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/[0.04]"
              >
                Back to Workspace
              </button>
            </motion.div>
          )}

          {/* Empty state before search */}
          {!found && !requestSent && !lookupError && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
                <LogIn className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter an Agency Code above to find your agency.
              </p>
            </div>
          )}

          {/* Back link */}
          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <button
              onClick={() => navigate("/consulting/workspace")}
              className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              ← Back to Workspace
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
