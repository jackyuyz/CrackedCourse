"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  CircleAlert,
  CircleHelp,
  GraduationCap,
  Save,
  ShieldCheck,
  Target,
} from "lucide-react";

import { PolicyNotes } from "@/components/policy-notes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateCurrentGrade,
  calculateTargetGrade,
  type GradeCategory,
} from "@/lib/grades/calculations";
import { cn } from "@/lib/utils";

export interface PercentageGradeCategory extends GradeCategory {
  id: string;
}

type Persistence = { kind: "account" } | { kind: "session" } | { kind: "none" };

export function PercentageGradeCalculator({
  initialCategories,
  title = "Grade calculator",
  description = "Enter the percentage you earned for each weighted grade item.",
  persistence,
  policyWarnings = [],
}: {
  initialCategories: PercentageGradeCategory[];
  title?: string;
  description?: string;
  persistence: Persistence;
  policyWarnings?: string[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialCategories.map((category) => [
        category.id,
        category.scorePercent?.toString() ?? "",
      ]),
    ),
  );
  const [target, setTarget] = useState(90);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );

  const current = useMemo(
    () => calculateCurrentGrade(categories),
    [categories],
  );
  const targetResult = useMemo(
    () => calculateTargetGrade(categories, target),
    [categories, target],
  );

  function updateScore(categoryId: string, raw: string) {
    if (!/^\d*(?:\.\d*)?$/.test(raw)) return;
    setScoreDrafts((currentDrafts) => ({
      ...currentDrafts,
      [categoryId]: raw,
    }));
    const parsed = raw === "" || raw === "." ? null : Number(raw);
    const scorePercent =
      parsed == null || Number.isNaN(parsed) ? null : Math.max(0, parsed);
    const next = categories.map((category) =>
      category.id === categoryId ? { ...category, scorePercent } : category,
    );
    setCategories(next);
  }

  function finishScoreEdit(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    setScoreDrafts((currentDrafts) => ({
      ...currentDrafts,
      [categoryId]: category.scorePercent?.toString() ?? "",
    }));
    void persistScore(categoryId, category.scorePercent);
  }

  async function persistScore(categoryId: string, scorePercent: number | null) {
    if (persistence.kind !== "account") return;
    setSaveState("saving");
    try {
      const response = await fetch(
        `/api/grading-categories/${categoryId}/score`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scorePercent }),
        },
      );
      setSaveState(response.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  const weightIsComplete = Math.abs(current.totalWeightPercent - 100) < 0.01;

  return (
    <section className="mt-7" aria-labelledby="percentage-calculator-title">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="percentage-calculator-title"
            className="text-navy text-lg font-extrabold tracking-[-0.03em]"
          >
            {title}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        </div>
        <PersistenceLabel persistence={persistence} saveState={saveState} />
      </div>

      <div
        className="mb-5 grid gap-3 md:grid-cols-3"
        aria-label="Grade summary"
      >
        <MetricCard
          icon={<GraduationCap />}
          label="Current average"
          value={
            current.gradePercent == null
              ? "—"
              : `${current.gradePercent.toFixed(1)}%`
          }
          detail="Across the grade items you entered"
        />
        <MetricCard
          icon={<Calculator />}
          label="Course points"
          value={`${current.coursePoints.toFixed(1)} / 100`}
          detail="Weighted points toward your final grade"
        />
        <MetricCard
          icon={<Target />}
          label="Weight entered"
          value={`${current.representedWeightPercent.toFixed(1)}%`}
          detail={`${current.totalWeightPercent.toFixed(1)}% listed in this syllabus`}
          tone={weightIsComplete ? "default" : "warning"}
        />
      </div>

      {persistence.kind === "session" ? (
        <div className="border-ocean/20 bg-ocean/6 text-navy mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-5">
          <ShieldCheck className="text-ocean mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-bold">Private practice:</span> these scores
            stay in this calculator view and are not saved or shared with the
            course contributor or other students.
          </p>
        </div>
      ) : null}

      {!weightIsComplete && categories.length > 0 ? (
        <div className="border-orange/30 bg-orange/8 text-navy mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-5">
          <CircleAlert className="text-orange mt-0.5 size-4 shrink-0" />
          The published grade items add up to{" "}
          {current.totalWeightPercent.toFixed(1)}% instead of 100%. Calculations
          use the weights exactly as shown.
        </div>
      ) : null}

      {policyWarnings.length > 0 ? (
        <div className="mb-5">
          <PolicyNotes
            policies={policyWarnings}
            description="Saved as reference notes; not applied to grade calculations."
          />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="gap-0 self-start overflow-hidden py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)]">
          <CardHeader className="border-border border-b px-4 py-4 sm:px-5">
            <CardTitle className="text-navy text-sm font-extrabold">
              Weighted grade items
            </CardTitle>
            <p className="text-muted-foreground text-[10px]">
              Enter one percentage score per item. The weighted contribution is
              calculated automatically.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-border text-muted-foreground hidden grid-cols-[minmax(0,1fr)_90px_112px_110px] gap-4 border-b bg-[#f8faf9] px-5 py-2.5 text-[9px] font-bold tracking-[0.08em] uppercase sm:grid">
              <span>Grade item</span>
              <span className="text-center">Weight</span>
              <span className="text-center sm:-translate-x-4">Your score</span>
              <span>Course points</span>
            </div>
            {categories.length > 0 ? (
              categories.map((category, index) => {
                const contribution =
                  category.scorePercent == null
                    ? null
                    : (category.scorePercent * category.weightPercent) / 100;
                return (
                  <div
                    key={category.id}
                    className={cn(
                      "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_90px_112px_110px] sm:items-center sm:gap-4 sm:px-5",
                      index < categories.length - 1 && "border-border border-b",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-navy text-sm font-bold">
                        {category.name}
                      </p>
                      <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-ocean h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, category.weightPercent))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-center">
                      <span className="text-muted-foreground text-[9px] font-bold uppercase sm:hidden">
                        Weight
                      </span>
                      <Badge className="bg-ocean/12 text-ocean min-w-11 justify-center border-0 px-2.5 py-1 font-mono text-[11px] font-bold shadow-none">
                        {category.weightPercent}%
                      </Badge>
                    </div>
                    <div className="sm:w-[104px] sm:-translate-x-4 sm:justify-self-center">
                      <Label
                        className="text-muted-foreground mb-1.5 text-[9px] sm:sr-only"
                        htmlFor={`${category.id}-score`}
                      >
                        {category.name} score percent
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${category.id}-score`}
                          aria-label={`${category.name} score percent`}
                          aria-describedby={
                            category.scorePercent != null &&
                            category.scorePercent > 100
                              ? `${category.id}-extra-credit`
                              : undefined
                          }
                          type="text"
                          inputMode="decimal"
                          value={scoreDrafts[category.id] ?? ""}
                          onChange={(event) =>
                            updateScore(category.id, event.target.value)
                          }
                          onBlur={() => finishScoreEdit(category.id)}
                          className="h-10 w-full pr-8 font-mono text-sm font-bold"
                          placeholder="—"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold">
                          %
                        </span>
                      </div>
                      {category.scorePercent != null &&
                      category.scorePercent > 100 ? (
                        <p
                          id={`${category.id}-extra-credit`}
                          className="text-orange mt-1 text-center text-[9px] font-semibold whitespace-nowrap"
                        >
                          Extra credit entered
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between sm:block">
                      <span className="text-muted-foreground text-[9px] font-bold uppercase sm:hidden">
                        Course points
                      </span>
                      <span className="text-navy font-mono text-sm font-extrabold">
                        {contribution == null
                          ? "—"
                          : `+${contribution.toFixed(1)}`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-navy text-sm font-bold">
                  No grading weights found
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Review the syllabus extraction to add weighted grade items.
                </p>
              </div>
            )}
            {categories.length > 0 ? (
              <div className="border-border bg-muted/35 grid gap-2 border-t px-5 py-4 text-xs sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8">
                <span className="text-navy font-bold">Entered total</span>
                <span className="text-muted-foreground">
                  {current.representedWeightPercent.toFixed(1)}% weight
                </span>
                <span className="text-navy font-mono font-extrabold">
                  {current.coursePoints.toFixed(1)} course points
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <TargetGradeCard
          target={target}
          setTarget={setTarget}
          result={targetResult}
        />
      </div>
    </section>
  );
}

function PersistenceLabel({
  persistence,
  saveState,
}: {
  persistence: Persistence;
  saveState: "saved" | "saving" | "error";
}) {
  if (persistence.kind === "session") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-semibold">
        <ShieldCheck className="size-3" /> Private preview · not saved
      </span>
    );
  }
  if (persistence.kind === "none") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-semibold">
        <Calculator className="size-3" /> Demo values only
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-semibold",
        saveState === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {saveState === "saved" ? (
        <Save className="size-3" />
      ) : saveState === "saving" ? (
        <Calculator className="size-3 animate-pulse" />
      ) : (
        <CircleAlert className="size-3" />
      )}
      {saveState === "saved"
        ? "Grades saved privately"
        : saveState === "saving"
          ? "Saving…"
          : "Couldn’t save this score"}
    </span>
  );
}

function TargetGradeCard({
  target,
  setTarget,
  result,
}: {
  target: number;
  setTarget: (value: number) => void;
  result: ReturnType<typeof calculateTargetGrade>;
}) {
  return (
    <Card className="gap-0 self-start py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)] xl:sticky xl:top-6">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
          <Target className="text-ocean size-4" /> Target grade
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="target-grade">Desired final grade</Label>
            <Input
              id="target-grade"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={target}
              onChange={(event) =>
                setTarget(
                  Math.min(100, Math.max(0, Number(event.target.value))),
                )
              }
              className="h-10 font-mono font-bold"
            />
          </div>
          <span className="text-muted-foreground pb-2.5 text-sm font-bold">
            %
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={target}
          onChange={(event) => setTarget(Number(event.target.value))}
          className="accent-ocean mt-4 w-full"
          aria-label="Target grade slider"
        />
        <div
          className={cn(
            "mt-5 rounded-xl border p-4",
            result.status === "impossible"
              ? "border-orange/35 bg-orange/8"
              : result.status === "secured"
                ? "border-ocean/30 bg-ocean/8"
                : "border-sky/55 bg-sky/14",
          )}
        >
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.08em] uppercase">
            Result
          </p>
          <p className="text-navy mt-2 text-sm leading-6 font-extrabold">
            {targetMessage(result, target)}
          </p>
        </div>
        <details className="border-border bg-muted/45 text-muted-foreground mt-5 rounded-lg border p-3 text-[10px] leading-5">
          <summary className="text-navy/75 cursor-pointer font-bold">
            <CircleHelp className="text-ocean mr-1.5 inline size-3.5" /> Formula
            & assumptions
          </summary>
          <p className="mt-2">
            Each course contribution equals weight × your score. Current average
            is normalized across the items you entered. The target assumes one
            uniform average across all unfilled weight.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className="gap-0 py-0 shadow-[0_4px_18px_rgba(2,48,71,0.035)]">
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={
            tone === "warning"
              ? "bg-orange/10 text-orange grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-5"
              : "bg-sky/20 text-ocean grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-5"
          }
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[9px] font-bold tracking-[0.09em] uppercase">
            {label}
          </p>
          <p className="text-navy mt-1 font-mono text-2xl font-extrabold tracking-[-0.04em]">
            {value}
          </p>
          <p className="text-muted-foreground mt-1 truncate text-[10px]">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function targetMessage(
  result: ReturnType<typeof calculateTargetGrade>,
  target: number,
) {
  if ("reason" in result) return result.reason;
  if (result.status === "required") {
    return `Average ${result.requiredPercent.toFixed(1)}% across the unfilled grade items to finish at ${target.toFixed(1)}%.`;
  }
  if (result.status === "secured") {
    return `The ${target.toFixed(1)}% target is already secured by the scores entered.`;
  }
  return "This target is not reachable with the published weights and scores entered.";
}
