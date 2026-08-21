import { z } from "zod";

export const LEARNING_ASSISTANT_MODEL = "gpt-5.5";
export const LEARNING_ASSISTANT_PROMPT_VERSION = "learning-assistant-v1";

export const learningAssistantActionSchema = z.enum([
  "question",
  "explain",
  "summary",
  "practice",
]);
export type LearningAssistantAction = z.infer<
  typeof learningAssistantActionSchema
>;

const noteSourceSchema = z.object({
  kind: z.literal("note"),
  visibility: z.enum(["public", "private"]),
});

const materialSourceSchema = z.object({
  kind: z.literal("material"),
  materialId: z.string().uuid(),
});

export const learningAssistantRequestSchema = z
  .object({
    action: learningAssistantActionSchema,
    question: z.string().trim().max(2000).nullable().default(null),
    sources: z
      .array(
        z.discriminatedUnion("kind", [noteSourceSchema, materialSourceSchema]),
      )
      .min(1)
      .max(10),
    practice: z
      .object({
        count: z.union([z.literal(3), z.literal(5), z.literal(10)]),
        difficulty: z.enum(["introductory", "standard", "challenge"]),
      })
      .optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.action === "question" || value.action === "explain") &&
      !value.question
    ) {
      context.addIssue({
        code: "custom",
        path: ["question"],
        message: "A question or concept is required for this action.",
      });
    }
    if (value.action === "practice" && !value.practice) {
      context.addIssue({
        code: "custom",
        path: ["practice"],
        message: "Practice options are required.",
      });
    }
    const sourceKeys = value.sources.map((source) =>
      source.kind === "note"
        ? `note:${source.visibility}`
        : `material:${source.materialId}`,
    );
    if (new Set(sourceKeys).size !== sourceKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Each source can be selected only once.",
      });
    }
  });

export type LearningAssistantRequest = z.infer<
  typeof learningAssistantRequestSchema
>;

export type LearningSourceChunk = {
  id: string;
  sourceId: string;
  sourceKind: "note" | "material";
  sourceTitle: string;
  text: string;
  pageNumber: number | null;
  noteParagraph: number | null;
  order: number;
};

export type LearningAssistantCitation = {
  chunkId: string;
  sourceId: string;
  sourceKind: "note" | "material";
  sourceTitle: string;
  pageNumber: number | null;
  noteParagraph: number | null;
  quote: string;
};

export const learningAssistantModelResultSchema = z.object({
  answerMarkdown: z.string().max(40000),
  citationChunkIds: z.array(z.string()).max(20),
  practiceItems: z
    .array(
      z.object({
        question: z.string().min(1).max(2000),
        answerMarkdown: z.string().min(1).max(10000),
        citationChunkIds: z.array(z.string()).min(1).max(8),
      }),
    )
    .max(10),
  insufficiency: z.string().max(2000).nullable(),
});

export type LearningAssistantModelResult = z.infer<
  typeof learningAssistantModelResultSchema
>;

function normalizedText(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function textWindows(value: string, maxLength = 1800) {
  const normalized = value.replaceAll("\r\n", "\n").trim();
  if (!normalized) return [];
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const windows: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const pieces =
      paragraph.length <= maxLength
        ? [paragraph]
        : (paragraph.match(new RegExp(`[\\s\\S]{1,${maxLength}}`, "g")) ?? []);
    for (const piece of pieces) {
      if (current && current.length + piece.length + 2 > maxLength) {
        windows.push(current);
        current = "";
      }
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }
  if (current) windows.push(current);
  return windows;
}

export function noteChunks(input: {
  sourceId: string;
  sourceTitle: string;
  markdown: string;
}): LearningSourceChunk[] {
  const paragraphs = input.markdown
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.flatMap((paragraph, paragraphIndex) =>
    textWindows(paragraph).map((text, partIndex) => ({
      id: `${input.sourceId}:p${paragraphIndex + 1}:part${partIndex + 1}`,
      sourceId: input.sourceId,
      sourceKind: "note" as const,
      sourceTitle: input.sourceTitle,
      text,
      pageNumber: null,
      noteParagraph: paragraphIndex + 1,
      order: paragraphIndex * 1000 + partIndex,
    })),
  );
}

export function pdfPageChunks(input: {
  sourceId: string;
  sourceTitle: string;
  pages: Array<{ pageNumber: number; text: string }>;
}): LearningSourceChunk[] {
  return input.pages.flatMap((page) =>
    textWindows(page.text).map((text, index) => ({
      id: `${input.sourceId}:page${page.pageNumber}:part${index + 1}`,
      sourceId: input.sourceId,
      sourceKind: "material" as const,
      sourceTitle: input.sourceTitle,
      text,
      pageNumber: page.pageNumber,
      noteParagraph: null,
      order: page.pageNumber * 1000 + index,
    })),
  );
}

function searchTokens(value: string) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("en-US");
  const words = normalized.match(/[a-z0-9]{2,}/g) ?? [];
  const han = Array.from(normalized).filter((character) =>
    /\p{Script=Han}/u.test(character),
  );
  const hanTokens = han.flatMap((character, index) =>
    index + 1 < han.length
      ? [character, `${character}${han[index + 1]}`]
      : [character],
  );
  return Array.from(new Set([...words, ...hanTokens])).slice(0, 80);
}

