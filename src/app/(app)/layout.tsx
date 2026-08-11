import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getViewerState } from "@/lib/auth/viewer";
import { getNavigationCourses } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function PrivateAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewerState = await getViewerState();
  if (viewerState.kind === "rate_limited") {
    return (
      <main className="mx-auto grid min-h-screen max-w-lg place-items-center px-6 py-12 text-center">
        <div>
          <p className="text-ocean text-xs font-bold tracking-[0.14em] uppercase">
            Sign-in check paused
          </p>
          <h1 className="text-navy mt-3 text-2xl font-extrabold tracking-[-0.035em]">
            Your workspace is still safe.
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            We briefly reached the sign-in service’s request limit. Wait a
            moment, then refresh this page. Your courses have not been removed.
          </p>
        </div>
      </main>
    );
  }
  if (viewerState.kind !== "authenticated") {
    redirect("/login?notice=required&next=/dashboard");
  }
  const courses = await getNavigationCourses(viewerState.viewer);

  return (
    <AppShell viewer={viewerState.viewer} courses={courses}>
      {children}
    </AppShell>
  );
}
