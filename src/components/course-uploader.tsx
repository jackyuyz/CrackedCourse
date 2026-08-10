"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileText,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InstitutionCombobox } from "@/components/institution-combobox";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { PRIMARY_TIME_ZONE } from "@/lib/time-zone";
import type { InstitutionOption } from "@/lib/institutions";
import { cn } from "@/lib/utils";

type Phase =
  "idle" | "uploading" | "reading" | "finding" | "preparing" | "error";

type CourseStatus = "draft" | "active" | "archived";

interface CourseResolution {
  courseId: string;
  courseStatus: CourseStatus;
  reused: boolean;
}

interface SourceRegistration extends CourseResolution {
  source: { id: string };
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

const phases: Array<{ key: Phase; label: string }> = [
  { key: "reading", label: "Reading document" },
  { key: "finding", label: "Finding course details" },
  { key: "preparing", label: "Preparing review" },
];

const order: Record<Phase, number> = {
  idle: -2,
  uploading: -1,
  reading: 0,
  finding: 1,
  preparing: 2,
  error: -2,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function responseBody<T>(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    (T & ApiErrorBody) | null;
  if (!response.ok) {
    throw new Error(body?.error?.message ?? fallback);
  }
  if (!body) throw new Error(fallback);
  return body;
}

export function CourseUploader({
  demo,
  defaultInstitution,
}: {
  demo: boolean;
  defaultInstitution?: InstitutionOption | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [institution, setInstitution] = useState(defaultInstitution ?? null);

  const busy = !["idle", "error"].includes(phase);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    setError(null);
    const maxBytes = 15 * 1024 * 1024;
    if (!nextFile.name.toLocaleLowerCase("en-US").endsWith(".pdf")) {
      setError("Choose a .pdf syllabus file.");
      setPhase("error");
      return;
    }
    if (nextFile.size > maxBytes) {
      setError("That PDF is larger than 15 MB. Choose a smaller file.");
      setPhase("error");
      return;
    }
    setFile(nextFile);
    setPhase("idle");
  }

  async function start() {
    if (!file) return;
    setError(null);

    if (demo) {
      setPhase("uploading");
      await delay(450);
      setPhase("reading");
      await delay(650);
      setPhase("finding");
      await delay(650);
      setPhase("preparing");
      await delay(450);
      router.push("/courses/course-cs-1522/review");
      return;
    }

    try {
      setPhase("uploading");
      const supabase = createClient();
      const [{ data: userResult, error: userError }, fileBytes] =
        await Promise.all([supabase.auth.getUser(), file.arrayBuffer()]);
      if (userError || !userResult.user) {
        throw new Error("Sign in again before uploading a syllabus.");
      }

      const hashBytes = await crypto.subtle.digest("SHA-256", fileBytes);
      const sha256 = Array.from(new Uint8Array(hashBytes))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      const courseResponse = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeZone: PRIMARY_TIME_ZONE,
          colorKey: "ocean",
          syllabusSha256: sha256,
          institutionId: institution?.id ?? null,
        }),
      });
      let resolution = await responseBody<CourseResolution>(
        courseResponse,
        "We couldn’t create or open the course draft. Try again.",
      );

