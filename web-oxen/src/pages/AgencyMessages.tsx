import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Building2, Send, Loader2, MessageCircle, Check, CheckCheck } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchMyAgencyThreads,
  fetchThreadMessages,
  sendMessage,
  markThreadRead,
  subscribeToThread,
  DEV_LOCAL_USER_ID,
  type AgencyThread,
  type ConsultingMessage,
} from "@/lib/consulting-messages";
import { cn } from "@/lib/utils";

function formatListTime(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatBubbleTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Bugun";
  if (d.toDateString() === yesterday.toDateString()) return "Kecha";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

/** Groups messages into day buckets, each with its own date divider. */
function groupByDay(messages: ConsultingMessage[]): { label: string; items: ConsultingMessage[] }[] {
  const groups: { label: string; items: ConsultingMessage[] }[] = [];
  for (const m of messages) {
    const label = dayLabel(m.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(m);
    else groups.push({ label, items: [m] });
  }
  return groups;
}

/**
 * AgencyMessages — "Xabarlar" (Messages) section in the site visitor's
 * own profile: a per-agency chat thread, separate from the social DM
 * inbox (/messages). Opened automatically after "I'm Interested" on a
 * tour post, or from the Profile action row.
 */
export default function AgencyMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id || DEV_LOCAL_USER_ID;

  useSEO({ title: "Agency Messages | OXEN", description: "Chat with travel & consulting agencies you've contacted." });

  const [selected, setSelected] = useState<AgencyThread | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const threadsQ = useQuery({
    queryKey: ["my-agency-threads", userId],
    queryFn: () => fetchMyAgencyThreads(userId),
    enabled: !!userId,
    staleTime: 10_000,
  });
  const threads = threadsQ.data ?? [];

  // Keep the open thread's header/unread state in sync with the list.
  const liveSelected = selected ? threads.find((t) => t.client_id === selected.client_id) ?? selected : null;

  const messagesQ = useQuery({
    queryKey: ["agency-thread-messages", selected?.client_id],
    queryFn: () => fetchThreadMessages(selected!.client_id),
    enabled: !!selected,
  });
  const messages = messagesQ.data ?? [];
  const dayGroups = useMemo(() => groupByDay(messages), [messages]);

  useEffect(() => {
    if (!selected) return;
    markThreadRead(selected.client_id, "client").then(() =>
      queryClient.invalidateQueries({ queryKey: ["my-agency-threads", userId] }),
    );
    const unsubscribe = subscribeToThread(selected.client_id, () => {
      queryClient.invalidateQueries({ queryKey: ["agency-thread-messages", selected.client_id] });
    });
    return unsubscribe;
  }, [selected, userId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      sendMessage({ companyId: selected!.consulting_company_id, clientId: selected!.client_id, senderId: userId, senderRole: "client", body }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["agency-thread-messages", selected?.client_id] });
      queryClient.invalidateQueries({ queryKey: ["my-agency-threads", userId] });
    },
  });

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  if (selected && liveSelected) {
    return (
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 pt-2">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 pt-2">
          <button
            onClick={() => setSelected(null)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/15">
              {liveSelected.company_logo_url ? (
                <img src={liveSelected.company_logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4.5 w-4.5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">{liveSelected.company_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">Konsalting / sayohat agentligi</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-0.5 py-4">
          {messagesQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <MessageCircle className="h-9 w-9 text-muted-foreground/25" />
              <p className="text-xs text-muted-foreground">Hali xabar yo'q — birinchi bo'lib yozing</p>
            </div>
          ) : (
            <div className="space-y-5">
              {dayGroups.map((group) => (
                <div key={group.label}>
                  <div className="mb-3 flex items-center justify-center">
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((m, i) => {
                      const prev = group.items[i - 1];
                      const grouped = !!prev && prev.sender_role === m.sender_role;
                      return (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          isMine={m.sender_role === "client"}
                          tight={grouped}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="flex items-end gap-2 border-t border-white/[0.06] py-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); autoGrow(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Xabar yozing…"
            className="flex-1 resize-none rounded-2xl border border-input bg-background/50 px-4 py-2.5 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sendMutation.isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full gold-gradient text-primary-foreground transition active:scale-90 disabled:opacity-40"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <div className="flex items-center gap-3 pb-5 pt-2">
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold">Agentliklar bilan xabarlar</h1>
          <p className="text-xs text-muted-foreground">Qiziqish bildirgan tur/xizmatlar bo'yicha suhbatlar</p>
        </div>
      </div>

      {threadsQ.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Hozircha suhbatlar yo'q</p>
          <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
            Bir tur paket sahifasida <span className="font-semibold text-foreground">"Qiziqdim"</span> tugmasini bosing — agentlik bilan suhbat shu yerda ochiladi
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t, i) => (
            <motion.button
              key={t.client_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring" as const, stiffness: 300, damping: 28 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(t)}
              className={cn(
                "glass flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:border-white/[0.14]",
                t.unread_count > 0 && "border-primary/25 bg-primary/[0.03]",
              )}
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/10">
                {t.company_logo_url ? (
                  <img src={t.company_logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-sm", t.unread_count > 0 ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>
                    {t.company_name}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatListTime(t.last_message_at)}</span>
                </div>
                <p className={cn("truncate text-xs", t.unread_count > 0 ? "font-medium text-foreground/80" : "text-muted-foreground")}>
                  {t.last_message ?? "—"}
                </p>
              </div>
              {t.unread_count > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {t.unread_count}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isMine, tight }: { message: ConsultingMessage; isMine: boolean; tight: boolean }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex", isMine ? "justify-end" : "justify-start", tight ? "mt-0.5" : "mt-2.5")}
      >
        <div
          className={cn(
            "group flex max-w-[78%] flex-col gap-0.5 rounded-2xl px-3.5 py-2.5",
            isMine
              ? "gold-gradient rounded-br-md text-primary-foreground"
              : "rounded-bl-md bg-white/[0.06] text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
          <div className={cn("flex items-center gap-1 self-end text-[10px]", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {formatBubbleTime(message.created_at)}
            {isMine && (message.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
