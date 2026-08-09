"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  GraduationCap,
  Plus,
  Save,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  GradeWorkspaceCategory,
  GradeWorkspaceData,
} from "@/lib/data/grades";
import {
  calculateCurrentGrade,
  calculateTargetGrade,
  type GradeCategory,
} from "@/lib/grades/calculations";
import { cn } from "@/lib/utils";

export function GradeCalculator({
  initialData,
  demo,
}: {
  initialData: GradeWorkspaceData;
  demo: boolean;
}) {
  const [categories, setCategories] = useState(initialData.categories);
  const [target, setTarget] = useState(90);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );

  const calculationCategories: GradeCategory[] = useMemo(
    () =>
      categories.map((category) => ({
        name: category.name,
        weightPercent: category.weightPercent,
        isComplete: category.isComplete,
        assessments: category.assessments.map((assessment) => ({
          earnedPoints: assessment.earnedPoints,
          maxPoints: assessment.maxPoints,
          expectedPercent: assessment.expectedPercent,
          status: assessment.status,
        })),
      })),
    [categories],
  );
  const current = calculateCurrentGrade(calculationCategories);
  const targetResult = calculateTargetGrade(calculationCategories, target);

  function updateLocal(
    categoryId: string,
    assessmentId: string,
    field: "earnedPoints" | "maxPoints",
    raw: string,
  ) {
    const value = raw === "" ? null : Number(raw);
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id !== categoryId
          ? category
          : {
              ...category,
              assessments: category.assessments.map((assessment) => {
                if (assessment.id !== assessmentId) return assessment;
                const next = { ...assessment, [field]: value };
                next.status =
                  next.earnedPoints != null && next.maxPoints != null
                    ? "graded"
                    : "planned";
                return next;
              }),
            },
      ),
    );
  }

  async function persist(
    category: GradeWorkspaceCategory,
    assessmentId: string,
  ) {
    if (demo) return;
    const assessment = category.assessments.find(
      (item) => item.id === assessmentId,
    );
    if (!assessment) return;
    if (
      assessment.earnedPoints != null &&
      assessment.maxPoints != null &&
      assessment.earnedPoints > assessment.maxPoints
    ) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    const response = await fetch(`/api/assessments/${assessment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        earnedPoints: assessment.earnedPoints,
        maxPoints: assessment.maxPoints,
        status: assessment.status,
      }),
    });
    setSaveState(response.ok ? "saved" : "error");
  }

  function addAssessment(categoryId: string) {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              assessments: [
                ...category.assessments,
                {
                  id: `local-${crypto.randomUUID()}`,
                  name: `New ${category.name} item`,
                  earnedPoints: null,
                  maxPoints: null,
                  expectedPercent: null,
                  status: "planned" as const,
                },
              ],
            }
          : category,
      ),
    );
  }

  return (
    <div className="mt-7">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-navy text-lg font-extrabold tracking-[-0.03em]">
            Grade calculator
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Weighted by the categories confirmed from this syllabus.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-semibold",
            saveState === "error"
              ? "text-destructive"
              : "text-muted-foreground",
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
            ? "Grades saved"
            : saveState === "saving"
              ? "Saving…"
              : "Check the grade values"}
        </span>
      </div>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Grade summary">
        <MetricCard
          icon={<GraduationCap />}
          label="Current grade"
          value={
            current.gradePercent == null
              ? "—"
              : `${current.gradePercent.toFixed(1)}%`
          }
          detail="Normalized across graded categories"
        />
        <MetricCard
          icon={<CheckCircle2 />}
          label="Course weight graded"
          value={`${current.representedWeightPercent.toFixed(1)}%`}
          detail="Ungraded work is not treated as zero"
        />
        <MetricCard
          icon={<Target />}
          label={`Needed for ${target}%`}
          value={targetMetric(targetResult)}
          detail={targetDetail(targetResult)}
          tone={targetResult.status === "impossible" ? "warning" : "default"}
        />
      </section>

      {initialData.policyWarnings.length > 0 ? (
        <details className="border-gold/40 bg-gold/10 group mt-5 overflow-hidden rounded-xl border">
          <summary className="focus-visible:ring-gold/40 flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="bg-gold/20 text-navy grid size-8 shrink-0 place-items-center rounded-lg">
                <AlertTriangle className="size-4 text-[#8a6200]" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-navy text-xs font-extrabold">
                    Unsupported policies
                  </span>
                  <Badge
                    variant="outline"
                    className="border-gold/45 bg-white/65 font-mono text-[9px]"
                  >
                    {initialData.policyWarnings.length}
                  </Badge>
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-[10px]">
                  Saved as reference notes; not applied to grade calculations.
                </span>
              </span>
            </span>
            <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-[10px] font-bold">
              <span className="hidden sm:inline">View policies</span>
              <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-gold/30 border-t bg-white/35">
            <ol className="max-h-[420px] divide-y divide-[#eadba9] overflow-y-auto">
              {initialData.policyWarnings.map((warning, index) => (
                <li
                  key={`${index}-${warning}`}
                  className="flex gap-3 px-4 py-3.5"
                >
                  <span className="border-gold/45 text-navy/70 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border bg-white/70 font-mono text-[9px] font-bold">
                    {index + 1}
                  </span>
                  <p className="text-muted-foreground text-xs leading-5">
                    {warning}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </details>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="gap-0 py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)]"
            >
              <CardHeader className="border-border flex-row items-center justify-between border-b px-4 py-4 sm:px-5">
                <div>
                  <CardTitle className="text-navy text-sm font-extrabold">
                    {category.name}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    Points within category
                  </p>
                </div>
                <Badge className="bg-ocean/10 text-ocean border-0 font-mono text-[10px] shadow-none">
                  {category.weightPercent}%
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-border text-muted-foreground hidden grid-cols-[minmax(0,1fr)_100px_100px_90px] gap-3 border-b bg-[#f8faf9] px-5 py-2.5 text-[9px] font-bold tracking-[0.08em] uppercase sm:grid">
                  <span>Assessment</span>
                  <span>Earned</span>
                  <span>Possible</span>
                  <span>Status</span>
                </div>
                {category.assessments.map((assessment, index) => {
                  const invalid =
                    assessment.earnedPoints != null &&
                    assessment.maxPoints != null &&
                    assessment.earnedPoints > assessment.maxPoints;
                  return (
                    <div
                      key={assessment.id}
                      className={cn(
                        "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_100px_100px_90px] sm:items-center sm:px-5",
                        index < category.assessments.length - 1 &&
                          "border-border border-b",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-navy truncate text-xs font-bold">
                          {assessment.name}
                        </p>
                        <p className="text-muted-foreground mt-1 text-[9px] sm:hidden">
                          {assessment.status === "graded"
                            ? "Graded"
                            : "Planned"}
                        </p>
                      </div>
                      <div>
                        <Label
                          className="text-muted-foreground mb-1.5 text-[9px] sm:sr-only"
                          htmlFor={`${assessment.id}-earned`}
                        >
                          Earned points
                        </Label>
                        <Input
                          id={`${assessment.id}-earned`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={assessment.earnedPoints ?? ""}
                          onChange={(event) =>
                            updateLocal(
                              category.id,
                              assessment.id,
                              "earnedPoints",
                              event.target.value,
                            )
                          }
                          onBlur={() => persist(category, assessment.id)}
                          className={cn(
                            "h-8 font-mono text-xs",
                            invalid && "border-destructive",
                          )}
                          placeholder="—"
                        />
                      </div>
                      <div>
                        <Label
                          className="text-muted-foreground mb-1.5 text-[9px] sm:sr-only"
                          htmlFor={`${assessment.id}-max`}
                        >
                          Maximum points
                        </Label>
                        <Input
                          id={`${assessment.id}-max`}
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={assessment.maxPoints ?? ""}
                          onChange={(event) =>
                            updateLocal(
                              category.id,
                              assessment.id,
                              "maxPoints",
                              event.target.value,
                            )
                          }
                          onBlur={() => persist(category, assessment.id)}
                          className={cn(
                            "h-8 font-mono text-xs",
                            invalid && "border-destructive",
                          )}
                          placeholder="—"
                        />
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          assessment.status === "graded"
                            ? "border-ocean/20 bg-ocean/8 text-ocean hidden w-fit text-[9px] sm:inline-flex"
                            : "text-muted-foreground hidden w-fit bg-white text-[9px] sm:inline-flex"
                        }
                      >
                        {assessment.status}
                      </Badge>
                      {invalid ? (
                        <p className="text-destructive col-span-full text-[10px] font-semibold">
                          Earned points cannot exceed the maximum in P0.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                <div className="border-border border-t p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => addAssessment(category.id)}
                  >
                    <Plus className="size-3.5" /> Add assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <aside className="space-y-5">
          <Card className="gap-0 py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)] xl:sticky xl:top-6">
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
                  targetResult.status === "impossible"
                    ? "border-orange/35 bg-orange/8"
                    : targetResult.status === "secured"
                      ? "border-ocean/30 bg-ocean/8"
                      : "border-sky/55 bg-sky/14",
                )}
              >
                <p className="text-muted-foreground text-[10px] font-bold tracking-[0.08em] uppercase">
                  Result
                </p>
                <p className="text-navy mt-2 text-sm leading-6 font-extrabold">
                  {targetMessage(targetResult, target)}
                </p>
              </div>
              <details className="border-border bg-muted/45 text-muted-foreground mt-5 rounded-lg border p-3 text-[10px] leading-5">
                <summary className="text-navy/75 cursor-pointer font-bold">
                  <CircleHelp className="text-ocean mr-1.5 inline size-3.5" />{" "}
                  Formula & assumptions
                </summary>
                <p className="mt-2">
                  Current grade includes only categories with graded work. The
                  target solves for one uniform average across remaining
                  supported weight. Rounding happens only for display.
                </p>
              </details>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
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

function targetMetric(result: ReturnType<typeof calculateTargetGrade>) {
  if (result.status === "required")
    return `${result.requiredPercent.toFixed(1)}%`;
  if (result.status === "secured") return "Secured";
  if (result.status === "impossible") return "Not reachable";
  return "Need details";
}

function targetDetail(result: ReturnType<typeof calculateTargetGrade>) {
  if ("reason" in result) return result.reason;
  if (result.status === "required") return "Average needed on remaining work";
  if (result.status === "secured") return "Under the current assumptions";
  if (result.status === "impossible")
    return "Without extra credit or policy effects";
  return "Add the remaining point values to calculate an exact target.";
}

function targetMessage(
  result: ReturnType<typeof calculateTargetGrade>,
  target: number,
) {
  if ("reason" in result) return result.reason;
  if (result.status === "required")
    return `Average ${result.requiredPercent.toFixed(1)}% across the remaining supported work to finish at ${target.toFixed(1)}%.`;
  if (result.status === "secured")
    return `The ${target.toFixed(1)}% target is already secured under the current assumptions.`;
  if (result.status === "impossible")
    return `This target is not reachable without extra credit or unsupported policy effects.`;
  return "Add the remaining point values to calculate an exact target.";
}
