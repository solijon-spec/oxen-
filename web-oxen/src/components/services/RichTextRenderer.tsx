import { memo } from "react";
import { Link } from "lucide-react";

import type { RichBlock } from "@/lib/services";

/**
 * RichTextRenderer — renders jsonb rich content blocks from the database.
 * Supports headings, paragraphs, lists, quotes, and links.
 */
function RichTextRendererBase({ blocks }: { blocks: RichBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h3
                key={i}
                className="font-display text-xl font-bold text-foreground"
              >
                {block.text}
              </h3>
            );
          case "paragraph":
            return (
              <p
                key={i}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {block.text}
              </p>
            );
          case "list":
            return (
              <ul key={i} className="space-y-2">
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-2 border-primary/40 bg-primary/5 py-3 pl-4 pr-3 rounded-r-lg"
              >
                <p className="text-sm italic text-foreground/80">{block.text}</p>
              </blockquote>
            );
          case "link":
            return (
              <a
                key={i}
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-primary/80"
              >
                <Link className="h-3.5 w-3.5" />
                {block.text}
              </a>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export const RichTextRenderer = memo(RichTextRendererBase);
