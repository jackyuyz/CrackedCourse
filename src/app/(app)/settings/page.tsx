import type { Metadata } from "next";
import { Bell, Clock3, Database, ShieldCheck, UserRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getViewer } from "@/lib/auth/viewer";
import { PRIMARY_TIME_ZONE } from "@/lib/time-zone";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) return null;

  return (
    <main className="mx-auto max-w-[960px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Profile and privacy defaults for your course workspace."
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="space-y-1" aria-label="Settings sections">
          {[
            [UserRound, "Profile"],
            [Clock3, "Time zone"],
            [Bell, "Notifications"],
            [Database, "Data & export"],
          ].map(([Icon, label], index) => {
            const SettingsIcon = Icon as typeof UserRound;
            return (
              <button
                key={String(label)}
                type="button"
                className={
                  index === 0
                    ? "bg-accent text-navy flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-navy flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold"
                }
              >
                <SettingsIcon className="size-3.5" /> {String(label)}
              </button>
            );
          })}
        </nav>
        <div className="space-y-5">
          <Card className="gap-0 py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)]">
            <CardHeader className="border-border border-b px-5 py-4">
              <CardTitle className="text-navy text-sm font-extrabold">
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input id="display-name" defaultValue={viewer.displayName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-setting">Email</Label>
                  <Input
                    id="email-setting"
                    defaultValue={viewer.email}
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Primary time zone</Label>
                <Input
                  id="timezone"
                  defaultValue={PRIMARY_TIME_ZONE}
                  disabled
                />
                <p className="text-muted-foreground text-[10px] leading-5">
                  Fixed to New York time. Course time zones take priority when a
                  syllabus specifies one.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0 shadow-none">
            <CardContent className="flex items-start gap-3 p-5">
              <span className="bg-ocean/10 text-ocean grid size-9 shrink-0 place-items-center rounded-xl">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-navy text-sm font-extrabold">
                    Private data controls
                  </p>
                  <Badge variant="outline" className="bg-white text-[9px]">
                    RLS enforced
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  Courses, grades, extracted text, and source files remain
                  scoped to your authenticated account.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
