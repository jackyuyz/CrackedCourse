import { BookOpen, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2.5"
      aria-label="CrackedCourse"
    >
      <span className="bg-navy relative grid size-9 place-items-center rounded-xl text-white shadow-[0_5px_14px_rgba(2,48,71,0.18)]">
        <BookOpen
          className="size-[18px]"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        <Sparkles
          className="bg-gold text-navy absolute -top-1 -right-1 size-3.5 rounded-full p-0.5"
          strokeWidth={2.4}
          aria-hidden="true"
        />
      </span>
      <span
        className={cn(
          "text-navy tracking-[-0.035em]",
          compact ? "text-base font-bold" : "text-lg font-extrabold",
        )}
      >
        CrackedCourse
      </span>
    </span>
  );
}