export function selectRelevantChunks(
  chunks: LearningSourceChunk[],
  query: string,
  maxChunks = 8,
  maxCharacters = 24000,
) {
  const tokens = searchTokens(query);
  const scored = chunks.map((chunk) => {
    const haystack = `${chunk.sourceTitle} ${chunk.text}`
      .normalize("NFKC")
      .toLocaleLowerCase("en-US");
    const score = tokens.reduce(
      (total, token) =>
        total + (haystack.includes(token) ? Math.max(1, token.length) : 0),
      0,
    );
    return { chunk, score };
  });

  const firstPerSource = Array.from(
    new Set(chunks.map((chunk) => chunk.sourceId)),
  )
    .map(
      (sourceId) =>
        scored
          .filter((candidate) => candidate.chunk.sourceId === sourceId)
          .toSorted(
            (left, right) =>
              right.score - left.score || left.chunk.order - right.chunk.order,
          )[0],
    )
    .filter(Boolean);
  const ranked = scored.toSorted(
    (left, right) =>
      right.score - left.score || left.chunk.order - right.chunk.order,
  );
  const candidates = [...firstPerSource, ...ranked];
  const selected: LearningSourceChunk[] = [];
  const seen = new Set<string>();
  let characterCount = 0;

  for (const candidate of candidates) {
    if (
      !candidate ||
      seen.has(candidate.chunk.id) ||
      selected.length >= maxChunks ||
      characterCount + candidate.chunk.text.length > maxCharacters
    ) {
      continue;
    }
    selected.push(candidate.chunk);
    seen.add(candidate.chunk.id);
    characterCount += candidate.chunk.text.length;
  }
  return selected;
}

export function validateAndBuildCitations(
  result: LearningAssistantModelResult,
  chunks: LearningSourceChunk[],
  action: LearningAssistantAction,
) {
  const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const requestedIds = [
    ...result.citationChunkIds,
    ...result.practiceItems.flatMap((item) => item.citationChunkIds),
  ];
  const uniqueIds = Array.from(new Set(requestedIds));
  if (uniqueIds.some((id) => !chunkMap.has(id))) {
    throw new Error("AI_CITATION_INVALID");
  }
  if (
    !result.insufficiency &&
    action !== "practice" &&
    uniqueIds.length === 0
  ) {
    throw new Error("AI_CITATION_REQUIRED");
  }
  if (action === "practice") {
    if (result.practiceItems.length === 0) throw new Error("AI_PRACTICE_EMPTY");
    if (
      result.practiceItems.some((item) => item.citationChunkIds.length === 0)
    ) {
      throw new Error("AI_CITATION_REQUIRED");
    }
  }

  return uniqueIds.map((id): LearningAssistantCitation => {
    const chunk = chunkMap.get(id)!;
    return {
      chunkId: chunk.id,
      sourceId: chunk.sourceId,
      sourceKind: chunk.sourceKind,
      sourceTitle: chunk.sourceTitle,
      pageNumber: chunk.pageNumber,
      noteParagraph: chunk.noteParagraph,
      quote: normalizedText(chunk.text).slice(0, 280),
    };
  });
}
