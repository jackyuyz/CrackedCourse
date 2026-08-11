"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveRestore,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CourseEditorData,
  EditableAssessment,
  EditableCategory,
  EditableEvent,
  EditableOfficeHour,
  EditablePerson,
  EditablePolicy,
} from "@/lib/course-editor";
import { originLabel } from "@/lib/course-editor";
import { cn } from "@/lib/utils";

type EditorSection =
  | "people"
  | "calendar"
  | "grading"
  | "policies"
  | "sources";

const sections: Array<{ id: EditorSection; label: string }> = [
  { id: "people", label: "People" },
  { id: "calendar", label: "Calendar" },
  { id: "grading", label: "Grading" },
  { id: "policies", label: "Policies" },
  { id: "sources", label: "Sources & history" },
];

function emptyPerson(): EditablePerson {
  return {
    name: "",
    role: "instructor",
    email: null,
    officeLocation: null,
    externalProfileUrl: null,
    origin: "manual",
    isHidden: false,
  };
}

function emptyOfficeHour(timeZone: string): EditableOfficeHour {
  return {
    personId: null,
    recurrenceText: null,
    dayOfWeek: null,
    startTime: null,
    endTime: null,
    startDate: null,
    endDate: null,
    timeZone,
    location: null,
    meetingUrl: null,
    origin: "manual",
    isHidden: false,
  };
}

function emptyEvent(): EditableEvent {
  return {
    title: "",
    type: "assignment",
    startDate: "",
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    location: null,
    status: "confirmed",
    origin: "manual",
    isHidden: false,
  };
}

function emptyCategory(): EditableCategory {
  return {
    name: "",
    weightPercent: 0,
    aggregationMode: "points",
    isComplete: false,
    origin: "manual",
    isHidden: false,
  };
}

function emptyPolicy(): EditablePolicy {
  return {
    kind: "other",
    description: "",
    calculatorSupport: "unsupported",
    origin: "manual",
    isHidden: false,
  };
}

function emptyAssessment(categoryId: string): EditableAssessment {
  return {
    name: "",
    categoryId,
    dueEventId: null,
    earnedPoints: null,
    maxPoints: null,
    expectedPercent: null,
    status: "planned",
    origin: "manual",
    isHidden: false,
  };
}

function nullable(value: string) {
  return value.trim() ? value.trim() : null;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function replaceAt<T>(items: T[], index: number, next: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? next : item));
}

function OriginBadge({ origin, hidden }: { origin: keyof typeof originLabel; hidden: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline" className="bg-white text-[9px] font-semibold">
        {originLabel[origin]}
      </Badge>
      {hidden ? (
        <Badge variant="outline" className="bg-muted text-[9px] font-semibold">
          Hidden
        </Badge>
      ) : null}
    </div>
  );
}

function ItemActions({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: () => void;
}) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
      <ArchiveRestore className="size-3.5" />
      {hidden ? "Restore" : "Hide"}
    </Button>
  );
}

