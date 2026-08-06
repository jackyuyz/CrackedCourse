import type { Metadata } from "next";

import { CalendarWorkspace } from "@/components/calendar-workspace";
import { PageHeader } from "@/components/page-header";
import { getViewer } from "@/lib/auth/viewer";
import { getCalendarData } from "@/lib/data/calendar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const data = await getCalendarData(viewer);

  return (
    <main className="mx-auto max-w-[1380px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Fall 2026"
        title="Semester calendar"
        description="Only confirmed events from your active courses appear here."
      />
      <CalendarWorkspace {...data} demo={viewer.isDemo} />
    </main>
  );
}
