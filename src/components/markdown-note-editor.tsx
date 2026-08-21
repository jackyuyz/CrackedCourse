"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  PencilLine,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

import { SafeMarkdown } from "@/components/safe-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type EditorView = "edit" | "preview";
type EditKind = "typing" | "format";

type MarkdownNoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength: number;
  statusLabel?: string;
};

type ToolbarButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: ToolbarButtonProps) {
  function preserveSelection(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={preserveSelection}
      onClick={onClick}
      className="text-muted-foreground hover:text-navy"
    >
      {children}
    </Button>
  );
}

export function MarkdownNoteEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder,
  maxLength,
  statusLabel,
}: MarkdownNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastEdit = useRef<{ kind: EditKind; at: number } | null>(null);
  const lastEmittedValue = useRef(value);
  const [view, setView] = useState<EditorView>("edit");
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });

  function syncHistoryState() {
    setHistoryState({
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    });
  }

  useEffect(() => {
    if (value === lastEmittedValue.current) return;
    undoStack.current = [];
    redoStack.current = [];
    lastEdit.current = null;
    lastEmittedValue.current = value;
    syncHistoryState();
  }, [value]);

  function pushUndo(previousValue: string) {
    undoStack.current.push(previousValue);
    if (undoStack.current.length > 100) undoStack.current.shift();
  }

  function commitValue(nextValue: string, kind: EditKind) {
    if (nextValue === value || nextValue.length > maxLength) return false;
    const now = Date.now();
    const shouldGroupTyping =
      kind === "typing" &&
      lastEdit.current?.kind === "typing" &&
      now - lastEdit.current.at < 900;
    if (!shouldGroupTyping) pushUndo(value);
    redoStack.current = [];
    lastEdit.current = { kind, at: now };
    lastEmittedValue.current = nextValue;
    onChange(nextValue);
    syncHistoryState();
    return true;
  }

  function restoreSelection(start: number, end: number) {
    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    }, 0);
  }

  function selection() {
    const textarea = textareaRef.current;
    return {
      start: textarea?.selectionStart ?? value.length,
      end: textarea?.selectionEnd ?? value.length,
    };
  }

  function wrapSelection(prefix: string, suffix: string, fallback: string) {
    const { start, end } = selection();
    const selected = value.slice(start, end) || fallback;
    const nextValue =
      value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    if (!commitValue(nextValue, "format")) return;
    restoreSelection(
      start + prefix.length,
      start + prefix.length + selected.length,
    );
  }

  function prefixSelectedLines(prefix: string, ordered = false) {
    const { start, end } = selection();
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextLineBreak = value.indexOf("\n", end);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const selectedLines = value.slice(lineStart, lineEnd).split("\n");
    const formatted = selectedLines
      .map((line, index) => `${ordered ? `${index + 1}. ` : prefix}${line}`)
      .join("\n");
    const nextValue =
      value.slice(0, lineStart) + formatted + value.slice(lineEnd);
    if (!commitValue(nextValue, "format")) return;
    restoreSelection(lineStart, lineStart + formatted.length);
  }

  function insertLink() {
    const { start, end } = selection();
    const selected = value.slice(start, end) || "link text";
    const prefix = "[";
    const middle = "](https://)";
    const nextValue =
      value.slice(0, start) + prefix + selected + middle + value.slice(end);
    if (!commitValue(nextValue, "format")) return;
    if (end > start) {
      const urlStart = start + prefix.length + selected.length + 2;
      restoreSelection(urlStart, urlStart + "https://".length);
    } else {
      restoreSelection(start + 1, start + 1 + selected.length);
    }
  }

  function insertCode() {
    const { start, end } = selection();
    const selected = value.slice(start, end);
    if (selected.includes("\n")) {
      wrapSelection("```\n", "\n```", selected || "code");
      return;
    }
    wrapSelection("`", "`", selected || "code");
  }

  function undo() {
    const previous = undoStack.current.pop();
    if (previous === undefined) return;
    redoStack.current.push(value);
    lastEdit.current = null;
    lastEmittedValue.current = previous;
    onChange(previous);
    syncHistoryState();
    restoreSelection(previous.length, previous.length);
  }

  function redo() {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    pushUndo(value);
    lastEdit.current = null;
    lastEmittedValue.current = next;
    onChange(next);
    syncHistoryState();
    restoreSelection(next.length, next.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLocaleLowerCase("en-US");
    if (key === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "bold text");
    } else if (key === "i") {
      event.preventDefault();
      wrapSelection("_", "_", "italic text");
    } else if (key === "z" && event.shiftKey) {
      event.preventDefault();
      redo();
    } else if (key === "z") {
      event.preventDefault();
      undo();
    } else if (key === "y") {
      event.preventDefault();
      redo();
    }
  }

  return (
    <div className="border-border overflow-hidden rounded-xl border bg-white">
      <div
        role="toolbar"
        aria-label="Markdown formatting"
        className="border-border bg-muted/25 flex flex-wrap items-center gap-1 border-b p-1.5"
      >
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            label="Heading"
            disabled={disabled || view !== "edit"}
            onClick={() => prefixSelectedLines("## ")}
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Bold (⌘B)"
            disabled={disabled || view !== "edit"}
            onClick={() => wrapSelection("**", "**", "bold text")}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic (⌘I)"
            disabled={disabled || view !== "edit"}
            onClick={() => wrapSelection("_", "_", "italic text")}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Highlight"
            disabled={disabled || view !== "edit"}
            onClick={() => wrapSelection("==", "==", "highlighted text")}
          >
            <Highlighter className="size-4" />
          </ToolbarButton>
        </div>

        <span className="bg-border mx-0.5 h-5 w-px" aria-hidden="true" />

        <div className="flex items-center gap-0.5">
          <ToolbarButton
            label="Bulleted list"
            disabled={disabled || view !== "edit"}
            onClick={() => prefixSelectedLines("- ")}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            disabled={disabled || view !== "edit"}
            onClick={() => prefixSelectedLines("", true)}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            disabled={disabled || view !== "edit"}
            onClick={() => prefixSelectedLines("> ")}
          >
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Code"
            disabled={disabled || view !== "edit"}
            onClick={insertCode}
          >
            <Code2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Insert link"
            disabled={disabled || view !== "edit"}
            onClick={insertLink}
          >
            <Link className="size-4" />
          </ToolbarButton>
        </div>

        <span className="bg-border mx-0.5 h-5 w-px" aria-hidden="true" />

        <div className="flex items-center gap-0.5">
          <ToolbarButton
            label="Undo"
            disabled={disabled || view !== "edit" || !historyState.canUndo}
            onClick={undo}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={disabled || view !== "edit" || !historyState.canRedo}
            onClick={redo}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
        </div>

        <div className="border-border bg-background ml-auto flex rounded-lg border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={view === "edit" ? "secondary" : "ghost"}
            aria-pressed={view === "edit"}
            onClick={() => setView("edit")}
            className="h-7 px-2.5 text-xs"
          >
            <PencilLine className="size-3.5" /> Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "preview" ? "secondary" : "ghost"}
            aria-pressed={view === "preview"}
            onClick={() => setView("preview")}
            className="h-7 px-2.5 text-xs"
          >
            <Eye className="size-3.5" /> Preview
          </Button>
        </div>
      </div>

      {view === "edit" ? (
        <Textarea
          ref={textareaRef}
          aria-label="Markdown note editor"
          value={value}
          onChange={(event) => commitValue(event.target.value, "typing")}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-[30rem] resize-y rounded-none border-0 px-4 py-3 font-mono text-sm leading-6 focus-visible:ring-0 md:min-h-[34rem]"
          maxLength={maxLength}
        />
      ) : (
        <div
          className="min-h-[30rem] px-5 py-4 md:min-h-[34rem]"
          aria-label="Markdown note preview"
        >
          {value.trim() ? (
            <SafeMarkdown markdown={value} />
          ) : (
            <div className="text-muted-foreground grid min-h-[26rem] place-items-center text-sm">
              Nothing to preview yet.
            </div>
          )}
        </div>
      )}

      <div className="border-border text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs">
        <span>Markdown supported · Select text, then choose a format</span>
        <span className="flex items-center gap-3">
          <span>
            {value.length.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
          {statusLabel ? <span aria-live="polite">{statusLabel}</span> : null}
        </span>
      </div>
    </div>
  );
}
