import { Archive, CircleCheck, Clock3 } from "lucide-react";

import { CourseTabs } from "@/components/course-tabs";
import { Badge } from "@/components/ui/badge";
import type { AppCourse } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type CourseHeaderCourse = Pick<
  AppCourse,
  "id" | "code" | "title" | "section" | "termName" | "color" | "status"
>;

const colorBars: Record<AppCourse["color"], string> = {
  ocean: "bg-ocean",
  orange: "bg-orange",
  gold: "bg-gold",
  navy: "bg-navy",
};

const statuses = {
  active: {
    label: "Active",
    icon: CircleCheck,
    className: "bg-ocean/10 text-ocean",
  },
  draft: {
    label: "Draft",
    icon: Clock3,
    className: "bg-gold/15 text-[#805b00]",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    className: "bg-navy/8 text-navy/70",
  },
} as const;

export function CourseHeader({
  course,
  active,
  actions,
}: {
  course: CourseHeaderCourse;
  active: "overview" | "calendar" | "grades";
  actions?: React.ReactNode;
}) {
  const status = statuses[course.status];

  return (
    <header>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={cn(
              "mt-1 h-14 w-2 shrink-0 rounded-full",
              colorBars[course.color],
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-white font-mono text-[10px]"
              >
                {course.code}
              </Badge>
              <Badge
                className={cn(
                  "border-0 text-[10px] shadow-none",
                  status.className,
                )}
              >
                <status.icon className="mr-1 size-3" /> {status.label}
              </Badge>
            </div>
            <h1 className="text-navy mt-3 text-2xl font-extrabold tracking-[-0.045em] text-balance sm:text-3xl">
              {course.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {[course.section, course.termName].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
      <div className="mt-7">
        <CourseTabs courseId={course.id} active={active} />
      </div>
    </header>
  );
}
