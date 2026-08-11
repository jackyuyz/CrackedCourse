"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, LibraryBig } from "lucide-react";

import { cn } from "@/lib/utils";

const workspaceLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/community", label: "Community", icon: LibraryBig },
] as const;

function subscribeToPathname() {
  return () => {};
}

function serverPathnameSnapshot() {
  return null;
}

export function WorkspaceNavigation() {
  const pathname = usePathname();
  const clientPathname = useSyncExternalStore(
    subscribeToPathname,
    () => pathname,
    serverPathnameSnapshot,
  );

  return <WorkspaceNavigationLinks pathname={clientPathname} />;
}

export function WorkspaceNavigationFallback() {
  return <WorkspaceNavigationLinks pathname={null} />;
}

function WorkspaceNavigationLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="mt-5 space-y-1 px-3" aria-label="Workspace navigation">
      {workspaceLinks.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/community" &&
            Boolean(pathname?.startsWith("/community/")));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:outline-ocean relative flex h-10 items-center gap-3 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
              active
                ? "border-ocean/25 text-navy bg-white shadow-[0_2px_10px_rgba(2,48,71,0.05)]"
                : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent",
            )}
          >
            {active ? (
              <span
                className="bg-ocean absolute inset-y-2 left-0 w-0.5 rounded-full"
                aria-hidden="true"
              />
            ) : null}
            <item.icon className="size-4.5" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
