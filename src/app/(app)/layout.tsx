import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/lib/auth/viewer";
import { getNavigationCourses } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function PrivateAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/?signIn=required#sign-in");
  const courses = await getNavigationCourses(viewer);

  return (
    <AppShell viewer={viewer} courses={courses}>
      {children}
    </AppShell>
  );
}
