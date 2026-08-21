"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  LoaderCircle,
  LockKeyhole,
  MessageCircleQuestion,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  LearningAssistantAction,
  LearningAssistantCitation,
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
};

type ApiError = { error?: { message?: string } };

const actions: Array<{
  value: LearningAssistantAction;
  label: string;
  description: string;
}> = [
  {
    value: "question",
    label: "Ask",
    description: "Answer from selected sources",
  },
  {
    value: "explain",
    label: "Explain",
    description: "Make a concept easier to understand",
  },
  {
    value: "summary",
    label: "Summarize",
    description: "Pull out the unit’s core ideas",
  },
  {
    value: "practice",
    label: "Practice",
    description: "Create questions with hidden answers",
  },
];

function outputForNote(output: AssistantOutput) {
  if (output.action !== "practice") return output.answerMarkdown;
  return output.practiceItems
    .map(
      (item, index) =>
        `### ${index + 1}. ${item.question}\n\n**Answer**\n\n${item.answerMarkdown}`,
    )
    .join("\n\n");
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
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<LearningAssistantAction>("question");
  const [question, setQuestion] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [practiceCount, setPracticeCount] = useState<"3" | "5" | "10">("5");
  const [difficulty, setDifficulty] = useState<
    "introductory" | "standard" | "challenge"
  >("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<AssistantOutput | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTarget, setCopyTarget] =
    useState<LearningUnitNoteVisibility>("private");
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const sourceOptions = useMemo(() => {
    const options: Array<{
      key: string;
      label: string;
      detail: string;
      request:
        | { kind: "note"; visibility: LearningUnitNoteVisibility }
        | { kind: "material"; materialId: string };
    }> = [];
    if (unit.notes.public?.bodyMarkdown.trim()) {
      options.push({
        key: "note:public",
        label: "Public course note",
        detail: "Used privately for this request",
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

  function toggleSource(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((candidate) => candidate !== key)
        : [...current, key],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !enabled || demo) return;
    const sources = sourceOptions
      .filter((source) => selectedKeys.includes(source.key))
      .map((source) => source.request);
    if (!sources.length) {
      setError("Select at least one note or PDF source.");
      return;
    }
    if ((action === "question" || action === "explain") && !question.trim()) {
      setError(
        action === "question"
          ? "Enter a question first."
          : "Enter the concept you want explained.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setOutput(null);
    setCopyMessage(null);
    setRevealedAnswers([]);
    try {
      const response = await fetch(
        `/api/courses/${courseId}/learning-units/${unit.id}/ai`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            question: question.trim() || null,
            sources,
            practice:
              action === "practice"
                ? { count: Number(practiceCount), difficulty }
                : undefined,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as
        ({ output?: AssistantOutput } & ApiError) | null;
      if (!response.ok || !body?.output) {
        throw new Error(
          body?.error?.message ??
            "The Learning Assistant could not complete that request.",
        );
      }
      setOutput(body.output);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The Learning Assistant could not complete that request.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyToNote() {
    if (!output || copying) return;
    setCopying(true);
    const copied = await onCopyToNote(copyTarget, outputForNote(output));
    setCopying(false);
    if (!copied) return;
    setCopyOpen(false);
    setCopyMessage(
      copyTarget === "private"
        ? "AI draft copied to your private note."
        : "AI draft copied locally to your public note. It is not published yet.",
    );
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-5 py-4 text-left"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="learning-assistant-panel"
        >
          <span className="bg-gold/25 text-orange grid size-9 place-items-center rounded-lg">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-extrabold">
              Learning Assistant
              <Badge variant="outline" className="bg-white text-[9px]">
                Private
              </Badge>
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              Ask questions and study from selected notes or PDFs
            </span>
          </span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CardHeader>

      {open ? (
        <CardContent
          id="learning-assistant-panel"
          className="border-border space-y-5 border-t p-5"
        >
          {!enabled ? (
            <div className="border-gold/40 bg-gold/10 rounded-xl border p-4 text-sm leading-6">
              Add <code className="font-mono text-xs">OPENAI_API_KEY</code> to
              the server environment to enable private, source-grounded learning
              help. The model is fixed in code.
            </div>
          ) : null}
          {demo ? (
            <p className="text-muted-foreground text-sm">
              Learning Assistant generation is unavailable in the read-only
              demo.
            </p>
          ) : null}

          <form onSubmit={submit} className="space-y-5">
            <fieldset disabled={!enabled || demo || busy} className="space-y-3">
              <legend className="text-navy text-sm font-extrabold">
                1. Choose private sources
              </legend>
              {sourceOptions.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {sourceOptions.map((source) => {
                    const selected = selectedKeys.includes(source.key);
                    const Icon = source.key.startsWith("material:")
                      ? FileText
                      : LockKeyhole;
                    return (
                      <button
                        key={source.key}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        onClick={() => toggleSource(source.key)}
                        className={cn(
                          "border-border flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          selected
                            ? "border-ocean bg-ocean/6"
                            : "hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-8 place-items-center rounded-lg",
                            selected
                              ? "bg-ocean text-white"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {selected ? (
                            <Check className="size-4" />
                          ) : (
                            <Icon className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="text-navy block truncate text-sm font-bold">
                            {source.label}
                          </span>
                          <span className="text-muted-foreground block text-[10px]">
                            {source.detail}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm leading-6">
                  Add text to a unit note or attach a text-based PDF to use the
                  Learning Assistant.
                </p>
              )}
            </fieldset>

            <fieldset disabled={!enabled || demo || busy} className="space-y-3">
              <legend className="text-navy text-sm font-extrabold">
                2. Choose learning help
              </legend>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {actions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setAction(item.value)}
                    aria-pressed={action === item.value}
                    className={cn(
                      "border-border rounded-xl border px-3 py-2.5 text-left",
                      action === item.value
                        ? "border-ocean bg-ocean/6"
                        : "hover:bg-muted",
                    )}
                  >
                    <span className="text-navy block text-xs font-extrabold">
                      {item.label}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-[10px] leading-4">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>

              {action === "question" || action === "explain" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="learning-assistant-question">
                    {action === "question"
                      ? "Your question"
                      : "Concept to explain"}
                  </Label>
                  <Textarea
                    id="learning-assistant-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    maxLength={2000}
                    className="min-h-24"
                    placeholder={
                      action === "question"
                        ? "What does this concept mean in the selected material?"
                        : "e.g. Explain the invariant with a simple example"
                    }
                  />
                </div>
              ) : null}

              {action === "practice" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Number of questions</Label>
                    <Select
                      value={practiceCount}
                      onValueChange={(value) =>
                        setPracticeCount(value as "3" | "5" | "10")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 questions</SelectItem>
                        <SelectItem value="5">5 questions</SelectItem>
                        <SelectItem value="10">10 questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(value) =>
                        setDifficulty(value as typeof difficulty)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="introductory">
                          Introductory
                        </SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="challenge">Challenge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={!enabled || demo || busy || !sourceOptions.length}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : action === "practice" ? (
                  <BookOpenCheck className="size-4" />
                ) : (
                  <MessageCircleQuestion className="size-4" />
                )}
                {busy
                  ? "Studying selected sources…"
                  : actions.find((item) => item.value === action)?.label}
              </Button>
              <p className="text-muted-foreground text-[10px] leading-4">
                Selected excerpts are sent to OpenAI for this request. They are
                never published to Community.
              </p>
            </div>
          </form>

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
              aria-label="Learning Assistant result"
              className="border-border space-y-4 rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-navy text-sm font-extrabold">
                    Learning Assistant response
                  </p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    Generated privately from {selectedKeys.length} selected
                    source{selectedKeys.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCopyTarget("private");
                    setCopyOpen(true);
                  }}
                >
                  Copy to note
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

              {output.citations.length ? (
                <div className="border-border border-t pt-4">
                  <p className="text-muted-foreground text-[10px] font-bold tracking-[0.1em] uppercase">
                    Sources used
                  </p>
                  <div className="mt-2 grid gap-2">
                    {output.citations.map((citation) => {
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
                          className="border-border rounded-lg border p-3"
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
                                className="text-ocean inline-flex items-center gap-1 text-[10px] font-bold hover:underline"
                              >
                                Open <ExternalLink className="size-3" />
                              </a>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground mt-1.5 line-clamp-3 text-[11px] leading-5">
                            “{citation.quote}”
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </CardContent>
      ) : null}

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy this AI draft to a note?</DialogTitle>
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
              Copy draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
