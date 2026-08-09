"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, GraduationCap, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { suffix: "", label: "Overview", icon: LayoutDashboard },
  { suffix: "/calendar", label: "Calendar", icon: CalendarDays },
  { suffix: "/grades", label: "Grades", icon: GraduationCap },
];

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const active = pathname.endsWith("/calendar")
    ? "calendar"
    : pathname.endsWith("/grades")
      ? "grades"
      : "overview";

  return (
    <nav
      className="border-border flex gap-1 overflow-x-auto border-b"
      aria-label="Course navigation"
    >
      {tabs.map((tab, index) => {
        const key =
          index === 0 ? "overview" : index === 1 ? "calendar" : "grades";
        return (
          <Link
            key={tab.label}
            href={`/courses/${courseId}${tab.suffix}`}
            className={cn(
              "relative inline-flex h-12 shrink-0 items-center gap-2 px-3 text-xs font-bold transition-colors",
              active === key
                ? "text-navy"
                : "text-muted-foreground hover:text-navy",
            )}
          >
            <tab.icon className="size-3.5" /> {tab.label}
            {active === key ? (
              <span className="bg-ocean absolute inset-x-2 bottom-0 h-0.5 rounded-full" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
