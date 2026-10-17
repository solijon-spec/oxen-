import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Data models                                                        */
/* ------------------------------------------------------------------ */

export type ReportReason =
  | "spam"
  | "fake-account"
  | "harassment"
  | "inappropriate-content"
  | "copyright-violation"
  | "violence"
  | "hate-speech"
  | "scam"
  | "other";

export type ReportStatus = "pending" | "reviewing" | "resolved";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportedPostId: string | null;
  reason: ReportReason;
  description: string;
  createdAt: number;
  deviceInfo: string;
  status: ReportStatus;
  /* AI moderation fields */
  aiCategory: string;
  aiRiskLevel: RiskLevel;
  aiIsDuplicate: boolean;
  aiIsSpam: boolean;
  aiRecommendedAction: string;
}

export interface ReportReasonOption {
  value: ReportReason;
  label: string;
  icon: string;
}

export const REPORT_REASONS: ReportReasonOption[] = [
  { value: "spam", label: "Spam", icon: "📧" },
  { value: "fake-account", label: "Fake Account", icon: "🎭" },
  { value: "harassment", label: "Harassment", icon: "⚠️" },
  { value: "inappropriate-content", label: "Inappropriate Content", icon: "🚫" },
  { value: "copyright-violation", label: "Copyright Violation", icon: "©️" },
  { value: "violence", label: "Violence", icon: "💥" },
  { value: "hate-speech", label: "Hate Speech", icon: "💬" },
  { value: "scam", label: "Scam", icon: "🎣" },
  { value: "other", label: "Other", icon: "📋" },
];

/* ------------------------------------------------------------------ */
/*  AI Moderation                                                      */
/* ------------------------------------------------------------------ */

const HIGH_RISK_REASONS: ReportReason[] = ["violence", "hate-speech", "harassment"];
const MEDIUM_RISK_REASONS: ReportReason[] = ["fake-account", "scam", "inappropriate-content"];

interface AIModerationResult {
  category: string;
  riskLevel: RiskLevel;
  isDuplicate: boolean;
  isSpam: boolean;
  recommendedAction: string;
}

function runAIModeration(
  reason: ReportReason,
  description: string,
  existingReports: Report[],
): AIModerationResult {
  const lowerDesc = description.toLowerCase();

  // Duplicate detection — same reason + same first 50 chars within last 24h
  const now = Date.now();
  const isDuplicate = existingReports.some(
    (r) =>
      r.reason === reason &&
      r.description.slice(0, 50) === description.slice(0, 50) &&
      now - r.createdAt < 24 * 60 * 60 * 1000,
  );

  // Spam detection — short repetitive descriptions or spam keywords
  const spamKeywords = ["click here", "free money", "buy now", "limited offer", "act now", "congratulations you won"];
  const isSpam =
    lowerDesc.length < 10 ||
    spamKeywords.some((kw) => lowerDesc.includes(kw)) ||
    (lowerDesc.length > 0 && lowerDesc === lowerDesc.repeat(3).slice(0, lowerDesc.length));

  // Risk level
  let riskLevel: RiskLevel = "low";
  if (HIGH_RISK_REASONS.includes(reason)) {
    riskLevel = isDuplicate ? "medium" : "high";
    if (reason === "violence" && lowerDesc.includes("threat") || lowerDesc.includes("kill")) {
      riskLevel = "critical";
    }
  } else if (MEDIUM_RISK_REASONS.includes(reason)) {
    riskLevel = "medium";
  } else if (reason === "spam" || isSpam) {
    riskLevel = "low";
  }

  // Category
  const categoryMap: Record<ReportReason, string> = {
    spam: "Spam / Promotion",
    "fake-account": "Identity / Impersonation",
    harassment: "Safety / Interpersonal",
    "inappropriate-content": "Content Policy",
    "copyright-violation": "Intellectual Property",
    violence: "Safety / Critical",
    "hate-speech": "Safety / Discrimination",
    scam: "Fraud / Deception",
    other: "General / Unclassified",
  };

  // Recommended action
  let recommendedAction: string;
  if (riskLevel === "critical") {
    recommendedAction = "Immediate ban recommended. Escalate to senior moderator.";
  } else if (riskLevel === "high") {
    recommendedAction = "Suspend user pending review. Notify user with warning.";
  } else if (riskLevel === "medium") {
    recommendedAction = "Send warning to user. Monitor for repeat offenses.";
  } else if (isSpam || isDuplicate) {
    recommendedAction = "Dismiss as duplicate/spam. No action needed.";
  } else {
    recommendedAction = "Review manually. Low priority.";
  }

  return {
    category: categoryMap[reason],
    riskLevel,
    isDuplicate,
    isSpam,
    recommendedAction,
  };
}

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

interface ReportContextValue {
  reports: Report[];
  createReport: (input: {
    reporterId: string;
    reportedUserId: string;
    reportedPostId: string | null;
    reason: ReportReason;
    description: string;
  }) => Report;
  updateReportStatus: (id: string, status: ReportStatus) => void;
  dismissReport: (id: string) => void;
  getReportById: (id: string) => Report | null;
}

const REPORTS_KEY = "oxen.reports";

const ReportContext = createContext<ReportContextValue | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";
  return `${browser} · ${os} · ${screen.width}x${screen.height}`;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    setReports(load<Report[]>(REPORTS_KEY, []));
  }, []);

  const persist = useCallback((next: Report[]) => {
    save(REPORTS_KEY, next);
  }, []);

  const createReport = useCallback<ReportContextValue["createReport"]>(
    (input) => {
      const ai = runAIModeration(input.reason, input.description, reports);
      const report: Report = {
        id: crypto.randomUUID(),
        reporterId: input.reporterId,
        reportedUserId: input.reportedUserId,
        reportedPostId: input.reportedPostId,
        reason: input.reason,
        description: input.description,
        createdAt: Date.now(),
        deviceInfo: getDeviceInfo(),
        status: "pending",
        aiCategory: ai.category,
        aiRiskLevel: ai.riskLevel,
        aiIsDuplicate: ai.isDuplicate,
        aiIsSpam: ai.isSpam,
        aiRecommendedAction: ai.recommendedAction,
      };
      setReports((prev) => {
        const next = [report, ...prev];
        persist(next);
        return next;
      });
      return report;
    },
    [reports, persist],
  );

  const updateReportStatus = useCallback(
    (id: string, status: ReportStatus) => {
      setReports((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const dismissReport = useCallback(
    (id: string) => {
      setReports((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, status: "resolved" as ReportStatus } : r));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const getReportById = useCallback(
    (id: string) => reports.find((r) => r.id === id) ?? null,
    [reports],
  );

  const value = useMemo<ReportContextValue>(
    () => ({ reports, createReport, updateReportStatus, dismissReport, getReportById }),
    [reports, createReport, updateReportStatus, dismissReport, getReportById],
  );

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReports(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReports must be used within a ReportProvider");
  return ctx;
}
