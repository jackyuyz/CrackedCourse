"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { SafeMarkdown } from "@/components/safe-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type {
  LearningAssistantAction,
  LearningAssistantCitation,
  LearningAssistantRequest,
} from "@/lib/learning-ai";
import type {
  CourseMaterial,
  LearningUnit,
  LearningUnitNoteVisibility,
} from "@/lib/learning-units";
import { cn } from "@/lib/utils";

type AssistantOutput = {
  id: string;
  action: LearningAssistantAction;
  answerMarkdown: string;
  practiceItems: Array<{
    question: string;
    answerMarkdown: string;
    citationChunkIds: string[];
  }>;
  citations: LearningAssistantCitation[];
  insufficiency: string | null;
  model: string;
  sourceCount?: number;
  completedAt?: string | null;
};

type ApiError = { error?: { message?: string } };
type GuideState =
  | "loading"
  | "empty"
  | "missing"
  | "generating"
  | "current"
  | "stale"
  | "failed";

type GuidePayload = {
  guide: AssistantOutput | null;
  state: Exclude<GuideState, "loading">;
  defaultSources: LearningAssistantRequest["sources"];
};

function sourceKey(source: LearningAssistantRequest["sources"][number]) {
  return source.kind === "note"
    ? `note:${source.visibility}`
    : `material:${source.materialId}`;
}

function outputForNote(output: AssistantOutput) {
  if (output.action !== "practice") return output.answerMarkdown;
  return output.practiceItems
    .map(
      (item, index) =>
        `### ${index + 1}. ${item.question}\n\n**Answer**\n\n${item.answerMarkdown}`,
    )
    .join("\n\n");
}