export function CourseDataEditor({ initialData }: { initialData: CourseEditorData }) {
  const router = useRouter();
  const [section, setSection] = useState<EditorSection>("people");
  const [people, setPeople] = useState(initialData.people);
  const [officeHours, setOfficeHours] = useState(initialData.officeHours);
  const [events, setEvents] = useState(initialData.events);
  const [categories, setCategories] = useState(initialData.categories);
  const [policies, setPolicies] = useState(initialData.policies);
  const [assessments, setAssessments] = useState(initialData.assessments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleCategories = categories.filter(
    (category): category is EditableCategory & { id: string } =>
      !category.isHidden && Boolean(category.id),
  );
  const visibleEvents = events.filter(
    (event): event is EditableEvent & { id: string } =>
      !event.isHidden && Boolean(event.id),
  );

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/courses/${initialData.courseId}/details`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            people,
            officeHours,
            events,
            categories,
            policies,
            assessments,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(
          body?.error?.message ?? "We couldn’t save these course records.",
        );
      }
      setMessage(
        "Course records saved. If this course is public, choose Update public snapshot when you are ready to share these changes.",
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t save these course records.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="self-start xl:sticky xl:top-6">
        <Card className="gap-0 py-0 shadow-none">
          <CardContent className="p-3">
            <p className="text-muted-foreground px-2 pt-1 pb-2 text-[10px] font-bold tracking-[0.1em] uppercase">
              Course editor
            </p>
            <nav className="space-y-1" aria-label="Course data sections">
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                    section === item.id
                      ? "bg-ocean/10 text-navy"
                      : "text-muted-foreground hover:bg-muted hover:text-navy",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0 space-y-5">
        <header>
          <p className="text-ocean text-[10px] font-bold tracking-[0.13em] uppercase">
            Editable workspace data
          </p>
          <h2 className="text-navy mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            Keep the course accurate as it changes
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            Edit the structured workspace without changing the original PDF.
            Source labels show what came from the syllabus, your own additions,
            or a community import.
          </p>
        </header>

        {section === "people" ? (
          <div className="space-y-5">
            <EditorSectionHeader
              icon={<Users className="size-4" />}
              title="People"
              description="Add or correct instructors, TAs, and staff. External profile links remain reference-only."
              action={() => setPeople((items) => [...items, emptyPerson()])}
              actionLabel="Add person"
            />
            <div className="space-y-3">
              {people.length ? (
                people.map((person, index) => (
                  <Card
                    key={person.id ?? `new-person-${index}`}
                    className={cn("gap-0 py-0", person.isHidden && "opacity-65")}
                  >
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <OriginBadge origin={person.origin} hidden={person.isHidden} />
                        <ItemActions
                          hidden={person.isHidden}
                          onToggle={() =>
                            setPeople((items) =>
                              replaceAt(items, index, {
                                ...person,
                                isHidden: !person.isHidden,
                              }),
                            )
                          }
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                        <Field label="Name">
                          <Input
                            value={person.name}
                            onChange={(event) =>
                              setPeople((items) =>
                                replaceAt(items, index, {
                                  ...person,
                                  name: event.target.value,
                                }),
                              )
                            }
                            placeholder="Dr. Jordan Lee"
                          />
                        </Field>
                        <Field label="Role">
                          <Select
                            value={person.role}
                            onValueChange={(role) =>
                              setPeople((items) =>
                                replaceAt(items, index, {
                                  ...person,
                                  role: role as EditablePerson["role"],
                                }),
                              )
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instructor">Instructor</SelectItem>
                              <SelectItem value="teaching_assistant">Teaching assistant</SelectItem>
                              <SelectItem value="other">Course staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Email">
                          <Input
                            type="email"
                            value={person.email ?? ""}
                            onChange={(event) =>
                              setPeople((items) =>
                                replaceAt(items, index, {
                                  ...person,
                                  email: nullable(event.target.value),
                                }),
                              )
                            }
                            placeholder="name@school.edu"
                          />
                        </Field>
                        <Field label="Office location">
                          <Input
                            value={person.officeLocation ?? ""}
                            onChange={(event) =>
                              setPeople((items) =>
                                replaceAt(items, index, {
                                  ...person,
                                  officeLocation: nullable(event.target.value),
                                }),
                              )
                            }
                            placeholder="Building 204"
                          />
                        </Field>
                      </div>
                      {person.role === "instructor" ? (
                        <Field label="Rate My Professors link (optional external reference)">
                          <Input
                            type="url"
                            value={person.externalProfileUrl ?? ""}
                            onChange={(event) =>
                              setPeople((items) =>
                                replaceAt(items, index, {
                                  ...person,
                                  externalProfileUrl: nullable(event.target.value),
                                }),
                              )
                            }
                            placeholder="https://www.ratemyprofessors.com/professor/..."
                          />
                        </Field>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState message="No people have been added yet." />
              )}
            </div>

            <EditorSectionHeader
              icon={<CalendarDays className="size-4" />}
              title="Office hours"
              description="Use a plain recurrence note, or add enough details for a future calendar rule."
              action={() =>
                setOfficeHours((items) => [
                  ...items,
                  emptyOfficeHour(initialData.courseTimeZone),
                ])
              }
              actionLabel="Add office hours"
            />
            <div className="space-y-3">
              {officeHours.length ? (
                officeHours.map((officeHour, index) => (
                  <Card
                    key={officeHour.id ?? `new-office-hour-${index}`}
                    className={cn("gap-0 py-0", officeHour.isHidden && "opacity-65")}
                  >
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <OriginBadge origin={officeHour.origin} hidden={officeHour.isHidden} />
                        <ItemActions
                          hidden={officeHour.isHidden}
                          onToggle={() =>
                            setOfficeHours((items) =>
                              replaceAt(items, index, {
                                ...officeHour,
                                isHidden: !officeHour.isHidden,
                              }),
                            )
                          }
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Person">
                          <Select
                            value={officeHour.personId ?? "unassigned"}
                            onValueChange={(value) =>
                              setOfficeHours((items) =>
                                replaceAt(items, index, {
                                  ...officeHour,
                                  personId: value === "unassigned" ? null : value,
                                }),
                              )
                            }
                          >
                            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {people.filter((person) => person.id && !person.isHidden).map((person) => (
                                <SelectItem key={person.id} value={person.id!}>{person.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Recurrence note">
                          <Input
                            value={officeHour.recurrenceText ?? ""}
                            onChange={(event) => setOfficeHours((items) => replaceAt(items, index, { ...officeHour, recurrenceText: nullable(event.target.value) }))}
                            placeholder="Tuesdays, 2:00–3:30 PM"
                          />
                        </Field>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Location">
                          <Input
                            value={officeHour.location ?? ""}
                            onChange={(event) => setOfficeHours((items) => replaceAt(items, index, { ...officeHour, location: nullable(event.target.value) }))}
                            placeholder="Building 204 or Zoom"
                          />
                        </Field>
                        <Field label="Meeting link (private)">
                          <Input
                            type="url"
                            value={officeHour.meetingUrl ?? ""}
                            onChange={(event) => setOfficeHours((items) => replaceAt(items, index, { ...officeHour, meetingUrl: nullable(event.target.value) }))}
                            placeholder="https://..."
                          />
                        </Field>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Day (0=Sun)"><Input type="number" min="0" max="6" value={officeHour.dayOfWeek ?? ""} onChange={(event) => setOfficeHours((items) => replaceAt(items, index, { ...officeHour, dayOfWeek: nullableNumber(event.target.value) }))} /></Field>
                        <Field label="Start time"><Input type="time" value={officeHour.startTime ?? ""} onChange={(event) => setOfficeHours((items) => replaceAt(items, index, { ...officeHour, startTime: nullable(event.target.value) }))} /></Field>
                        <Field label="Start date"><Input value={officeHour.startDate ?? ""} onChange={(event) => setOfficeHours((items) => replaceAt(items, index, { ...officeHour, startDate: nullable(event.target.value) }))} placeholder="YYYY-MM-DD" /></Field>
                        <Field label="End date"><Input value={officeHour.endDate ?? ""} onChange={(event) => setOfficeHours((items) => replaceAt(items, index, { ...officeHour, endDate: nullable(event.target.value) }))} placeholder="YYYY-MM-DD" /></Field>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : <EmptyState message="No office hours have been added yet." />}
            </div>
          </div>
        ) : null}

        {section === "calendar" ? (
          <div className="space-y-4">
            <EditorSectionHeader
              icon={<CalendarDays className="size-4" />}
              title="Calendar events"
              description="Add, correct, cancel, or hide dates without changing the original syllabus evidence. Dates use YYYY-MM-DD to avoid browser locale changes."
              action={() => setEvents((items) => [...items, emptyEvent()])}
              actionLabel="Add event"
            />
            {events.length ? events.map((event, index) => (
              <Card key={event.id ?? `new-event-${index}`} className={cn("gap-0 py-0", event.isHidden && "opacity-65")}>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><OriginBadge origin={event.origin} hidden={event.isHidden} /><ItemActions hidden={event.isHidden} onToggle={() => setEvents((items) => replaceAt(items, index, { ...event, isHidden: !event.isHidden }))} /></div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]"><Field label="Title"><Input value={event.title} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, title: input.target.value }))} placeholder="Midterm 1" /></Field><Field label="Type"><EventTypeSelect value={event.type} onChange={(type) => setEvents((items) => replaceAt(items, index, { ...event, type }))} /></Field></div>
                  <div className="grid gap-3 sm:grid-cols-2"><Field label="Start date"><Input value={event.startDate} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, startDate: input.target.value }))} placeholder="YYYY-MM-DD" /></Field><Field label="End date (optional)"><Input value={event.endDate ?? ""} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, endDate: nullable(input.target.value) }))} placeholder="YYYY-MM-DD" /></Field></div>
                  <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-navy"><label className="flex items-center gap-2"><input type="checkbox" className="accent-ocean size-4" checked={event.isAllDay} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, isAllDay: input.target.checked, startTime: input.target.checked ? null : event.startTime, endTime: input.target.checked ? null : event.endTime }))} />All-day event</label><label className="flex items-center gap-2"><input type="checkbox" className="accent-ocean size-4" checked={event.status === "cancelled"} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, status: input.target.checked ? "cancelled" : "confirmed" }))} />Cancelled</label></div>
                  {!event.isAllDay ? <div className="grid gap-3 sm:grid-cols-2"><Field label="Start time"><Input type="time" value={event.startTime ?? ""} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, startTime: nullable(input.target.value) }))} /></Field><Field label="End time (optional)"><Input type="time" value={event.endTime ?? ""} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, endTime: nullable(input.target.value) }))} /></Field></div> : null}
                  <Field label="Location"><Input value={event.location ?? ""} onChange={(input) => setEvents((items) => replaceAt(items, index, { ...event, location: nullable(input.target.value) }))} placeholder="Room, campus, or online" /></Field>
                </CardContent>
              </Card>
            )) : <EmptyState message="No events have been added yet." />}
          </div>
        ) : null}

        {section === "grading" ? (
          <div className="space-y-5">
            <EditorSectionHeader icon={<GraduationCap className="size-4" />} title="Grading structure" description="These categories and weights are what the course calculator and community view use. Your percentage scores remain private in the Grades tab." action={() => setCategories((items) => [...items, emptyCategory()])} actionLabel="Add category" />
            <div className="space-y-3">
              {categories.length ? categories.map((category, index) => (
                <Card key={category.id ?? `new-category-${index}`} className={cn("gap-0 py-0", category.isHidden && "opacity-65")}><CardContent className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><OriginBadge origin={category.origin} hidden={category.isHidden} /><ItemActions hidden={category.isHidden} onToggle={() => setCategories((items) => replaceAt(items, index, { ...category, isHidden: !category.isHidden }))} /></div><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_170px]"><Field label="Category name"><Input value={category.name} onChange={(input) => setCategories((items) => replaceAt(items, index, { ...category, name: input.target.value }))} placeholder="Homework" /></Field><Field label="Weight (%)"><Input type="number" min="0" max="100" step="0.1" value={category.weightPercent} onChange={(input) => setCategories((items) => replaceAt(items, index, { ...category, weightPercent: nullableNumber(input.target.value) ?? 0 }))} /></Field><Field label="Aggregation"><Select value={category.aggregationMode} onValueChange={(aggregationMode) => setCategories((items) => replaceAt(items, index, { ...category, aggregationMode: aggregationMode as EditableCategory["aggregationMode"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="points">Points</SelectItem><SelectItem value="equal">Equal</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></Field></div></CardContent></Card>
              )) : <EmptyState message="No grading categories have been added yet." />}
            </div>

            <EditorSectionHeader icon={<ShieldCheck className="size-4" />} title="Private assessments" description="Assessment points are visible only in your workspace and are never included in a community publication." action={() => visibleCategories[0]?.id && setAssessments((items) => [...items, emptyAssessment(visibleCategories[0].id)])} actionLabel="Add assessment" actionDisabled={!visibleCategories.length} />
            {!visibleCategories.length ? <p className="text-muted-foreground text-xs">Save at least one visible grading category before adding an assessment.</p> : null}
            <div className="space-y-3">
              {assessments.length ? assessments.map((assessment, index) => (
                <Card key={assessment.id ?? `new-assessment-${index}`} className={cn("gap-0 py-0", assessment.isHidden && "opacity-65")}><CardContent className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><OriginBadge origin={assessment.origin} hidden={assessment.isHidden} /><ItemActions hidden={assessment.isHidden} onToggle={() => setAssessments((items) => replaceAt(items, index, { ...assessment, isHidden: !assessment.isHidden }))} /></div><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]"><Field label="Assessment name"><Input value={assessment.name} onChange={(input) => setAssessments((items) => replaceAt(items, index, { ...assessment, name: input.target.value }))} placeholder="Homework 1" /></Field><Field label="Category"><Select value={assessment.categoryId} onValueChange={(categoryId) => setAssessments((items) => replaceAt(items, index, { ...assessment, categoryId }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{visibleCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></Field></div><div className="grid gap-3 sm:grid-cols-3"><Field label="Status"><Select value={assessment.status} onValueChange={(status) => setAssessments((items) => replaceAt(items, index, { ...assessment, status: status as EditableAssessment["status"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="graded">Graded</SelectItem><SelectItem value="excused">Excused</SelectItem></SelectContent></Select></Field><Field label="Earned points"><Input type="number" min="0" value={assessment.earnedPoints ?? ""} onChange={(input) => setAssessments((items) => replaceAt(items, index, { ...assessment, earnedPoints: nullableNumber(input.target.value) }))} /></Field><Field label="Max points"><Input type="number" min="0" value={assessment.maxPoints ?? ""} onChange={(input) => setAssessments((items) => replaceAt(items, index, { ...assessment, maxPoints: nullableNumber(input.target.value) }))} /></Field></div><Field label="Linked calendar event (optional)"><Select value={assessment.dueEventId ?? "none"} onValueChange={(dueEventId) => setAssessments((items) => replaceAt(items, index, { ...assessment, dueEventId: dueEventId === "none" ? null : dueEventId }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No linked event</SelectItem>{visibleEvents.map((event) => <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>)}</SelectContent></Select></Field></CardContent></Card>
              )) : <EmptyState message="No private assessments have been added yet." />}
            </div>
          </div>
        ) : null}

        {section === "policies" ? (
          <div className="space-y-4"><EditorSectionHeader icon={<FileText className="size-4" />} title="Course policies" description="Keep plain-language policies visible even when they are not supported by the calculator." action={() => setPolicies((items) => [...items, emptyPolicy()])} actionLabel="Add policy" />{policies.length ? policies.map((policy, index) => <Card key={policy.id ?? `new-policy-${index}`} className={cn("gap-0 py-0", policy.isHidden && "opacity-65")}><CardContent className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><OriginBadge origin={policy.origin} hidden={policy.isHidden} /><ItemActions hidden={policy.isHidden} onToggle={() => setPolicies((items) => replaceAt(items, index, { ...policy, isHidden: !policy.isHidden }))} /></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Policy kind"><Select value={policy.kind} onValueChange={(kind) => setPolicies((items) => replaceAt(items, index, { ...policy, kind: kind as EditablePolicy["kind"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="drop_lowest">Drop lowest</SelectItem><SelectItem value="replacement">Replacement</SelectItem><SelectItem value="curve">Curve</SelectItem><SelectItem value="extra_credit">Extra credit</SelectItem><SelectItem value="attendance">Attendance</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></Field><Field label="Calculator handling"><Select value={policy.calculatorSupport} onValueChange={(calculatorSupport) => setPolicies((items) => replaceAt(items, index, { ...policy, calculatorSupport: calculatorSupport as EditablePolicy["calculatorSupport"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unsupported">Reference only</SelectItem><SelectItem value="supported">Supported</SelectItem></SelectContent></Select></Field></div><Field label="Description"><Textarea value={policy.description} onChange={(input) => setPolicies((items) => replaceAt(items, index, { ...policy, description: input.target.value }))} placeholder="Describe the policy in plain language." /></Field></CardContent></Card>) : <EmptyState message="No course policies have been added yet." />}</div>
        ) : null}

        {section === "sources" ? (
          <div className="space-y-4"><EditorSectionHeader icon={<FileText className="size-4" />} title="Sources & history" description="The original PDF and extraction evidence stay intact when you edit the workspace." />{initialData.sources.length ? initialData.sources.map((source) => <Card key={source.id} className="gap-0 py-0"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-navy text-sm font-bold">{source.originalName}</p><p className="text-muted-foreground mt-1 text-xs">{source.pageCount ?? "—"} pages · {source.processingStatus}</p></div><Badge variant="outline" className="bg-white">Preserved source</Badge></CardContent></Card>) : <EmptyState message="This course does not have an uploaded syllabus source." />}<Card className="gap-0 py-0"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-navy text-sm font-bold">Review extraction evidence</p><p className="text-muted-foreground mt-1 text-xs">Confirm or correct PDF-derived values while keeping original page quotes attached.</p></div><Button asChild variant="outline"><Link href={`/courses/${initialData.courseId}/review`}>Open review</Link></Button></CardContent></Card></div>
        ) : null}

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white/95 p-3 shadow-lg backdrop-blur"><div className="min-w-0">{error ? <p className="text-destructive text-xs font-semibold" role="alert">{error}</p> : message ? <p className="text-ocean text-xs font-semibold">{message}</p> : <p className="text-muted-foreground text-xs">Changes affect your private workspace first. Publishing is separate.</p>}</div><Button type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Save course data</Button></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function EditorSectionHeader({ icon, title, description, action, actionLabel, actionDisabled = false }: { icon: React.ReactNode; title: string; description: string; action?: () => void; actionLabel?: string; actionDisabled?: boolean }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-navy flex items-center gap-2 text-base font-extrabold">{icon}{title}</h3><p className="text-muted-foreground mt-1 max-w-2xl text-xs leading-5">{description}</p></div>{action && actionLabel ? <Button type="button" variant="outline" size="sm" onClick={action} disabled={actionDisabled}><Plus className="size-3.5" />{actionLabel}</Button> : null}</div>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="border-border text-muted-foreground rounded-xl border border-dashed bg-white/60 px-5 py-8 text-center text-sm">{message}</div>;
}

function EventTypeSelect({ value, onChange }: { value: EditableEvent["type"]; onChange: (value: EditableEvent["type"]) => void }) {
  return <Select value={value} onValueChange={(next) => onChange(next as EditableEvent["type"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="exam">Exam</SelectItem><SelectItem value="quiz">Quiz</SelectItem><SelectItem value="assignment">Assignment</SelectItem><SelectItem value="project">Project</SelectItem><SelectItem value="office_hour">Office hour</SelectItem><SelectItem value="class_session">Class session</SelectItem><SelectItem value="deadline">Deadline</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>;
}
