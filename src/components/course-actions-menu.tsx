"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  GraduationCap,
  LoaderCircle,
  MoreHorizontal,
  Palette,
  Settings2,
  Trash2,
} from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseIdentity } from "@/lib/data/course";
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

function formFromCourse(course: CourseIdentity): CourseSettingsForm {
  return {
    code: course.code,
    title: course.title,
    section: course.section ?? "",
    termName: course.termName,
    termStart: course.termStart ?? "",
    termEnd: course.termEnd ?? "",
    timeZone: course.timeZone,
    colorKey: course.color,
    status: course.status === "archived" ? "archived" : "active",
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
  const [form, setForm] = useState(() => formFromCourse(course));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

    if (
      form.termStart &&
      form.termEnd &&
      form.termEnd.localeCompare(form.termStart) < 0
    ) {
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
          termStart: form.termStart || null,
          termEnd: form.termEnd || null,
          timeZone: form.timeZone,
          colorKey: form.colorKey,
          status: form.status,
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
          <DropdownMenuItem asChild>
            <Link href={`/courses/${course.id}/calendar`}>
              <CalendarDays />
              Open calendar
            </Link>
          </DropdownMenuItem>
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
                <div className="space-y-1.5">
                  <Label htmlFor="term-start">Start date</Label>
                  <Input
                    id="term-start"
                    type="date"
                    value={form.termStart}
                    onChange={(event) =>
                      updateField("termStart", event.target.value)
                    }
                    disabled={readOnly || saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="term-end">End date</Label>
                  <Input
                    id="term-end"
                    type="date"
                    value={form.termEnd}
                    min={form.termStart || undefined}
                    onChange={(event) =>
                      updateField("termEnd", event.target.value)
                    }
                    disabled={readOnly || saving}
                  />
                </div>
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
