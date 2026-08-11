"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  PencilLine,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LoaderCircle,
  MoreHorizontal,
  Palette,
  Settings2,
  Trash2,
  Globe2,
  EyeOff,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InstitutionCombobox } from "@/components/institution-combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseIdentity } from "@/lib/data/course";
import type { InstitutionOption } from "@/lib/institutions";
import { cn } from "@/lib/utils";

type EditableStatus = "active" | "archived";

interface CourseSettingsForm {
  code: string;
  title: string;
  section: string;
  termName: string;
  termStart: string;
  termEnd: string;
  timeZone: string;
  colorKey: CourseIdentity["color"];
  status: EditableStatus;
  institution: InstitutionOption | null;
}

const colors: Array<{
  value: CourseIdentity["color"];
  label: string;
  className: string;
}> = [
  { value: "ocean", label: "Ocean", className: "bg-ocean" },
  { value: "orange", label: "Orange", className: "bg-orange" },
  { value: "gold", label: "Gold", className: "bg-gold" },
  { value: "navy", label: "Navy", className: "bg-navy" },
];

function formatIsoDateForDisplay(value: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
}

function parseUsDate(value: string): string | null | undefined {
  if (!value.trim()) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return undefined;
  }

  return `${match[3]}-${match[1]}-${match[2]}`;
}

const englishMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const englishWeekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${(month + 1)
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function monthFromValue(value: string) {
  const parsed = parseUsDate(value);
  if (parsed) {
    const [year, month] = parsed.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
  }
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
}

function EnglishDateField({
  id,
  label,
  value,
  onChange,
  disabled,
  minValue,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  minValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthFromValue(value));
  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();
  const leadingDays = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const selectedIso = parseUsDate(value);
  const minimumIso = minValue ? parseUsDate(minValue) : null;

  function changeMonth(offset: number) {
    setVisibleMonth(new Date(Date.UTC(year, month + offset, 1)));
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) setVisibleMonth(monthFromValue(value));
        }}
      >
        <PopoverPrimitive.Anchor asChild>
          <div className="relative">
            <Input
              id={id}
              type="text"
              inputMode="text"
              autoComplete="off"
              value={value}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (/^[\d/]*$/.test(nextValue) && nextValue.length <= 10) {
                  onChange(nextValue);
                }
              }}
              maxLength={10}
              placeholder="MM/DD/YYYY"
              className="pr-10"
              disabled={disabled}
            />
            <PopoverPrimitive.Trigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-navy absolute top-1/2 right-1 -translate-y-1/2"
                disabled={disabled}
                aria-label={`Choose ${label}`}
              >
                <CalendarDays className="size-4" />
              </Button>
            </PopoverPrimitive.Trigger>
          </div>
        </PopoverPrimitive.Anchor>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={6}
            className="bg-popover text-popover-foreground ring-foreground/10 z-60 w-72 rounded-xl p-3 shadow-lg ring-1 outline-none"
          >
            <div className="mb-3 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft />
              </Button>
              <p className="text-sm font-semibold">
                {englishMonths[month]} {year}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {englishWeekdays.map((weekday) => (
                <span
                  key={weekday}
                  className="text-muted-foreground py-1 text-[10px] font-semibold"
                  aria-hidden="true"
                >
                  {weekday}
                </span>
              ))}
              {Array.from({ length: leadingDays }, (_, index) => (
                <span key={`empty-${index}`} aria-hidden="true" />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const dateIso = isoDate(year, month, day);
                const selected = selectedIso === dateIso;
                const beforeMinimum = Boolean(
                  minimumIso && dateIso.localeCompare(minimumIso) < 0,
                );
                return (
                  <button
                    key={dateIso}
                    type="button"
                    disabled={beforeMinimum}
                    aria-label={`${englishMonths[month]} ${day}, ${year}`}
                    aria-pressed={selected}
                    className={cn(
                      "hover:bg-sky/40 focus-visible:ring-ocean grid size-8 place-items-center rounded-lg text-xs outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-25",
                      selected && "bg-ocean hover:bg-ocean/90 text-white",
                    )}
                    onClick={() => {
                      onChange(
                        `${(month + 1).toString().padStart(2, "0")}/${day
                          .toString()
                          .padStart(2, "0")}/${year}`,
                      );
                      setOpen(false);
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}

function formFromCourse(course: CourseIdentity): CourseSettingsForm {
  return {
    code: course.code,
    title: course.title,
    section: course.section ?? "",
    termName: course.termName,
    termStart: formatIsoDateForDisplay(course.termStart),
    termEnd: formatIsoDateForDisplay(course.termEnd),
    timeZone: course.timeZone,
    colorKey: course.color,
    status: course.status === "archived" ? "archived" : "active",
    institution: course.institution,
  };
}

export function CourseActionsMenu({
  course,
  readOnly = false,
}: {
  course: CourseIdentity;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [form, setForm] = useState(() => formFromCourse(course));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSettings() {
    setForm(formFromCourse(course));
    setError(null);
    setSettingsOpen(true);
  }

  function updateField<Key extends keyof CourseSettingsForm>(
    key: Key,
    value: CourseSettingsForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || readOnly) return;

    const termStart = parseUsDate(form.termStart);
    const termEnd = parseUsDate(form.termEnd);
    if (termStart === undefined || termEnd === undefined) {
      setError("Enter dates in MM/DD/YYYY format.");
      return;
    }

    if (termStart && termEnd && termEnd.localeCompare(termStart) < 0) {
      setError("The term end date must be on or after the start date.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          title: form.title,
          section: form.section.trim() || null,
          termName: form.termName.trim() || null,
          termStart,
          termEnd,
          timeZone: form.timeZone,
          colorKey: form.colorKey,
          status: form.status,
          institutionId: form.institution?.id ?? null,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(
          body?.error?.message ?? "We couldn’t save this course. Try again.",
        );
      }

      setSettingsOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t save this course. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse() {
    if (deleting || readOnly) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(
          body?.error?.message ?? "We couldn’t delete this course. Try again.",
        );
      }

      setDeleteOpen(false);
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t delete this course. Try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function publishCourse() {
    if (sharing || readOnly || !rightsConfirmed) return;
    setSharing(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/courses/${course.id}/community-publication`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rightsConfirmed: true }),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(
          body?.error?.message ?? "We couldn’t publish this course. Try again.",
        );
      }
      setPublishOpen(false);
      setRightsConfirmed(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t publish this course. Try again.",
      );
    } finally {
      setSharing(false);
    }
  }

  async function unpublishCourse() {
    if (sharing || readOnly) return;
    setSharing(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/courses/${course.id}/community-publication`,
        { method: "DELETE" },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(
          body?.error?.message ??
            "We couldn’t remove this course from the community.",
        );
      }
      setUnpublishOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "We couldn’t unpublish it.",
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Course options"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{course.code} options</DropdownMenuLabel>
          <DropdownMenuItem onSelect={openSettings}>
            <Settings2 />
            Course settings
          </DropdownMenuItem>
          <DropdownMenuItem asChild disabled={readOnly}>
            <Link href={`/courses/${course.id}/edit`}>
              <PencilLine />
              Edit course data
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/courses/${course.id}/calendar`}>
              <CalendarDays />
              Open calendar
            </Link>
          </DropdownMenuItem>
          {course.publication?.status === "published" ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/community/${course.publication.id}`}>
                  <Globe2 />
                  View public course
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={readOnly}
                onSelect={() => {
                  setError(null);
                  setRightsConfirmed(false);
                  setPublishOpen(true);
                }}
              >
                <Globe2 />
                Update public snapshot
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={readOnly}
                onSelect={() => {
                  setError(null);
                  setUnpublishOpen(true);
                }}
              >
                <EyeOff />
                Unpublish
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              disabled={readOnly}
              onSelect={() => {
                setError(null);
                setRightsConfirmed(false);
                setPublishOpen(true);
              }}
            >
              <Globe2 />
              Publish to community
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/courses/${course.id}/grades`}>
              <GraduationCap />
              Open grade calculator
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={readOnly}
            onSelect={() => {
              setError(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 />
            Delete course
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={settingsOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setSettingsOpen(open);
            if (!open) setError(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Course settings</DialogTitle>
            <DialogDescription>
              Changes update this course everywhere, including its title,
              sidebar entry, dashboard card, dates, and calendar exports.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveCourse} className="space-y-5">
            {readOnly ? (
              <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-xs">
                Demo courses are read-only. Sign in to edit your own course.
              </p>
            ) : null}

            <section className="space-y-3" aria-labelledby="identity-heading">
              <div>
                <h3 id="identity-heading" className="font-semibold">
                  Course identity
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Used in the page title, navigation, dashboard, and exported
                  calendar.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[0.75fr_1.5fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="course-code">Course number</Label>
                  <Input
                    id="course-code"
                    value={form.code}
                    onChange={(event) =>
                      updateField("code", event.target.value)
                    }
                    maxLength={40}
                    required
                    disabled={readOnly || saving}
                    placeholder="36-202"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course-title">Course name</Label>
                  <Input
                    id="course-title"
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    maxLength={180}
                    required
                    disabled={readOnly || saving}
                    placeholder="Methods for Statistics & Data Science"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-section">Section</Label>
                <Input
                  id="course-section"
                  value={form.section}
                  onChange={(event) =>
                    updateField("section", event.target.value)
                  }
                  maxLength={80}
                  disabled={readOnly || saving}
                  placeholder="Lecture 1 or Section A"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-institution">School</Label>
                <InstitutionCombobox
                  inputId="course-institution"
                  value={form.institution}
                  onChange={(institution) =>
                    updateField("institution", institution)
                  }
                  disabled={readOnly || saving}
                />
                <p className="text-muted-foreground text-xs">
                  This determines where the course appears if you publish it to
                  the community.
                </p>
              </div>
            </section>

            <section
              className="border-border space-y-3 border-t pt-5"
              aria-labelledby="sharing-heading"
            >
              <div>
                <h3
                  id="sharing-heading"
                  className="flex items-center gap-2 font-semibold"
                >
                  {course.publication?.status === "published" ? (
                    <Globe2 className="text-ocean size-4" />
                  ) : (
                    <EyeOff className="text-muted-foreground size-4" />
                  )}
                  Community sharing
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {course.publication?.status === "published"
                    ? `Published snapshot v${course.publication.version}. Use the course menu to view or update it.`
                    : "Private. Publishing is a separate confirmation step after these settings are saved."}
                </p>
              </div>
            </section>

            <section
              className="border-border space-y-3 border-t pt-5"
              aria-labelledby="term-heading"
            >
              <div>
                <h3 id="term-heading" className="font-semibold">
                  Term & dates
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Dates help scope course calendars and semester context.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="term-name">Term name</Label>
                <Input
                  id="term-name"
                  value={form.termName}
                  onChange={(event) =>
                    updateField("termName", event.target.value)
                  }
                  maxLength={80}
                  disabled={readOnly || saving}
                  placeholder="Fall 2026"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <EnglishDateField
                  id="term-start"
                  label="Start date"
                  value={form.termStart}
                  onChange={(value) => updateField("termStart", value)}
                  disabled={readOnly || saving}
                />
                <EnglishDateField
                  id="term-end"
                  label="End date"
                  value={form.termEnd}
                  onChange={(value) => updateField("termEnd", value)}
                  disabled={readOnly || saving}
                  minValue={form.termStart}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-time-zone">Course time zone</Label>
                <Input
                  id="course-time-zone"
                  list="course-time-zone-options"
                  value={form.timeZone}
                  onChange={(event) =>
                    updateField("timeZone", event.target.value)
                  }
                  maxLength={80}
                  required
                  disabled={readOnly || saving}
                  placeholder="America/New_York"
                />
                <datalist id="course-time-zone-options">
                  <option value="America/New_York" />
                  <option value="America/Chicago" />
                  <option value="America/Denver" />
                  <option value="America/Los_Angeles" />
                  <option value="Europe/London" />
                  <option value="Asia/Shanghai" />
                </datalist>
                <p className="text-muted-foreground text-xs">
                  Use an IANA time zone. Course dates use this zone even though
                  the account default stays on New York time.
                </p>
              </div>
            </section>

            <section
              className="border-border space-y-3 border-t pt-5"
              aria-labelledby="appearance-heading"
            >
              <div>
                <h3
                  id="appearance-heading"
                  className="flex items-center gap-2 font-semibold"
                >
                  <Palette className="text-ocean size-4" />
                  Appearance & status
                </h3>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Course color</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {colors.map((color) => {
                    const selected = form.colorKey === color.value;
                    return (
                      <button
                        key={color.value}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          "border-border flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors",
                          selected && "border-ocean ring-ocean/20 ring-2",
                        )}
                        onClick={() => updateField("colorKey", color.value)}
                        disabled={readOnly || saving}
                      >
                        <span
                          className={cn(
                            "size-3 rounded-[3px]",
                            color.className,
                          )}
                          aria-hidden="true"
                        />
                        {color.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="space-y-1.5">
                <Label htmlFor="course-status">Course status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    updateField("status", value as EditableStatus)
                  }
                  disabled={readOnly || saving}
                >
                  <SelectTrigger id="course-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Archived courses stay saved and can be restored later.
                </p>
              </div>
            </section>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={readOnly || saving}>
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Settings2 className="size-4" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={publishOpen}
        onOpenChange={(open) => {
          if (!sharing) {
            setPublishOpen(open);
            if (!open) {
              setError(null);
              setRightsConfirmed(false);
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {course.publication?.status === "published"
                ? "Update the public snapshot?"
                : "Publish this course?"}
            </DialogTitle>
            <DialogDescription>
              Signed-in students can view the structured course information
              and original syllabus PDF. Your private grades, notes, staff
              contact details, and meeting links are never included.
            </DialogDescription>
          </DialogHeader>
          {!course.institution ? (
            <p className="bg-gold/10 text-navy rounded-lg px-3 py-2 text-xs">
              Save a school in Course settings before publishing.
            </p>
          ) : null}
          <label className="border-border flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-5">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(event) => setRightsConfirmed(event.target.checked)}
              disabled={sharing}
              className="accent-ocean mt-1 size-4 shrink-0"
            />
            <span>
              I confirm that I have permission to share this syllabus and the
              course information extracted from it.
            </span>
          </label>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={sharing}
              onClick={() => setPublishOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={publishCourse}
              disabled={sharing || !rightsConfirmed || !course.institution}
            >
              {sharing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Globe2 className="size-4" />
              )}
              {course.publication?.status === "published"
                ? "Update snapshot"
                : "Publish course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={unpublishOpen}
        onOpenChange={(open) => {
          if (!sharing) {
            setUnpublishOpen(open);
            if (!open) setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this course from the community?</DialogTitle>
            <DialogDescription>
              The published snapshot and PDF will stop being visible to other
              students. Your private workspace and previous imports stay
              intact, and you can publish it again later.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={sharing}
              onClick={() => setUnpublishOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={sharing}
              onClick={unpublishCourse}
            >
              {sharing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <EyeOff className="size-4" />
              )}
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteOpen(open);
            if (!open) setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>
              {course.title} and its saved workspace, grades, dates, and
              uploaded syllabus will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={deleteCourse}
            >
              {deleting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