      if (!resolution.reused) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const storagePath = `${userResult.user.id}/${crypto.randomUUID()}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("syllabi")
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: "application/pdf",
            upsert: false,
          });
        if (uploadError) {
          throw new Error(
            "The course draft was saved, but the PDF upload failed. Try again.",
          );
        }

        const registrationResponse = await fetch(
          `/api/courses/${resolution.courseId}/sources`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storagePath,
              originalName: file.name,
              mimeType: "application/pdf",
              sizeBytes: file.size,
              sha256,
            }),
          },
        );
        resolution = await responseBody<SourceRegistration>(
          registrationResponse,
          "The PDF was uploaded, but we couldn’t save it to the course. Try again.",
        );
      }

      if (resolution.courseStatus === "active") {
        setPhase("preparing");
        router.push(`/courses/${resolution.courseId}`);
        router.refresh();
        return;
      }

      setPhase("reading");
      const extraction = await fetch(
        `/api/courses/${resolution.courseId}/extractions`,
        { method: "POST" },
      );
      await responseBody(
        extraction,
        "The course and PDF are saved, but analysis failed. Try again.",
      );
      setPhase("preparing");
      router.push(`/courses/${resolution.courseId}/review`);
      router.refresh();
    } catch (caught) {
      setPhase("error");
      router.refresh();
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t prepare this syllabus. The saved draft is safe—try again.",
      );
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="gap-0 py-0 shadow-[0_8px_30px_rgba(2,48,71,0.055)]">
        <CardContent className="p-5 sm:p-7">
          {!busy ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  chooseFile(event.dataTransfer.files[0]);
                }}
                className={cn(
                  "group focus-visible:border-ocean focus-visible:ring-ocean/15 grid min-h-[330px] w-full place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors outline-none focus-visible:ring-4",
                  dragging
                    ? "border-ocean bg-sky/16"
                    : file
                      ? "border-ocean/40 bg-sky/8"
                      : "border-navy/15 hover:border-ocean/50 hover:bg-sky/8 bg-[#f9fbfa]",
                )}
              >
                <span className="max-w-md">
                  <span
                    className={cn(
                      "mx-auto grid size-16 place-items-center rounded-2xl transition-colors",
                      file
                        ? "bg-ocean text-white"
                        : "bg-sky/22 text-ocean group-hover:bg-sky/35",
                    )}
                  >
                    {file ? (
                      <FileText className="size-7" />
                    ) : (
                      <UploadCloud className="size-7" />
                    )}
                  </span>
                  <span className="text-navy mt-5 block text-lg font-extrabold tracking-[-0.025em]">
                    {file ? file.name : "Drop your syllabus here"}
                  </span>
                  <span className="text-muted-foreground mt-2 block text-sm leading-6">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to upload`
                      : "or choose a file from your computer"}
                  </span>
                  <span className="border-border text-navy mt-5 inline-flex h-9 items-center rounded-lg border bg-white px-3 text-xs font-bold shadow-sm">
                    {file ? "Choose a different PDF" : "Choose PDF"}
                  </span>
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />

              {error ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className="bg-white font-mono text-[10px]"
                  >
                    PDF
                  </Badge>
                  Maximum 15 MB · Text-based documents
                </div>
                <Button className="h-10 px-4" disabled={!file} onClick={start}>
                  Upload and prepare review <ArrowRight className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <ProcessingState
              phase={phase}
              fileName={file?.name ?? "Syllabus.pdf"}
            />
          )}
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card className="gap-0 py-0 shadow-none">
          <CardContent className="p-5">
            <h2 className="text-navy text-sm font-extrabold">Course school</h2>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              We use your profile default. Change it here only when this course
              belongs to another school.
            </p>
            <div className="mt-3">
              <InstitutionCombobox
                value={institution}
                onChange={setInstitution}
                disabled={demo || busy}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="bg-ocean/10 text-ocean grid size-9 place-items-center rounded-xl">
                <LockKeyhole className="size-4" />
              </span>
              <h2 className="text-navy text-sm font-extrabold">
                Private by default
              </h2>
            </div>
            <p className="text-muted-foreground mt-3 text-xs leading-5.5">
              The original PDF is stored in a private, owner-scoped bucket.
              Other students cannot open it.
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="bg-gold/15 grid size-9 place-items-center rounded-xl text-[#805b00]">
                <ScanSearch className="size-4" />
              </span>
              <h2 className="text-navy text-sm font-extrabold">
                You stay in control
              </h2>
            </div>
            <ul className="mt-4 space-y-3">
              {[
                "Review every extracted item",
                "Edit or reject anything",
                "Publish only what you confirm",
              ].map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex items-start gap-2 text-xs leading-5"
                >
                  <Check
                    className="text-ocean mt-1 size-3.5 shrink-0"
                    strokeWidth={3}
                  />{" "}
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <p className="text-muted-foreground px-1 text-[11px] leading-5">
          Scanned PDFs without selectable text may need manual setup. OCR is not
          guaranteed in this release.
        </p>
      </aside>
    </div>
  );
}

function ProcessingState({
  phase,
  fileName,
}: {
  phase: Phase;
  fileName: string;
}) {
  const current = order[phase];
  const progress =
    phase === "uploading"
      ? 10
      : phase === "reading"
        ? 34
        : phase === "finding"
          ? 67
          : 92;
  return (
    <div className="flex min-h-[430px] flex-col items-center justify-center py-8 text-center">
      <span className="bg-sky/22 text-ocean relative grid size-16 place-items-center rounded-2xl">
        <FileText className="size-7" />
        <span className="bg-gold absolute -right-1 -bottom-1 size-5 animate-pulse rounded-full border-2 border-white" />
      </span>
      <h2 className="text-navy mt-5 max-w-sm truncate text-lg font-extrabold tracking-[-0.025em]">
        {fileName}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Keep this tab open while we prepare the evidence-backed review.
      </p>
      <Progress value={progress} className="mt-7 h-1.5 w-full max-w-sm" />
      <div className="mt-7 w-full max-w-sm space-y-3 text-left">
        {phases.map((item, index) => {
          const complete = current > index;
          const active =
            current === index || (phase === "uploading" && index === 0);
          return (
            <div
              key={item.key}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3",
                active ? "border-ocean/30 bg-sky/12" : "border-transparent",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border text-[10px] font-bold",
                  complete
                    ? "border-ocean bg-ocean text-white"
                    : active
                      ? "border-ocean text-ocean"
                      : "border-border text-muted-foreground",
                )}
              >
                {complete ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-bold",
                  active || complete ? "text-navy" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
              {active ? (
                <span className="text-ocean ml-auto text-[10px] font-semibold">
                  Working…
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground mt-6 flex items-center gap-2 text-[11px]">
        <ShieldCheck className="text-ocean size-3.5" /> Syllabus text is treated
        as untrusted source data
      </div>
    </div>
  );
}
