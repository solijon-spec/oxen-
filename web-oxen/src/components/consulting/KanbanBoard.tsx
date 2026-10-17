import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface KanbanColumn<T> {
  id: string;
  title: string;
  accent: string;
  items: T[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  itemId: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  /** Called when an item is dropped into a new column. */
  onMove: (item: T, fromColumnId: string, toColumnId: string) => void;
}

/**
 * Lightweight Kanban with HTML5 drag-and-drop. No extra dependencies.
 * Works on desktop (drag) and mobile (tap-to-select then tap column).
 */
export function KanbanBoard<T>({
  columns,
  itemId,
  renderCard,
  onMove,
}: KanbanBoardProps<T>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [tapItem, setTapItem] = useState<{ id: string; from: string } | null>(null);

  const handleDrop = (toColumnId: string) => {
    if (!dragId || !dragFrom) return;
    if (dragFrom !== toColumnId) {
      const fromCol = columns.find((c) => c.id === dragFrom);
      const item = fromCol?.items.find((it) => itemId(it) === dragId);
      if (item) onMove(item, dragFrom, toColumnId);
    }
    setDragId(null);
    setDragFrom(null);
    setOverCol(null);
  };

  const handleTapItem = (id: string, from: string) => {
    if (tapItem?.id === id) {
      setTapItem(null);
    } else {
      setTapItem({ id, from });
    }
  };

  const handleTapColumn = (toColumnId: string) => {
    if (!tapItem) return;
    if (tapItem.from !== toColumnId) {
      const fromCol = columns.find((c) => c.id === tapItem.from);
      const item = fromCol?.items.find((it) => itemId(it) === tapItem.id);
      if (item) onMove(item, tapItem.from, toColumnId);
    }
    setTapItem(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => {
            e.preventDefault();
            setOverCol(col.id);
          }}
          onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
          onDrop={() => handleDrop(col.id)}
          onClick={() => tapItem && handleTapColumn(col.id)}
          className={cn(
            "flex w-[260px] shrink-0 flex-col rounded-2xl border bg-card/40 backdrop-blur-sm transition-colors",
            overCol === col.id ? "border-primary/40 bg-primary/[0.04]" : "border-white/[0.06]",
          )}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", col.accent)} />
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                {col.title}
              </h4>
            </div>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {col.items.length}
            </span>
          </div>

          <div className="flex-1 space-y-2 px-2 pb-2">
            <AnimatePresence>
              {col.items.map((item) => {
                const id = itemId(item);
                const isSelected = tapItem?.id === id;
                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    draggable
                    onDragStart={() => {
                      setDragId(id);
                      setDragFrom(col.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragFrom(null);
                      setOverCol(null);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTapItem(id, col.id);
                    }}
                    className={cn(
                      "cursor-grab rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 active:cursor-grabbing",
                      isSelected && "ring-2 ring-primary",
                      dragId === id && "opacity-40",
                    )}
                  >
                    {renderCard(item)}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {col.items.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/[0.06] py-6 text-center text-[10px] text-muted-foreground">
                Drop here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
