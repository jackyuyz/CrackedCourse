"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  List,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AppCourse, AppEvent } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const colorClasses = {
  ocean: { dot: "bg-ocean", chip: "border-ocean/25 bg-ocean/9 text-[#07556b]" },
  orange: {
    dot: "bg-orange",
    chip: "border-orange/25 bg-orange/9 text-[#854600]",
  },
  gold: { dot: "bg-gold", chip: "border-gold/35 bg-gold/12 text-[#725200]" },
  navy: { dot: "bg-navy", chip: "border-navy/20 bg-navy/7 text-navy" },
} as const;

const eventTypeLabels: Record<AppEvent["type"], string> = {
  exam: "Exams",
  quiz: "Quizzes",
  assignment: "Assignments",
  project: "Projects",
  office_hour: "Office hours",
  class_session: "Class sessions",
  deadline: "Deadlines",
  other: "Other",
};

export function CalendarWorkspace({
  courses,
  events,
  courseId,
  demo,
}: {
  courses: AppCourse[];
  events: AppEvent[];
  courseId?: string;
  demo: boolean;
}) {
  const firstDate = events[0]?.date ? parseISO(events[0].date) : new Date();
  const [month, setMonth] = useState(startOfMonth(firstDate));
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selectedCourseIds, setSelectedCourseIds] = useState(
    () => new Set(courses.map((course) => course.id)),
  );
  const [selectedTypes, setSelectedTypes] = useState(
    () =>
      new Set<AppEvent["type"]>(
        Object.keys(eventTypeLabels) as AppEvent["type"][],
      ),
  );
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          selectedCourseIds.has(event.courseId) &&
          selectedTypes.has(event.type),
      ),
    [events, selectedCourseIds, selectedTypes],
  );
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });
  const monthEvents = visible.filter((event) =>
    isSameMonth(parseISO(event.date), month),
  );

  function toggleCourse(id: string) {
    setSelectedCourseIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleType(type: AppEvent["type"]) {
    setSelectedTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function exportCalendar() {
    if (!demo) {
      const params = new URLSearchParams();
      if (courseId) params.set("courseId", courseId);
      params.set("eventTypes", [...selectedTypes].join(","));
      const anchor = document.createElement("a");
      anchor.href = `/api/calendars/export.ics?${params}`;
      anchor.download = "cracked-course.ics";
      anchor.click();
      return;
    }
    const stamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CrackedCourse//Demo//EN",
      ...visible.flatMap((event) => [
        "BEGIN:VEVENT",
        `UID:${event.id}@crackedcourse`,
        `DTSTAMP:${stamp}`,
        `SUMMARY:${event.title.replaceAll(",", "\\,")}`,
        `DTSTART;VALUE=DATE:${event.date.replaceAll("-", "")}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ];
    const blob = new Blob([`${lines.join("\r\n")}\r\n`], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cracked-course-demo.ics";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-7 grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="gap-0 py-0 shadow-none">
          <div className="p-4">
            <div className="text-navy mb-3 flex items-center gap-2 text-xs font-extrabold">
              <SlidersHorizontal className="text-ocean size-3.5" /> Courses
            </div>
            <div className="space-y-1">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => toggleCourse(course.id)}
                  className="text-navy/72 hover:bg-muted flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[11px] font-semibold"
                >
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded border",
                      selectedCourseIds.has(course.id)
                        ? "border-ocean bg-ocean text-white"
                        : "border-input bg-white",
                    )}
                  >
                    {selectedCourseIds.has(course.id) ? (
                      <Check className="size-2.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      colorClasses[course.color].dot,
                    )}
                  />
                  <span className="truncate">{course.code}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card className="gap-0 py-0 shadow-none">
          <div className="p-4">
            <p className="text-navy mb-3 text-xs font-extrabold">Event types</p>
            <div className="space-y-1">
              {(
                Object.entries(eventTypeLabels) as Array<
                  [AppEvent["type"], string]
                >
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className="text-navy/72 hover:bg-muted flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[11px] font-semibold"
                >
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded border",
                      selectedTypes.has(type)
                        ? "border-navy bg-navy text-white"
                        : "border-input bg-white",
                    )}
                  >
                    {selectedTypes.has(type) ? (
                      <Check className="size-2.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonth(subMonths(month, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(startOfMonth(new Date()))}
            >
              Today
            </Button>
            <h2 className="text-navy ml-1 text-lg font-extrabold tracking-[-0.03em]">
              {format(month, "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="border-border flex rounded-lg border bg-white p-0.5">
              <Button
                variant={view === "month" ? "secondary" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setView("month")}
              >
                <CalendarDays className="size-3.5" /> Month
              </Button>
              <Button
                variant={view === "agenda" ? "secondary" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setView("agenda")}
              >
                <List className="size-3.5" /> Agenda
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={exportCalendar}
            >
              <Download className="size-3.5" /> Export
            </Button>
          </div>
        </div>

        {view === "month" ? (
          <Card className="hidden gap-0 overflow-hidden py-0 shadow-[0_6px_24px_rgba(2,48,71,0.045)] sm:block">
            <div className="border-border grid grid-cols-7 border-b bg-[#f8faf9]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-muted-foreground px-2 py-2.5 text-center text-[9px] font-bold tracking-[0.08em] uppercase"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayEvents = visible.filter((event) =>
                  isSameDay(parseISO(event.date), day),
                );
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-border min-h-[118px] p-1.5",
                      index % 7 !== 6 && "border-r",
                      index < days.length - 7 && "border-b",
                      !isSameMonth(day, month) && "bg-muted/35",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 grid size-6 place-items-center rounded-full font-mono text-[10px] font-bold",
                        isSameDay(day, new Date())
                          ? "bg-navy text-white"
                          : isSameMonth(day, month)
                            ? "text-navy"
                            : "text-muted-foreground/55",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className={cn(
                            "block w-full truncate rounded border px-1.5 py-1 text-left text-[9px] font-bold",
                            colorClasses[event.courseColor].chip,
                          )}
                        >
                          {event.time ? (
                            <span className="mr-1 font-mono opacity-70">
                              {event.time.replace(" ", "")}
                            </span>
                          ) : null}
                          {event.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => setView("agenda")}
                          className="text-muted-foreground px-1 text-[9px] font-semibold"
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <div className={cn("space-y-3", view === "month" && "sm:hidden")}>
          {monthEvents.length > 0 ? (
            monthEvents
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className="border-border flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left shadow-[0_3px_14px_rgba(2,48,71,0.035)]"
                >
                  <span className="w-12 shrink-0 text-center">
                    <span className="text-muted-foreground block text-[9px] font-bold tracking-[0.07em] uppercase">
                      {format(parseISO(event.date), "EEE")}
                    </span>
                    <span className="text-navy mt-0.5 block font-mono text-xl font-extrabold">
                      {format(parseISO(event.date), "d")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "h-9 w-1 shrink-0 rounded-full",
                      colorClasses[event.courseColor].dot,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-navy block truncate text-sm font-extrabold">
                      {event.title}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-[11px]">
                      {event.courseCode} · {event.time ?? "All day"}
                    </span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-4" />
                </button>
              ))
          ) : (
            <div className="border-border text-muted-foreground rounded-xl border border-dashed bg-white/60 p-10 text-center text-sm">
              No visible events this month.
            </div>
          )}
        </div>
      </section>

      <Sheet
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selectedEvent ? (
            <div className="px-1 py-2">
              <SheetHeader className="p-5 pb-3">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      colorClasses[selectedEvent.courseColor].dot,
                    )}
                  />
                  <Badge variant="outline" className="font-mono text-[9px]">
                    {selectedEvent.courseCode}
                  </Badge>
                </div>
                <SheetTitle className="text-navy text-xl font-extrabold tracking-[-0.03em]">
                  {selectedEvent.title}
                </SheetTitle>
                <SheetDescription>
                  {eventTypeLabels[selectedEvent.type]}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-5 py-4">
                <DetailRow
                  icon={<CalendarDays />}
                  label="Date"
                  value={selectedEvent.displayDate}
                />
                <DetailRow
                  icon={<Clock3 />}
                  label="Time"
                  value={selectedEvent.time ?? "All day"}
                />
                {selectedEvent.location ? (
                  <DetailRow
                    icon={<MapPin />}
                    label="Location"
                    value={selectedEvent.location}
                  />
                ) : null}
                <div className="border-sky/45 bg-sky/12 rounded-xl border p-4">
                  <div className="text-navy flex items-center gap-2 text-xs font-bold">
                    <FileText className="text-ocean size-3.5" /> Source evidence
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    Confirmed from the syllabus
                    {selectedEvent.sourcePage
                      ? ` on page ${selectedEvent.sourcePage}`
                      : ""}
                    .
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-ocean mt-0.5 [&_svg]:size-4">{icon}</span>
      <div>
        <p className="text-muted-foreground text-[10px] font-bold tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="text-navy mt-1 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
