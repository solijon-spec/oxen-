import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, FileArchive, FileType, File } from "lucide-react";

import type { ServiceDocument } from "@/lib/services";

/**
 * Get icon for file type.
 */
function getFileIcon(type: string) {
  switch (type.toLowerCase()) {
    case "pdf":
      return FileText;
    case "doc":
    case "docx":
      return FileText;
    case "ppt":
    case "pptx":
      return FileText;
    case "zip":
      return FileArchive;
    default:
      return File;
  }
}

/**
 * Get color for file type.
 */
function getFileColor(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf":
      return "text-red-400 bg-red-500/10";
    case "doc":
    case "docx":
      return "text-blue-400 bg-blue-500/10";
    case "ppt":
    case "pptx":
      return "text-orange-400 bg-orange-500/10";
    case "zip":
      return "text-purple-400 bg-purple-500/10";
    default:
      return "text-primary bg-primary/10";
  }
}

/**
 * DocumentList — downloadable documents from the database.
 */
function DocumentListBase({ documents }: { documents: ServiceDocument[] }) {
  if (!documents || documents.length === 0) return null;

  return (
    <div className="space-y-3">
      {documents.map((doc, i) => {
        const Icon = getFileIcon(doc.file_type);
        const colorClass = getFileColor(doc.file_type);

        return (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="glass flex items-center gap-4 rounded-2xl p-4"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {doc.filename}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {doc.file_type}
                {doc.file_size > 0 && ` · ${(doc.file_size / 1024).toFixed(0)} KB`}
              </p>
            </div>
            <a
              href={doc.file_url}
              download={doc.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition hover:bg-primary/25 active:scale-95"
              aria-label={`Download ${doc.filename}`}
            >
              <Download className="h-5 w-5" />
            </a>
          </motion.div>
        );
      })}
    </div>
  );
}

export const DocumentList = memo(DocumentListBase);