function generatedLabel(value: string | null | undefined) {
  if (!value) return "Saved privately";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved privately";
  return `Saved ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function CitationList({
  citations,
  courseId,
}: {
  citations: LearningAssistantCitation[];
  courseId: string;
}) {
  if (!citations.length) return null;
  return (
    <details className="border-border border-t pt-4">
      <summary className="text-muted-foreground hover:text-navy cursor-pointer text-xs font-bold">
        Sources used ({citations.length})
      </summary>
      <div className="mt-3 grid gap-2">
        {citations.map((citation) => {
          const materialId =
            citation.sourceKind === "material"
              ? citation.sourceId.replace(/^material:/, "")
              : null;
          const locator = citation.pageNumber
            ? `p. ${citation.pageNumber}`
            : `paragraph ${citation.noteParagraph}`;
          return (
            <div
              key={citation.chunkId}
              className="border-border rounded-lg border bg-white p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-navy text-xs font-bold">
                  {citation.sourceTitle} · {locator}
                </p>
                {materialId ? (
                  <a
                    href={`/api/courses/${courseId}/materials/${materialId}/open#page=${citation.pageNumber ?? 1}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ocean inline-flex items-center gap-1 text-xs font-bold hover:underline"
                  >
                    Open <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-1.5 line-clamp-3 text-xs leading-5">
                “{citation.quote}”
              </p>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function LearningAssistant({
  courseId,
  unit,
  materials,
  demo,
  enabled,
  onCopyToNote,
}: {
  courseId: string;
  unit: LearningUnit;
  materials: CourseMaterial[];
  demo: boolean;
  enabled: boolean;
  onCopyToNote: (
    visibility: LearningUnitNoteVisibility,
    markdown: string,
  ) => Promise<boolean>;
}) {
  const [guideState, setGuideState] = useState<GuideState>("loading");
  const [guide, setGuide] = useState<AssistantOutput | null>(null);
  const [guideSources, setGuideSources] = useState<
    LearningAssistantRequest["sources"]
  >([]);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [guideOpen, setGuideOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<LearningAssistantAction | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<AssistantOutput | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);
  const [copyOutput, setCopyOutput] = useState<AssistantOutput | null>(null);
  const [copyTarget, setCopyTarget] =
    useState<LearningUnitNoteVisibility>("private");
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const endpoint = `/api/courses/${courseId}/learning-units/${unit.id}/ai`;
  const sourceOptions = useMemo(() => {
    const options: Array<{
      key: string;
      label: string;
      detail: string;
      request: LearningAssistantRequest["sources"][number];
    }> = [];
    if (unit.notes.public?.bodyMarkdown.trim()) {
      options.push({
        key: "note:public",
        label: "Public course note",
        detail: "Used privately by AI",
        request: { kind: "note", visibility: "public" },
      });
    }
    if (unit.notes.private?.bodyMarkdown.trim()) {
      options.push({
        key: "note:private",
        label: "Private note",
        detail: "Never shared with Community",
        request: { kind: "note", visibility: "private" },
      });
    }
    for (const material of materials) {
      if (
        !material.isHidden &&
        material.learningUnitId === unit.id &&
        material.kind === "file" &&
        material.materialType === "pdf"
      ) {
        options.push({
          key: `material:${material.id}`,
          label: material.title,
          detail: "Text-based PDF",
          request: { kind: "material", materialId: material.id },
        });
      }
    }
    return options;
  }, [materials, unit]);

  const sourceRevision = useMemo(
    () =>
      [
        unit.notes.public?.updatedAt ?? "",
        unit.notes.private?.updatedAt ?? "",
        ...materials
          .filter(
            (material) =>
              material.learningUnitId === unit.id &&
              !material.isHidden &&
              material.materialType === "pdf",
          )
          .map((material) => material.id),
      ].join("|"),
    [materials, unit],
  );

  const generateGuide = useCallback(
    async (sources: LearningAssistantRequest["sources"]) => {
      if (!enabled || demo || !sources.length) return;
      setGuideState("generating");
      setGuideError(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "summary",
            question: null,
            sources,
            intent: "unit-guide",
          }),
        });
        const body = (await response.json().catch(() => null)) as
          ({ output?: AssistantOutput; status?: string } & ApiError) | null;
        if (response.status === 202 && body?.status === "running") return;
        if (!response.ok || !body?.output) {
          throw new Error(
            body?.error?.message ?? "We couldn’t create this study guide.",
          );
        }
        setGuide(body.output);
        setGuideState("current");
      } catch (caught) {
        setGuideState("failed");
        setGuideError(
          caught instanceof Error
            ? caught.message
            : "We couldn’t create this study guide.",
        );
      }
    },
    [demo, enabled, endpoint],
  );

  const loadGuide = useCallback(async () => {
    if (!enabled || demo) return;
    setGuideError(null);
    setGuideState((current) =>
      current === "current" || current === "stale" ? current : "loading",
    );
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as
        (GuidePayload & ApiError) | null;
      if (!response.ok || !body) {
        throw new Error(
          body?.error?.message ?? "We couldn’t load this study guide.",
        );
      }
      setGuideSources(body.defaultSources);
      setSelectedKeys((current) =>
        current.length ? current : body.defaultSources.map(sourceKey),
      );
      setGuide(body.guide);
      setGuideState(body.state);
      if (body.state === "missing") {
        await generateGuide(body.defaultSources);
      }
    } catch (caught) {
      setGuideState("failed");
      setGuideError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t load this study guide.",
      );
    }
  }, [demo, enabled, endpoint, generateGuide]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGuide(), 0);
    return () => window.clearTimeout(timer);
  }, [loadGuide, sourceRevision]);

  useEffect(() => {
    if (guideState !== "generating") return;
    const timer = window.setTimeout(() => void loadGuide(), 2500);
    return () => window.clearTimeout(timer);
  }, [guideState, loadGuide]);

  function toggleSource(key: string) {
    setSelectedKeys((current) => {
      if (current.includes(key)) {
        return current.filter((candidate) => candidate !== key);
      }
      if (
        key.startsWith("material:") &&
        current.filter((candidate) => candidate.startsWith("material:"))
          .length >= 3
      ) {
        setError("Choose no more than three PDF sources.");
        return current;
      }
      setError(null);
      return [...current, key];
    });
  }

  const runAssistant = useCallback(
    async (input: {
      action: "question" | "explain" | "practice";
      question?: string;
    }) => {
      if (busyAction || !enabled || demo) return;
      const sources = sourceOptions
        .filter((source) => selectedKeys.includes(source.key))
        .map((source) => source.request);
      if (!sources.length) {
        setError("Choose at least one note or PDF source.");
        setSourcesOpen(true);
        return;
      }
      if (input.action !== "practice" && !input.question?.trim()) {
        setError("Ask a question about this unit first.");
        return;
      }

      setBusyAction(input.action);
      setError(null);
      setOutput(null);
      setCopyMessage(null);
      setRevealedAnswers([]);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: input.action,
            question: input.question?.trim() || null,
            sources,
            practice:
              input.action === "practice"
                ? { count: 5, difficulty: "standard" }
                : undefined,
          }),
        });
        const body = (await response.json().catch(() => null)) as
          ({ output?: AssistantOutput } & ApiError) | null;
        if (!response.ok || !body?.output) {
          throw new Error(
            body?.error?.message ??
              "The Learning Assistant could not complete that request.",
          );
        }
        setOutput(body.output);
        if (input.action === "question") setQuestion("");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The Learning Assistant could not complete that request.",
        );
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, demo, enabled, endpoint, selectedKeys, sourceOptions],
  );

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAssistant({ action: "question", question });
  }

  async function copyToNote() {
    if (!copyOutput || copying) return;
    setCopying(true);
    const copied = await onCopyToNote(copyTarget, outputForNote(copyOutput));
    setCopying(false);
    if (!copied) return;
    setCopyOutput(null);
    setCopyMessage(
      copyTarget === "private"
        ? "AI draft added to your private note."
        : "AI draft added locally to your public note. It is not published yet.",
    );
  }

  const selectedSourceCount = selectedKeys.length;
  const busy = busyAction !== null;

  return (
    <Card className="border-ocean/20 gap-0 overflow-hidden py-0">
      <CardHeader
        className={cn(
          "border-border bg-ocean/[0.035] flex flex-row items-start gap-3 px-5 py-4",
          guideOpen && "border-b",
        )}
      >
        <span className="bg-gold/25 text-orange grid size-9 shrink-0 place-items-center rounded-lg">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-navy text-sm font-extrabold">AI Study Guide</h2>
            <Badge variant="outline" className="bg-white text-[10px]">
              <LockKeyhole className="size-3" /> Private
            </Badge>
            {guideState === "stale" ? (
              <Badge className="border-gold/50 bg-gold/15 text-navy text-[10px]">
                Materials updated
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {guide
              ? `${generatedLabel(guide.completedAt)} · Based on ${guide.sourceCount ?? guideSources.length} source${(guide.sourceCount ?? guideSources.length) === 1 ? "" : "s"}`
              : "A private, source-grounded overview of this learning unit"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {guide && guideState === "stale" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void generateGuide(guideSources)}
              disabled={!enabled || demo}
            >
              <RefreshCw className="size-3.5" />
              Update
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={
              guideOpen ? "Collapse AI Study Guide" : "Expand AI Study Guide"
            }
            aria-expanded={guideOpen}
            aria-controls={`ai-study-guide-${unit.id}`}
            onClick={() => setGuideOpen((current) => !current)}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                guideOpen && "rotate-180",
              )}
            />
          </Button>
        </div>
      </CardHeader>

      {guideOpen ? (
        <CardContent id={`ai-study-guide-${unit.id}`} className="space-y-5 p-5">
          {!enabled ? (
            <div className="border-gold/40 bg-gold/10 rounded-xl border p-4 text-sm leading-6">
              Add <code className="font-mono text-xs">OPENAI_API_KEY</code> to
              the server environment to enable the private AI Study Guide.
            </div>
          ) : demo ? (
            <p className="text-muted-foreground text-sm">
              AI Study Guide generation is unavailable in the read-only demo.
            </p>
          ) : null}

          {enabled && !demo ? (
            <div aria-live="polite" aria-busy={guideState === "generating"}>
              {guideState === "loading" || guideState === "generating" ? (
                <div role="status" className="space-y-4 py-2">
                  <div className="text-navy flex items-center gap-2 text-sm font-bold">
                    <LoaderCircle className="text-ocean size-4 animate-spin" />
                    {guideState === "loading"
                      ? "Checking for a saved study guide…"
                      : "Reading this unit and creating its study guide…"}
                  </div>
                  {guideState === "generating" ? (
                    <p className="text-muted-foreground text-xs leading-5">
                      Eligible source excerpts are sent to OpenAI for this
                      private guide. The saved result is never published to
                      Community.
                    </p>
                  ) : null}
                  <div className="space-y-2" aria-hidden="true">
                    <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-full animate-pulse rounded" />
                    <div className="bg-muted h-3 w-5/6 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
                  </div>
                </div>
              ) : null}

              {guideState === "empty" ? (
                <div className="border-border rounded-xl border border-dashed p-5 text-center">
                  <FileText className="text-ocean mx-auto size-5" />
                  <p className="text-navy mt-3 text-sm font-bold">
                    Add something for AI to study
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-md text-xs leading-5">
                    Write a public or private note, or attach a text-based PDF.
                    The guide will be created the next time this unit is opened.
                  </p>
                </div>
              ) : null}

              {guide ? (
                <section
                  aria-label="Saved AI study guide"
                  className="space-y-4"
                >
                  {guideState === "stale" ? (
                    <div className="border-gold/40 bg-gold/10 rounded-xl border px-4 py-3 text-xs leading-5">
                      This saved guide is still available, but its sources have
                      changed. Use <strong>Update</strong> above when you want a
                      new interpretation.
                    </div>
                  ) : null}
                  {guide.insufficiency ? (
                    <div className="border-gold/40 bg-gold/10 rounded-lg border p-3 text-sm leading-6">
                      {guide.insufficiency}
                    </div>
                  ) : null}
                  <SafeMarkdown markdown={guide.answerMarkdown} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCopyOutput(guide)}
                    >
                      Add to note
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      Review AI-generated content before using it in your notes.
                    </p>
                  </div>
                  <CitationList
                    citations={guide.citations}
                    courseId={courseId}
                  />
                </section>
              ) : null}

              {guideState === "failed" ? (
                <div
                  role="alert"
                  className="border-destructive/30 bg-destructive/5 rounded-xl border p-4"
                >
                  <p className="text-destructive text-sm font-bold">
                    The study guide isn’t available yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {guideError ?? "Try creating it again."}
                  </p>
                  {guideSources.length ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => void generateGuide(guideSources)}
                    >
                      <RefreshCw className="size-3.5" /> Try again
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {guide && enabled && !demo ? (
            <section className="border-border space-y-3 border-t pt-5">
              <div>
                <h3 className="text-navy text-sm font-extrabold">
                  Ask about this unit
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  The selected notes and PDFs stay private to this request.
                </p>
              </div>
              <form onSubmit={submitQuestion} className="flex items-end gap-2">
                <Textarea
                  aria-label="Question about this learning unit"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  maxLength={2000}
                  className="min-h-20 flex-1"
                  placeholder="Ask anything about this unit…"
                  disabled={busy}
                />
                <Button type="submit" disabled={busy || !question.trim()}>
                  {busyAction === "question" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <MessageCircleQuestion className="size-4" />
                  )}
                  Ask
                </Button>
              </form>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void runAssistant({
                      action: "explain",
                      question:
                        "Explain the most difficult idea in this unit in simple language.",
                    })
                  }
                >
                  {busyAction === "explain" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Lightbulb className="size-3.5" />
                  )}
                  Explain simply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void runAssistant({
                      action: "explain",
                      question:
                        "Give me one simple worked example of a central idea in this unit. Clearly label any details you create for the example.",
                    })
                  }
                >
                  Give an example
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void runAssistant({ action: "practice" })}
                >
                  {busyAction === "practice" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <BookOpenCheck className="size-3.5" />
                  )}
                  Quiz me
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-expanded={sourcesOpen}
                  aria-controls={`ai-sources-${unit.id}`}
                  onClick={() => setSourcesOpen((current) => !current)}
                >
                  Sources ({selectedSourceCount})
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      sourcesOpen && "rotate-180",
                    )}
                  />
                </Button>
              </div>

              {sourcesOpen ? (
                <fieldset
                  id={`ai-sources-${unit.id}`}
                  disabled={busy}
                  className="border-border rounded-xl border p-3"
                >
                  <legend className="text-navy px-1 text-xs font-bold">
                    Sources for follow-up questions
                  </legend>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {sourceOptions.map((source) => {
                      const selected = selectedKeys.includes(source.key);
                      return (
                        <button
                          key={source.key}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          onClick={() => toggleSource(source.key)}
                          className={cn(
                            "border-border flex items-center gap-3 rounded-lg border p-3 text-left",
                            selected
                              ? "border-ocean bg-ocean/6"
                              : "hover:bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-md",
                              selected
                                ? "bg-ocean text-white"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {selected ? (
                              <Check className="size-3.5" />
                            ) : source.key.startsWith("material:") ? (
                              <FileText className="size-3.5" />
                            ) : (
                              <LockKeyhole className="size-3.5" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="text-navy block truncate text-xs font-bold">
                              {source.label}
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs">
                              {source.detail}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Up to three PDFs can be used in one request.
                  </p>
                </fieldset>
              ) : null}
            </section>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm"
            >
              {error}
            </div>
          ) : null}
          {copyMessage ? (
            <div className="border-ocean/20 bg-ocean/6 text-navy rounded-xl border px-4 py-3 text-sm">
              {copyMessage}
            </div>
          ) : null}

          {output ? (
            <section
              aria-label="Learning Assistant response"
              aria-live="polite"
              className="border-border space-y-4 rounded-xl border bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-navy text-sm font-extrabold">
                    {output.action === "practice"
                      ? "Practice questions"
                      : "Learning Assistant response"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Grounded in {selectedSourceCount} selected source
                    {selectedSourceCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCopyOutput(output)}
                >
                  Add to note
                </Button>
              </div>

              {output.insufficiency ? (
                <div className="border-gold/40 bg-gold/10 rounded-lg border p-3 text-sm leading-6">
                  {output.insufficiency}
                </div>
              ) : null}
              {output.answerMarkdown ? (
                <SafeMarkdown markdown={output.answerMarkdown} />
              ) : null}

              {output.practiceItems.length ? (
                <ol className="space-y-3">
                  {output.practiceItems.map((item, index) => {
                    const revealed = revealedAnswers.includes(index);
                    return (
                      <li key={index} className="bg-muted/45 rounded-xl p-4">
                        <p className="text-navy text-sm font-bold">
                          {index + 1}. {item.question}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          aria-expanded={revealed}
                          onClick={() =>
                            setRevealedAnswers((current) =>
                              revealed
                                ? current.filter((value) => value !== index)
                                : [...current, index],
                            )
                          }
                        >
                          {revealed ? "Hide answer" : "Reveal answer"}
                        </Button>
                        {revealed ? (
                          <SafeMarkdown
                            markdown={item.answerMarkdown}
                            className="border-border mt-3 border-t pt-3"
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
              <CitationList citations={output.citations} courseId={courseId} />
            </section>
          ) : null}
        </CardContent>
      ) : null}

      <Dialog
        open={Boolean(copyOutput)}
        onOpenChange={(open) => {
          if (!open) setCopyOutput(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add this AI draft to a note?</DialogTitle>
            <DialogDescription>
              Review and edit generated content after copying. Nothing is
              published automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={copyTarget === "private" ? "default" : "outline"}
              onClick={() => setCopyTarget("private")}
            >
              <LockKeyhole className="size-4" /> Private note
            </Button>
            <Button
              type="button"
              variant={copyTarget === "public" ? "default" : "outline"}
              onClick={() => setCopyTarget("public")}
            >
              Public note
            </Button>
          </div>
          {copyTarget === "public" ? (
            <p className="border-gold/40 bg-gold/10 rounded-lg border p-3 text-xs leading-5">
              This adds a local draft to the public-note editor. It appears in
              Community only after you separately update the public snapshot.
            </p>
          ) : null}
          <DialogFooter showCloseButton>
            <Button
              type="button"
              onClick={() => void copyToNote()}
              disabled={copying}
            >
              {copying ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Add draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
