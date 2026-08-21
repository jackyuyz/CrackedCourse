import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MarkdownNoteEditor } from "@/components/markdown-note-editor";

function EditorHarness({ initialValue = "Study this concept" }) {
  const [value, setValue] = useState(initialValue);
  return (
    <MarkdownNoteEditor
      value={value}
      onChange={setValue}
      onBlur={vi.fn()}
      maxLength={120000}
    />
  );
}

describe("MarkdownNoteEditor", () => {
  it("formats selected text as bold Markdown and can undo the change", async () => {
    const user = userEvent.setup();
    render(<EditorHarness />);
    const editor = screen.getByRole("textbox", {
      name: "Markdown note editor",
    }) as HTMLTextAreaElement;

    editor.focus();
    editor.setSelectionRange(0, 5);
    await user.click(screen.getByRole("button", { name: "Bold (⌘B)" }));

    expect(editor).toHaveValue("**Study** this concept");

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(editor).toHaveValue("Study this concept");
  });

  it("renders highlight syntax in Preview without exposing raw Markdown", async () => {
    const user = userEvent.setup();
    render(<EditorHarness initialValue="Remember ==this idea==." />);

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByText("this idea").tagName).toBe("MARK");
    expect(
      screen.queryByRole("textbox", { name: "Markdown note editor" }),
    ).toBeNull();
  });
});
