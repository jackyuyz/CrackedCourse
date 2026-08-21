import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LEARNING_ASSISTANT_MODEL,
  learningAssistantRequestSchema,
  noteChunks,
  pdfPageChunks,
  selectRelevantChunks,
  validateAndBuildCitations,
} from "@/lib/learning-ai";
import {
  defaultLearningGuideSources,
  learningGuideSourceFingerprint,
} from "@/lib/learning-guide-cache";
import { generateLearningAssistantOutput } from "@/lib/openai/learning-assistant";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Learning Assistant grounding", () => {
  it("requires a prompt for question/explain actions and deduplicates sources", () => {
    expect(
      learningAssistantRequestSchema.safeParse({
        action: "question",
        question: null,
        sources: [{ kind: "note", visibility: "private" }],
      }).success,
    ).toBe(false);
    expect(
      learningAssistantRequestSchema.safeParse({
        action: "summary",
        question: null,
        sources: [
          { kind: "note", visibility: "private" },
          { kind: "note", visibility: "private" },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts only a source-based summary as the cached unit guide", () => {
    expect(
      learningAssistantRequestSchema.safeParse({
        action: "summary",
        question: null,
        intent: "unit-guide",
        sources: [{ kind: "note", visibility: "private" }],
      }).success,
    ).toBe(true);
    expect(
      learningAssistantRequestSchema.safeParse({
        action: "question",
        question: "What is this?",
        intent: "unit-guide",
        sources: [{ kind: "note", visibility: "private" }],
      }).success,
    ).toBe(false);
  });

  it("preserves PDF pages and selects relevant chunks without crossing sources", () => {
    const chunks = [
      ...noteChunks({
        sourceId: "note:private",
        sourceTitle: "Private note",
        markdown: "The invariant is preserved after each loop iteration.",
      }),
      ...pdfPageChunks({
        sourceId: "material:11111111-1111-4111-8111-111111111111",
        sourceTitle: "Week 1 slides",
        pages: [
          { pageNumber: 1, text: "Course overview and logistics." },
          {
            pageNumber: 2,
            text: "A loop invariant proves initialization, maintenance, and termination.",
          },
        ],
      }),
    ];

    const selected = selectRelevantChunks(
      chunks,
      "How does a loop invariant work?",
      2,
    );

    expect(selected).toHaveLength(2);
    expect(new Set(selected.map((chunk) => chunk.sourceId)).size).toBe(2);
    expect(selected.find((chunk) => chunk.pageNumber === 2)?.text).toContain(
      "initialization",
    );
  });

  it("rejects invented citation IDs and builds citations from verified chunks", () => {
    const chunks = noteChunks({
      sourceId: "note:public",
      sourceTitle: "Public course note",
      markdown: "Dynamic programming stores solutions to repeated subproblems.",
    });
    expect(() =>
      validateAndBuildCitations(
        {
          answerMarkdown: "Unsupported answer",
          citationChunkIds: ["invented"],
          practiceItems: [],
          insufficiency: null,
        },
        chunks,
        "question",
      ),
    ).toThrow("AI_CITATION_INVALID");

    const citations = validateAndBuildCitations(
      {
        answerMarkdown: "A grounded answer",
        citationChunkIds: [chunks[0].id],
        practiceItems: [],
        insufficiency: null,
      },
      chunks,
      "question",
    );
    expect(citations[0]).toMatchObject({
      chunkId: chunks[0].id,
      sourceTitle: "Public course note",
      noteParagraph: 1,
    });
    expect(citations[0].quote).toContain("repeated subproblems");
  });
});

describe("Learning Assistant guide cache", () => {
  const notes = [
    {
      id: "note-private",
      visibility: "private" as const,
      body_markdown: "A confidence interval estimates an unknown parameter.",
      updated_at: "2026-08-20T20:00:00.000Z",
    },
  ];
  const materials = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Lecture 2",
      storage_path: "user/lecture-2.pdf",
      material_type: "pdf" as const,
      kind: "file" as const,
      size_bytes: 200,
      updated_at: "2026-08-20T20:00:00.000Z",
      display_order: 2,
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Lecture 1",
      storage_path: "user/lecture-1.pdf",
      material_type: "pdf" as const,
      kind: "file" as const,
      size_bytes: 100,
      updated_at: "2026-08-20T19:00:00.000Z",
      display_order: 1,
    },
  ];

  it("selects notes and ordered PDFs without requiring user setup", () => {
    expect(defaultLearningGuideSources(notes, materials)).toEqual([
      { kind: "note", visibility: "private" },
      {
        kind: "material",
        materialId: "11111111-1111-4111-8111-111111111111",
      },
      {
        kind: "material",
        materialId: "22222222-2222-4222-8222-222222222222",
      },
    ]);
  });

  it("keeps the fingerprint stable across row order and changes it with content", () => {
    const first = learningGuideSourceFingerprint({ notes, materials });
    const reordered = learningGuideSourceFingerprint({
      notes: [...notes].reverse(),
      materials: [...materials].reverse(),
    });
    const edited = learningGuideSourceFingerprint({
      notes: [
        { ...notes[0], body_markdown: `${notes[0].body_markdown} Edited.` },
      ],
      materials,
    });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(reordered).toBe(first);
    expect(edited).not.toBe(first);
  });
});

describe("OpenAI Learning Assistant provider", () => {
  it("uses the fixed GPT-5.5 model, Structured Outputs, and disables provider storage", async () => {
    const chunk = noteChunks({
      sourceId: "note:private",
      sourceTitle: "Private note",
      markdown: "An invariant remains true before and after every iteration.",
    })[0];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    answerMarkdown:
                      "An invariant is a statement that remains true.",
                    citationChunkIds: [chunk.id],
                    practiceItems: [],
                    insufficiency: null,
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await generateLearningAssistantOutput({
      apiKey: "test-key",
      request: {
        action: "question",
        question: "What is an invariant?",
        sources: [{ kind: "note", visibility: "private" }],
      },
      chunks: [chunk],
      courseLabel: "15-101 — Computer Science",
      unitTitle: "Loops",
    });

    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as {
      model: string;
      store: boolean;
      reasoning: { effort: string };
      text: { format: { type: string; strict: boolean } };
    };
    expect(LEARNING_ASSISTANT_MODEL).toBe("gpt-5.5");
    expect(requestBody).toMatchObject({
      model: "gpt-5.5",
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", strict: true } },
    });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer test-key",
    });
    expect(result.citationChunkIds).toEqual([chunk.id]);
  });
});
