"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NavigationCourse } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

const courseColorClass = {
  ocean: "bg-ocean",
  orange: "bg-orange",
  gold: "bg-gold",
  navy: "bg-navy",
} as const;

function courseHref(course: NavigationCourse) {
  return course.status === "draft"
    ? `/courses/${course.id}/review`
    : `/courses/${course.id}`;
}

function courseName(course: NavigationCourse) {
  return course.title?.trim() || course.code?.trim() || "New course";
}

export function CourseSidebarList({
  courses,
  canDelete,
}: {
  courses: NavigationCourse[];
  canDelete: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [courseToDelete, setCourseToDelete] = useState<NavigationCourse | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const visibleCourses = courses.filter(
    (course) => !hiddenCourseIds.has(course.id),
  );

  async function deleteCourse() {
    if (!courseToDelete || deletingId) return;

    const course = courseToDelete;
    setDeletingId(course.id);
    setDeleteError(null);

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

      setHiddenCourseIds((current) => new Set(current).add(course.id));
      setCourseToDelete(null);

      const coursePath = `/courses/${course.id}`;
      if (pathname === coursePath || pathname.startsWith(`${coursePath}/`)) {
        router.replace("/dashboard");
      }
      router.refresh();
    } catch (caught) {
      setDeleteError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t delete this course. Try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {visibleCourses.map((course) => {
          const name = courseName(course);
          const coursePath = `/courses/${course.id}`;
          const active =
            pathname === coursePath || pathname.startsWith(`${coursePath}/`);

          return (
            <div
              key={course.id}
              className={cn(
                "group/course relative flex items-center rounded-lg border border-transparent transition-colors",
                active
                  ? "border-ocean/25 text-navy bg-white shadow-[0_2px_10px_rgba(2,48,71,0.05)]"
                  : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {active ? (
                <span
                  className="bg-ocean absolute inset-y-2 left-0 w-0.5 rounded-full"
                  aria-hidden="true"
                />
              ) : null}
              <Link
                href={courseHref(course)}
                aria-current={active ? "page" : undefined}
                className="focus-visible:outline-ocean flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2.5 pr-9 pl-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-1"
                title={[course.code, course.title].filter(Boolean).join(" · ")}
              >
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-[3px]",
                    courseColorClass[course.color],
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{name}</span>
                  {course.code && course.title ? (
                    <span className="text-muted-foreground mt-0.5 block truncate font-mono text-[9px]">
                      {course.code}
                    </span>
                  ) : course.status === "draft" ? (
                    <span className="text-muted-foreground mt-0.5 block text-[9px]">
                      Draft
                    </span>
                  ) : null}
                </span>
              </Link>
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive absolute right-1.5 opacity-55 group-hover/course:opacity-100 focus-visible:opacity-100"
                  onClick={() => {
                    setDeleteError(null);
                    setCourseToDelete(course);
                  }}
                  aria-label={`Delete ${name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          );
        })}
        {visibleCourses.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2 text-xs leading-5">
            Add a course to begin.
          </p>
        ) : null}
        {deleteError && !courseToDelete ? (
          <p className="text-destructive px-3 py-2 text-xs" role="alert">
            {deleteError}
          </p>
        ) : null}
      </div>

      <Dialog
        open={courseToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setCourseToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>
              {courseToDelete
                ? `${courseName(courseToDelete)} and its saved workspace, grades, dates, and uploaded syllabus will be permanently deleted.`
                : "This course and its saved workspace will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-destructive text-sm" role="alert">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingId !== null}
              onClick={() => {
                setCourseToDelete(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingId !== null}
              onClick={deleteCourse}
            >
              {deletingId ? (
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
