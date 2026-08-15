import Link from "next/link";
import { BookOpenText, CalendarDays, GraduationCap, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

export type CommunityCourseTab = "overview" | "calendar" | "grades" | "learning";

const tabs: Array<{
  key: CommunityCourseTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "grades", label: "Grades", icon: GraduationCap },
];

export function CommunityCourseTabs({
  publicationId,
  activeTab,
  hasLearningUnits = false,
}: {
  publicationId: string;
  activeTab: CommunityCourseTab;
  hasLearningUnits?: boolean;
}) {
  const visibleTabs = hasLearningUnits
    ? [...tabs, { key: "learning" as const, label: "Learning units", icon: BookOpenText }]
    : tabs;
  return (
    <nav
      className="border-border flex gap-1 overflow-x-auto border-b"
      aria-label="Shared course navigation"
    >
      {visibleTabs.map((tab) => {
        const href =
          tab.key === "overview"
            ? `/community/${publicationId}`
            : `/community/${publicationId}?tab=${tab.key}`;

        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={cn(
              "relative inline-flex h-12 shrink-0 items-center gap-2 px-3 text-xs font-bold transition-colors",
              activeTab === tab.key
                ? "text-navy"
                : "text-muted-foreground hover:text-navy",
            )}
          >
            <tab.icon className="size-3.5" /> {tab.label}
            {activeTab === tab.key ? (
              <span className="bg-ocean absolute inset-x-2 bottom-0 h-0.5 rounded-full" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
