"use client";

import { usePathname } from "next/navigation";

export function CourseWorkspaceFrame({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.endsWith("/review")) return children;

  return (
    <main className="mx-auto max-w-[1260px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      {header}
      {children}
    </main>
  );
}
