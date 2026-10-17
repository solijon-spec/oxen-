import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UserX, Search, Unlock, Check, Info } from "lucide-react";

import SettingsPageShell, { Card, SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BlockedUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  blockedAt: string;
}

const MOCK_BLOCKED: BlockedUser[] = [
  { id: "u-1", name: "Spam Account", username: "@spam_bot_42", avatar: null, blockedAt: "2026-07-01" },
  { id: "u-2", name: "Fake User", username: "@fake_traveler", avatar: null, blockedAt: "2026-06-28" },
  { id: "u-3", name: "Harasser", username: "@negative_vibes", avatar: null, blockedAt: "2026-06-15" },
];

export default function BlockedUsers() {
  const { toast } = useToast();
  const [blocked, setBlocked] = useState<BlockedUser[]>(MOCK_BLOCKED);
  const [query, setQuery] = useState("");
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const filtered = blocked.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase()),
  );

  const handleUnblock = useCallback((user: BlockedUser) => {
    setUnblocking(user.id);
    setTimeout(() => {
      setBlocked((prev) => prev.filter((u) => u.id !== user.id));
      setUnblocking(null);
      toast({
        title: "User unblocked",
        description: `${user.name} can now interact with you again.`,
      });
    }, 800);
  }, [toast]);

  const handleUnblockAll = useCallback(() => {
    setBlocked([]);
    toast({ title: "All users unblocked", description: "Your block list is now empty." });
  }, [toast]);

  return (
    <SettingsPageShell
      title="Blocked Users"
      subtitle={`${blocked.length} user${blocked.length !== 1 ? "s" : ""} blocked`}
      icon={<ShieldCheck className="h-4.5 w-4.5" />}
    >
      {blocked.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] py-16 text-center">
          <Check className="mb-3 h-10 w-10 text-emerald-400" />
          <p className="text-sm font-semibold">No blocked users</p>
          <p className="mt-1 text-xs text-muted-foreground">Everyone can interact with you</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="profile-input-field rounded-2xl px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                placeholder="Search blocked users..."
              />
            </div>
          </div>

          {/* Blocked list */}
          <SectionLabel>Blocked Accounts</SectionLabel>
          <Card>
            <AnimatePresence>
              {filtered.map((user) => {
                const initials = user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                return (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -100 }}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-bold text-muted-foreground">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.username}</p>
                  <p className="text-[10px] text-muted-foreground/60">Blocked on {user.blockedAt}</p>
                </div>
                <button
                  onClick={() => handleUnblock(user)}
                  disabled={unblocking === user.id}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-xs font-semibold text-muted-foreground transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 active:scale-95 disabled:opacity-50"
                >
                  {unblocking === user.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                  Unblock
                </button>
              </motion.div>
              );
            })}
            </AnimatePresence>
          </Card>

          {filtered.length === 0 && (
            <div className="glass flex flex-col items-center py-10 text-center">
              <UserX className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No users match your search</p>
            </div>
          )}

          <PrimaryButton
            onClick={handleUnblockAll}
            className="border border-white/[0.08] bg-white/[0.04] text-foreground hover:bg-white/[0.08]"
          >
            <Unlock className="h-4 w-4" />
            Unblock All Users
          </PrimaryButton>
        </>
      )}

      {/* Info */}
      <div className="glass flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Blocked users cannot send you messages, see your posts, or interact with your content.
          You can unblock them at any time.
        </p>
      </div>
    </SettingsPageShell>
  );
}
