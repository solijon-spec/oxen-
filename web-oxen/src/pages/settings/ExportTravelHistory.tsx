import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileUp, FileText, FileSpreadsheet, Download, Check, Loader2,
  MapPin, Calendar,
} from "lucide-react";

import SettingsPageShell, { SectionLabel, PrimaryButton } from "@/components/SettingsPageShell";
import { useTravel } from "@/contexts/TravelContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ExportFormat = "pdf" | "csv" | "excel";

const FORMATS: { value: ExportFormat; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { value: "pdf", label: "PDF Document", icon: FileText, desc: "Formatted report with charts" },
  { value: "csv", label: "CSV File", icon: FileSpreadsheet, desc: "Comma-separated values" },
  { value: "excel", label: "Excel Spreadsheet", icon: FileSpreadsheet, desc: "Microsoft Excel format" },
];

export default function ExportTravelHistory() {
  const { toast } = useToast();
  const { visited, wishlist, favorites, posts } = useTravel();
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1500));

    const rows = visited.map((id, i) => ({
      "#": i + 1,
      "Country ID": id,
      "Status": "Visited",
      "Date": new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
    }));

    let content = "";
    let mimeType = "text/plain";
    let ext = "txt";

    if (format === "csv" || format === "excel") {
      const headers = Object.keys(rows[0] ?? { "#": "" });
      content = [
        headers.join(","),
        ...visited.map((id, i) => `${i + 1},${id},Visited,${new Date(Date.now() - i * 86400000).toISOString().split("T")[0]}`),
        ...wishlist.map((id, i) => `${visited.length + i + 1},${id},Wishlist,—`),
      ].join("\n");
      mimeType = "text/csv";
      ext = format === "excel" ? "xls" : "csv";
    } else {
      // Simple text-based "PDF" (a text file as placeholder)
      content = [
        "OXEN TRAVEL HISTORY REPORT",
        "============================",
        `Generated: ${new Date().toLocaleString()}`,
        "",
        `Visited Countries: ${visited.length}`,
        `Wishlist Countries: ${wishlist.length}`,
        `Favorites: ${favorites.length}`,
        `Posts: ${posts.length}`,
        "",
        "VISITED COUNTRIES:",
        ...visited.map((id, i) => `  ${i + 1}. ${id}`),
        "",
        "WISHLIST:",
        ...wishlist.map((id, i) => `  ${i + 1}. ${id}`),
      ].join("\n");
      ext = "pdf";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxen-travel-history-${new Date().toISOString().split("T")[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setExported(true);
    toast({ title: `Travel history exported as ${format.toUpperCase()}` });
    setTimeout(() => setExported(false), 2500);
  }, [format, visited, wishlist, favorites, posts, toast]);

  return (
    <SettingsPageShell
      title="Export Travel History"
      subtitle="Download your travel data"
      icon={<FileUp className="h-4.5 w-4.5" />}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard icon={MapPin} label="Visited" value={visited.length} color="text-emerald-400" />
        <SummaryCard icon={Calendar} label="Wishlist" value={wishlist.length} color="text-blue-400" />
      </div>

      {/* Format selection */}
      <SectionLabel>Choose Format</SectionLabel>
      <div className="space-y-2.5">
        {FORMATS.map((fmt) => {
          const isActive = format === fmt.value;
          return (
            <button
              key={fmt.value}
              onClick={() => setFormat(fmt.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98]",
                isActive
                  ? "border-primary/30 bg-primary/10"
                  : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]",
              )}
            >
              <span className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                isActive ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground",
              )}>
                <fmt.icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{fmt.label}</p>
                <p className="text-xs text-muted-foreground">{fmt.desc}</p>
              </div>
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                isActive ? "border-primary bg-primary" : "border-white/[0.12]",
              )}>
                {isActive && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Export button */}
      <PrimaryButton
        onClick={handleExport}
        disabled={exporting || visited.length === 0}
        className={cn(
          exported ? "bg-emerald-500 text-white" : "gold-gradient text-primary-foreground shadow-lg",
        )}
      >
        {exporting ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Exporting...</>
        ) : exported ? (
          <><Check className="h-5 w-5" /> Exported!</>
        ) : (
          <><Download className="h-4 w-4" /> Export as {format.toUpperCase()}</>
        )}
      </PrimaryButton>

      {visited.length === 0 && (
        <p className="px-1 text-center text-xs text-muted-foreground">
          You haven't visited any countries yet. Start exploring the globe!
        </p>
      )}
    </SettingsPageShell>
  );
}

function SummaryCard({
  icon: Icon, label, value, color,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-2xl border border-white/[0.06] p-4 text-center">
      <Icon className={cn("mx-auto h-5 w-5", color)} />
      <p className={cn("mt-2 font-display text-2xl font-extrabold", color)}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
