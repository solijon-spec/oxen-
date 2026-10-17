import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Send, Loader2, MessageCircle, ArrowLeft } from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchCompanyThreads,
  fetchThreadMessages,
  sendMessage,
  markThreadRead,
  subscribeToThread,
  type ClientThread,
  type ConsultingMessage,
} from "@/lib/consulting-messages";
import { cn } from "@/lib/utils";

// Same local-dev fallback company id used by the other new CRM pages,
// so a client who wrote in via the public "I'm Interested" flow (which
// uses the same dev-local id when no real company exists yet) shows up
// here too.
const DEV_LOCAL_COMPANY_ID = "dev-local-company";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function ConsultingMessages() {
  const { company } = useConsulting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id || DEV_LOCAL_COMPANY_ID;

  useSEO({ title: "Messages | OXEN Consulting", description: "Chat with your clients" });

  const [selected, setSelected] = useState<ClientThread | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadsQ = useQuery({
    queryKey: ["consulting-threads", companyId],
    queryFn: () => fetchCompanyThreads(companyId),
    staleTime: 10_000,
  });
  const threads = threadsQ.data ?? [];

  const messagesQ = useQuery({
    queryKey: ["consulting-thread-messages", selected?.client_id],
    queryFn: () => fetchThreadMessages(selected!.client_id),
    enabled: !!selected,
  });
  const messages = messagesQ.data ?? [];

  useEffect(() => {
    if (!selected) return;
    markThreadRead(selected.client_id, "employee").then(() =>
      queryClient.invalidateQueries({ queryKey: ["consulting-threads", companyId] }),
    );
    const unsubscribe = subscribeToThread(selected.client_id, () => {
      queryClient.invalidateQueries({ queryKey: ["consulting-thread-messages", selected.client_id] });
    });
    return unsubscribe;
  }, [selected, companyId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      sendMessage({ companyId, clientId: selected!.client_id, senderId: user?.id ?? "", senderRole: "employee", body }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["consulting-thread-messages", selected?.client_id] });
      queryClient.invalidateQueries({ queryKey: ["consulting-threads", companyId] });
    },
  });

  return (
    <DashboardShell title="Messages" subtitle="Chat with clients who reached out from the public site">
      <div className="flex gap-4" style={{ height: "calc(100vh - 220px)" }}>
        {/* Thread list */}
        <div className={cn("flex-col gap-2 overflow-y-auto", selected ? "hidden lg:flex lg:w-[280px] lg:shrink-0" : "flex w-full lg:w-[280px] lg:shrink-0")}>
          {threadsQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : threads.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No messages yet" description="Client conversations from the public site will appear here." />
          ) : (
            threads.map((t) => (
              <button
                key={t.client_id}
                onClick={() => setSelected(t)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl p-3 text-left transition",
                  selected?.client_id === t.client_id ? "bg-primary/15" : "bg-white/[0.03] hover:bg-white/[0.06]",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {t.client_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold">{t.client_name}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(t.last_message_at)}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{t.last_message ?? "—"}</p>
                </div>
                {t.unread_count > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {t.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Conversation */}
        <div className={cn("flex-1 flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02]", selected ? "flex" : "hidden lg:flex")}>
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <Users className="mr-2 h-4 w-4" /> Select a conversation
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 border-b border-white/[0.06] p-3">
                <button onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06] lg:hidden">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <p className="font-bold text-sm">{selected.client_name}</p>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
                {messagesQ.isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  messages.map((m) => <MessageBubble key={m.id} message={m} isMine={m.sender_role === "employee"} />)
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-white/[0.06] p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) sendMutation.mutate(draft.trim()); }}
                  placeholder="Type a reply…"
                  className="flex-1 rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  onClick={() => draft.trim() && sendMutation.mutate(draft.trim())}
                  disabled={!draft.trim() || sendMutation.isPending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gold-gradient text-primary-foreground transition active:scale-90 disabled:opacity-50"
                >
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function MessageBubble({ message, isMine }: { message: ConsultingMessage; isMine: boolean }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm", isMine ? "gold-gradient text-primary-foreground" : "bg-white/[0.06] text-foreground")}>
          {message.body}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
