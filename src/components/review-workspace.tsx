"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type {
  ItemReviewStatus,
  ReviewData,
  ReviewItemData,
} from "@/lib/data/review";
import { cn } from "@/lib/utils";

const sectionDefinitions = [
  {
    id: "course",
    label: "Course details",
    icon: BookOpen,
    types: ["course_field"],
  },
  {
    id: "people",
    label: "People & office hours",
    icon: Users,
    types: ["person", "office_hour"],
  },
  {
    id: "dates",
    label: "Important dates",
    icon: CalendarDays,
    types: ["event"],
  },
  {
    id: "grading",
    label: "Grading structure",
    icon: GraduationCap,
    types: ["grading_category", "grading_policy"],
  },
] as const;

const confidenceText = {
  high: "High confidence",
  review: "Needs review",
  low: "Low confidence",
};

export function ReviewWorkspace({
  initialData,
  demo,
}: {
  initialData: ReviewData;
  demo: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialData.items);
  const [selectedId, setSelectedId] = useState(
    initialData.items[0]?.id ?? null,
  );
  const [editing, setEditing] = useState<ReviewItemData | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const reviewed = items.filter(
    (item) => item.reviewStatus !== "pending",
  ).length;
  const pending = items.length - reviewed;
  const progress = items.length === 0 ? 0 : (reviewed / items.length) * 100;
  const highPending = items.filter(
    (item) =>
      item.reviewStatus === "pending" && item.confidenceLabel === "high",
  );

  async function saveItem(
    id: string,
    reviewStatus: ItemReviewStatus,
    payload?: Record<string, unknown>,
  ) {
    const previous = items;
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, reviewStatus, payload: payload ?? item.payload }
          : item,
      ),
    );
    setSaveState("saving");

    if (demo) {
      setSaveState("saved");
      return true;
    }

    const response = await fetch(`/api/extraction-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus, currentPayload: payload }),
    });
    if (!response.ok) {
      setItems(previous);
      setSaveState("error");
      return false;
    }

    setSaveState("saved");
    return true;
  }

  async function confirmHighConfidence() {
    await Promise.all(
      highPending.map((item) => saveItem(item.id, "confirmed")),
    );
  }

  function beginEdit(item: ReviewItemData) {
    setEditing(item);
    setEditValue(primaryValue(item));
    setEditWeight(
      item.itemType === "grading_category"
        ? String(item.payload.weightPercent ?? "")
        : "",
    );
  }

  async function saveEdit() {
    if (!editing || !editValue.trim()) return;
    const payload = editedPayload(editing, editValue.trim(), editWeight);
    const saved = await saveItem(editing.id, "edited", payload);
    if (saved) setEditing(null);
  }

  async function publish() {
    setPublishing(true);
    setPublishError(null);

    if (demo) {
      router.push(`/courses/${initialData.courseId}`);
      router.refresh();
      return;
    }

    const response = await fetch(
      `/api/courses/${initialData.courseId}/publish`,
      {
        method: "POST",
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setPublishError(
        body?.error?.message ??
          "We couldn’t create the workspace. Check the pending items and try again.",
      );
      setPublishing(false);
      return;
    }

    router.replace(`/courses/${initialData.courseId}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f4f8f7]">
      <div className="border-border sticky top-0 z-20 border-b bg-white/96 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.back()}
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-navy truncate text-base font-extrabold tracking-[-0.025em]">
                  Review syllabus
                </h1>
                <Badge
                  variant="outline"
                  className="hidden bg-white font-mono text-[9px] sm:inline-flex"
                >
                  {initialData.courseLabel}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[10px]">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold",
                    saveState === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {saveState === "saving" ? (
                    <Clock3 className="size-3" />
                  ) : saveState === "saved" ? (
                    <Save className="size-3" />
                  ) : (
                    <CircleAlert className="size-3" />
                  )}
                  {saveState === "saving"
                    ? "Saving…"
                    : saveState === "saved"
                      ? "All decisions saved"
                      : "Save failed"}
                </span>
                <span>·</span>
                <span>
                  {reviewed} of {items.length} reviewed
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {highPending.length > 0 ? (
              <Button
                variant="outline"
                className="h-9 flex-1 sm:flex-none"
                onClick={confirmHighConfidence}
              >
                <CheckCheck className="size-4" /> Confirm {highPending.length}{" "}
                high confidence
              </Button>
            ) : null}
            <Button
              className="h-9 flex-1 px-4 sm:flex-none"
              disabled={pending > 0 || publishing}
              onClick={publish}
            >
              {publishing ? "Creating workspace…" : "Create course workspace"}
              {!publishing ? <ChevronRight className="size-4" /> : null}
            </Button>
          </div>
        </div>
        <Progress
          value={progress}
          aria-label={`Review progress: ${progress}%`}
          className="h-1 rounded-none"
        />
      </div>

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        <div className="border-border min-w-0 lg:border-r">
          <nav
            className="border-border sticky top-[123px] z-10 flex gap-1 overflow-x-auto border-b bg-[#f4f8f7]/96 px-4 py-3 backdrop-blur-sm sm:px-6 lg:top-[97px] lg:px-8"
            aria-label="Review sections"
          >
            {sectionDefinitions.map((section) => {
              const count = items.filter((item) =>
                section.types.includes(item.itemType as never),
              ).length;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-muted-foreground hover:text-navy inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold hover:bg-white"
                >
                  <section.icon className="size-3.5" /> {section.label}
                  <span className="font-mono text-[9px] text-[#48616d]">
                    {count}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {initialData.warnings.length > 0 ? (
              <Alert className="border-gold/40 bg-gold/10 text-navy">
                <AlertTriangle className="size-4 text-[#9a6700]" />
                <AlertTitle>Policy note</AlertTitle>
                <AlertDescription className="text-[#48616d]">
                  {initialData.warnings[0].message}
                </AlertDescription>
              </Alert>
            ) : null}
            {publishError ? (
              <Alert variant="destructive">
                <AlertTitle>Workspace not created</AlertTitle>
                <AlertDescription>{publishError}</AlertDescription>
              </Alert>
            ) : null}

            {sectionDefinitions.map((section) => {
              const sectionItems = items.filter((item) =>
                section.types.includes(item.itemType as never),
              );
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-44 lg:scroll-mt-36"
                >
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <section.icon className="text-ocean size-4" />
                        <h2 className="text-navy text-base font-extrabold tracking-[-0.025em]">
                          {section.label}
                        </h2>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        Confirm what’s right. Edit or reject what isn’t.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {sectionItems.length > 0 ? (
                      sectionItems.map((item) => (
                        <ReviewCard
                          key={item.id}
                          item={item}
                          selected={selected?.id === item.id}
                          onSelect={() => setSelectedId(item.id)}
                          onConfirm={() => saveItem(item.id, "confirmed")}
                          onReject={() => saveItem(item.id, "rejected")}
                          onEdit={() => beginEdit(item)}
                        />
                      ))
                    ) : (
                      <div className="border-border text-muted-foreground rounded-xl border border-dashed bg-white/60 p-5 text-center text-xs">
                        Nothing was found in this section.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <aside className="hidden min-w-0 bg-[#eef3f2] lg:block">
          <div className="sticky top-[97px] h-[calc(100vh-97px)] p-6 xl:p-8">
            <SourcePanel
              item={selected}
              sourceName={initialData.sourceName}
              pageCount={initialData.pageCount}
            />
          </div>
        </aside>
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit extracted item</DialogTitle>
            <DialogDescription>
              The original value and source evidence will remain attached.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="review-value">{editLabel(editing)}</Label>
                <Input
                  id="review-value"
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  autoFocus
                />
              </div>
              {editing.itemType === "grading_category" ? (
                <div className="space-y-2">
                  <Label htmlFor="review-weight">Course weight (%)</Label>
                  <Input
                    id="review-weight"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editWeight}
                    onChange={(event) => setEditWeight(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="border-border bg-muted/55 text-muted-foreground rounded-lg border p-3 text-xs leading-5">
                Original:{" "}
                <span className="text-navy/75 font-semibold">
                  {primaryValue(editing)}
                </span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!editValue.trim()}>
              Save and confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ReviewCard({
  item,
  selected,
  onSelect,
  onConfirm,
  onReject,
  onEdit,
}: {
  item: ReviewItemData;
  selected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  const statusTone =
    item.reviewStatus === "confirmed" || item.reviewStatus === "edited"
      ? "confirmed"
      : item.reviewStatus === "rejected"
        ? "rejected"
        : "pending";
  return (
    <Card
      className={cn(
        "gap-0 py-0 shadow-[0_4px_16px_rgba(2,48,71,0.04)] transition-colors",
        selected
          ? "border-ocean/50 ring-ocean/8 ring-2"
          : "hover:border-navy/18",
        statusTone === "rejected" && "opacity-60",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <button
          type="button"
          onClick={onSelect}
          className="w-full text-left outline-none"
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                item.confidenceLabel === "high"
                  ? "bg-ocean/10 text-[#07556a]"
                  : item.confidenceLabel === "review"
                    ? "bg-gold/15 text-[#8a6200]"
                    : "bg-orange/10 text-[#804100]",
              )}
            >
              {itemIcon(item)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-navy text-sm font-extrabold tracking-[-0.015em]">
                  {primaryValue(item)}
                </p>
                <ConfidenceBadge label={item.confidenceLabel} />
                {item.reviewStatus !== "pending" ? (
                  <StatusBadge status={item.reviewStatus} />
                ) : null}
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs leading-5">
                {secondaryValue(item)}
              </p>
              {item.evidence[0] ? (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#07556a]">
                  <FileText className="size-3" /> Found on page{" "}
                  {item.evidence[0].pageNumber ?? "—"}
                </span>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#804100]">
                  <CircleAlert className="size-3" /> Evidence not verified
                </span>
              )}
              {item.evidence[0] ? (
                <blockquote className="border-gold bg-gold/9 text-navy/72 mt-3 rounded-lg border-l-2 px-3 py-2 text-[11px] leading-5 lg:hidden">
                  “{item.evidence[0].quote}”
                </blockquote>
              ) : null}
            </div>
          </div>
        </button>
        <div className="border-border mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onReject}
            disabled={item.reviewStatus === "rejected"}
          >
            <Trash2 className="size-3.5" /> Reject
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={
              item.reviewStatus === "confirmed" ||
              item.reviewStatus === "edited"
            }
          >
            <Check className="size-3.5" /> Confirm
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SourcePanel({
  item,
  sourceName,
  pageCount,
}: {
  item?: ReviewItemData;
  sourceName: string;
  pageCount: number | null;
}) {
  const evidence = item?.evidence[0];
  return (
    <div className="border-navy/10 flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_12px_36px_rgba(2,48,71,0.08)]">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.11em] uppercase">
            Source evidence
          </p>
          <p className="text-navy mt-1 truncate text-xs font-bold">
            {sourceName}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Open source preview"
        >
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
      <div className="border-border text-muted-foreground flex items-center justify-between border-b bg-[#f8faf9] px-5 py-2.5 text-[10px] font-semibold">
        <span>
          Page {evidence?.pageNumber ?? "—"} of {pageCount ?? "—"}
        </span>
        <span>Verified excerpt</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#eef3f2] p-5 xl:p-7">
        <div className="mx-auto min-h-full max-w-[600px] rounded-sm bg-white px-8 py-10 shadow-[0_8px_30px_rgba(2,48,71,0.1)]">
          <div className="mb-7 flex items-center justify-between">
            <div className="bg-navy/12 h-3 w-32 rounded" />
            <div className="bg-navy/8 h-2 w-12 rounded" />
          </div>
          <div className="space-y-3">
            {["100%", "92%", "96%", "78%"].map((width, index) => (
              <div
                key={index}
                className="bg-navy/7 h-2 rounded"
                style={{ width }}
              />
            ))}
            <div className="border-gold bg-gold/12 my-7 rounded-lg border-l-3 px-4 py-4">
              <p className="text-navy/82 text-sm leading-7 font-medium">
                {evidence?.quote ??
                  "Select an item to inspect the statement it came from."}
              </p>
            </div>
            {["95%", "88%", "100%", "72%", "91%"].map((width, index) => (
              <div
                key={index}
                className="bg-navy/7 h-2 rounded"
                style={{ width }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="border-border text-muted-foreground border-t bg-white px-5 py-3 text-[10px] leading-5">
        Source quotes are normalized and checked against the parsed PDF text
        before review.
      </div>
    </div>
  );
}

function ConfidenceBadge({
  label,
}: {
  label: ReviewItemData["confidenceLabel"];
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px]",
        label === "high"
          ? "border-ocean/20 bg-ocean/8 text-[#07556a]"
          : label === "review"
            ? "border-gold/30 bg-gold/10 text-[#805b00]"
            : "border-orange/25 bg-orange/8 text-[#804100]",
      )}
    >
      {confidenceText[label]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: ItemReviewStatus }) {
  if (status === "pending") return null;
  return (
    <Badge
      className={cn(
        "border-0 text-[9px] shadow-none",
        status === "rejected"
          ? "bg-muted text-muted-foreground"
          : "bg-ocean/10 text-[#07556a]",
      )}
    >
      {status === "confirmed" ? (
        <CircleCheck className="mr-1 size-3" />
      ) : status === "edited" ? (
        <Pencil className="mr-1 size-3" />
      ) : null}
      {status[0].toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function primaryValue(item: ReviewItemData) {
  if (item.itemType === "course_field")
    return String(item.payload.value ?? "Missing value");
  if (item.itemType === "person")
    return String(item.payload.name ?? "Unnamed person");
  if (item.itemType === "office_hour")
    return String(item.payload.recurrenceText ?? "Office hours");
  if (item.itemType === "event")
    return String(item.payload.title ?? "Untitled event");
  if (item.itemType === "grading_category")
    return String(item.payload.name ?? "Unnamed category");
  return String(item.payload.description ?? "Grading policy");
}

function secondaryValue(item: ReviewItemData) {
  if (item.itemType === "course_field")
    return `Course ${String(item.payload.field ?? "detail")}`;
  if (item.itemType === "person")
    return `${roleLabel(item.payload.role)}${item.payload.email ? ` · ${item.payload.email}` : ""}`;
  if (item.itemType === "office_hour")
    return (
      [item.payload.personName, item.payload.location]
        .filter(Boolean)
        .join(" · ") || "Recurring schedule"
    );
  if (item.itemType === "event")
    return (
      [item.payload.startDate, item.payload.startTime, item.payload.location]
        .filter(Boolean)
        .join(" · ") || "Date needs review"
    );
  if (item.itemType === "grading_category")
    return `${String(item.payload.weightPercent ?? "—")}% of course grade`;
  return "Unsupported in the P0 calculator · shown for transparency";
}

function itemIcon(item: ReviewItemData) {
  if (item.itemType === "person") return <Users className="size-4" />;
  if (item.itemType === "office_hour") return <Clock3 className="size-4" />;
  if (item.itemType === "event") return <CalendarDays className="size-4" />;
  if (
    item.itemType === "grading_category" ||
    item.itemType === "grading_policy"
  )
    return <GraduationCap className="size-4" />;
  return <Sparkles className="size-4" />;
}

function roleLabel(value: unknown) {
  if (value === "instructor") return "Instructor";
  if (value === "teaching_assistant") return "Teaching assistant";
  return "Course staff";
}

function editLabel(item: ReviewItemData) {
  if (item.itemType === "person") return "Name";
  if (item.itemType === "event") return "Event title";
  if (item.itemType === "grading_category") return "Category name";
  if (item.itemType === "grading_policy") return "Policy description";
  return "Value";
}

function editedPayload(item: ReviewItemData, value: string, weight: string) {
  if (item.itemType === "course_field") return { ...item.payload, value };
  if (item.itemType === "person") return { ...item.payload, name: value };
  if (item.itemType === "office_hour")
    return { ...item.payload, recurrenceText: value };
  if (item.itemType === "event") return { ...item.payload, title: value };
  if (item.itemType === "grading_category")
    return { ...item.payload, name: value, weightPercent: Number(weight) };
  return { ...item.payload, description: value };
}
