import { Suspense } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CirclePlus,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";

import { signOut } from "@/app/(app)/actions";
import { BrandMark } from "@/components/brand-mark";
import { CourseSidebarList } from "@/components/course-sidebar-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  WorkspaceNavigation,
  WorkspaceNavigationFallback,
} from "@/components/workspace-navigation";
import type { Viewer } from "@/lib/auth/viewer";
import type { NavigationCourse } from "@/lib/data/dashboard";

export function AppShell({
  viewer,
  courses,
  children,
}: {
  viewer: Viewer;
  courses: NavigationCourse[];
  children: React.ReactNode;
}) {
  const firstCourse = courses[0];
  const coursesHref = firstCourse ? courseHref(firstCourse) : "/courses/new";
  const gradesHref = firstCourse
    ? `/courses/${firstCourse.id}/grades`
    : "/courses/new";

  return (
    <div className="bg-background min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r lg:flex">
        <div className="flex h-20 items-center px-5">
          <Link
            href="/dashboard"
            className="focus-visible:outline-ocean rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BrandMark compact />
          </Link>
        </div>
        <div className="px-3">
          <Button asChild className="h-10 w-full justify-start px-3 shadow-sm">
            <Link href="/courses/new">
              <CirclePlus className="size-4" />
              Add course
            </Link>
          </Button>
        </div>
        <Suspense fallback={<WorkspaceNavigationFallback />}>
          <WorkspaceNavigation />
        </Suspense>
        <Separator className="mx-5 my-5 w-auto" />
        <div className="flex min-h-0 flex-1 flex-col px-3">
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[10px] font-bold tracking-[0.13em] text-[#48616d] uppercase">
              Courses
            </p>
            <Link
              href="/courses/new"
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-navy rounded p-1"
              aria-label="Add a course"
            >
              <CirclePlus className="size-3.5" />
            </Link>
          </div>
          <CourseSidebarList courses={courses} canDelete={!viewer.isDemo} />
        </div>
        <div className="border-sidebar-border border-t p-3">
          <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span className="bg-navy grid size-8 place-items-center rounded-lg text-xs font-bold text-white">
              {viewer.displayName.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-navy block truncate text-xs font-bold">
                {viewer.displayName}
              </span>
              <span className="block truncate text-[10px] text-[#48616d]">
                {viewer.email}
              </span>
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-[#48616d]"
            >
              <Link href="/settings">
                <Settings className="size-3.5" /> Settings
              </Link>
            </Button>
            {!viewer.isDemo ? (
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Sign out"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </form>
            ) : (
              <Badge
                variant="outline"
                className="border-ocean/20 bg-sky/15 text-[9px] text-[#07556a]"
              >
                Demo
              </Badge>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="border-border bg-background/95 sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 backdrop-blur-sm lg:hidden">
          <Link href="/dashboard">
            <BrandMark compact />
          </Link>
          <Button asChild size="sm" className="h-9">
            <Link href="/courses/new">
              <CirclePlus className="size-4" /> Add
            </Link>
          </Button>
        </header>
        <div className="pb-24 lg:pb-0">{children}</div>
      </div>

      <nav
        className="border-border fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-white/97 px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(2,48,71,0.06)] lg:hidden"
        aria-label="Mobile navigation"
      >
        <MobileNavItem
          href="/dashboard"
          label="Home"
          icon={<LayoutDashboard />}
        />
        <MobileNavItem
          href="/calendar"
          label="Calendar"
          icon={<CalendarDays />}
        />
        <MobileNavItem href={coursesHref} label="Courses" icon={<BookOpen />} />
        <MobileNavItem
          href={gradesHref}
          label="Grades"
          icon={<GraduationCap />}
        />
      </nav>
    </div>
  );
}

function courseHref(course: NavigationCourse) {
  return course.status === "draft"
    ? `/courses/${course.id}/review`
    : `/courses/${course.id}`;
}

function MobileNavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:bg-accent hover:text-navy flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold [&_svg]:size-4.5"
    >
      {icon}
      {label}
    </Link>
  );
}
