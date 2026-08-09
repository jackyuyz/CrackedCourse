import { AlertTriangle, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function PolicyNotes({
  policies,
  description = "Saved with this syllabus for reference.",
}: {
  policies: string[];
  description?: string;
}) {
  if (policies.length === 0) return null;

  return (
    <details className="border-gold/40 bg-gold/10 group overflow-hidden rounded-xl border">
      <summary className="focus-visible:ring-gold/40 flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="bg-gold/20 text-navy grid size-8 shrink-0 place-items-center rounded-lg">
            <AlertTriangle className="size-4 text-[#8a6200]" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-navy text-xs font-extrabold">
                Unsupported policies
              </span>
              <Badge
                variant="outline"
                className="border-gold/45 bg-white/65 font-mono text-[9px]"
              >
                {policies.length}
              </Badge>
            </span>
            <span className="text-muted-foreground mt-0.5 block truncate text-[10px]">
              {description}
            </span>
          </span>
        </span>
        <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-[10px] font-bold">
          <span className="hidden sm:inline">View policies</span>
          <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-gold/30 border-t bg-white/35">
        <ol className="max-h-[420px] divide-y divide-[#eadba9] overflow-y-auto">
          {policies.map((policy, index) => (
            <li key={`${index}-${policy}`} className="flex gap-3 px-4 py-3.5">
              <span className="border-gold/45 text-navy/70 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border bg-white/70 font-mono text-[9px] font-bold">
                {index + 1}
              </span>
              <p className="text-muted-foreground text-xs leading-5">
                {policy}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
