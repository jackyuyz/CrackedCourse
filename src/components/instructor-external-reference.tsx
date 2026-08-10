import { CircleHelp, ExternalLink, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildRateMyProfessorsSearchUrl,
  getSafeRateMyProfessorsProfileUrl,
} from "@/lib/rate-my-professors";

export function InstructorExternalReference({
  instructorName,
  institutionName,
  externalProfileUrl,
}: {
  instructorName: string;
  institutionName: string | null;
  externalProfileUrl: string | null;
}) {
  const verifiedProfileUrl =
    getSafeRateMyProfessorsProfileUrl(externalProfileUrl);
  const destination =
    verifiedProfileUrl ?? buildRateMyProfessorsSearchUrl(instructorName);

  return (
    <aside className="border-border bg-muted/35 mt-4 rounded-xl border p-3.5">
      <div className="flex items-start gap-3">
        <span className="bg-sky/25 text-ocean grid size-8 shrink-0 place-items-center rounded-lg">
          <Star className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-navy text-xs font-extrabold">
              Rate My Professors
            </p>
            <Badge
              variant="outline"
              className="bg-background px-1.5 py-0 text-[8px] font-bold uppercase"
            >
              External
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-[10px] leading-4">
            {verifiedProfileUrl
              ? "A Rate My Professors profile link is available."
              : institutionName
                ? `No verified profile is linked yet. Search by name and confirm ${institutionName}.`
                : "No verified profile is linked, and this course has no confirmed school. Verify the match carefully."}
          </p>
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="mt-3 h-8 w-full">
        <a href={destination} target="_blank" rel="noopener noreferrer">
          {verifiedProfileUrl ? "View professor profile" : "Search professor"}
          <ExternalLink className="size-3.5" />
        </a>
      </Button>

      <p className="text-muted-foreground mt-2.5 flex items-start gap-1.5 text-[9px] leading-4">
        <CircleHelp className="mt-0.5 size-3 shrink-0" />
        External, student-submitted information for reference only.
        CrackedCourse does not verify ratings or reviews.
      </p>
    </aside>
  );
}
