import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  loading,
  pagination,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="glass overflow-hidden rounded-2xl">
        <div className="space-y-1 p-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return <>{empty ?? <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No records</div>}</>;
  }

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row, i) => (
              <motion.tr
                key={rowKey(row)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-white/[0.03]",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 p-3 md:hidden">
        {rows.map((row, i) => (
          <motion.div
            key={rowKey(row)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.2) }}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "rounded-xl border border-white/[0.04] bg-white/[0.02] p-3",
              onRowClick && "cursor-pointer active:scale-[0.99]",
            )}
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c, idx) => (
                <div key={c.key} className={cn("flex items-center justify-between gap-3 py-1", idx > 0 && "border-t border-white/[0.03] mt-1 pt-2")}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.header}</span>
                  <span className="min-w-0 text-right text-xs text-foreground">{c.render(row)}</span>
                </div>
              ))}
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            Page {pagination.page} of {totalPages} · {pagination.total} total
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.page + 1))}
              disabled={pagination.page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
