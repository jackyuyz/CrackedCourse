import {
  syllabusExtractionV1Schema,
  type ExtractorInput,
  type SyllabusExtractionV1,
  type SyllabusExtractor,
} from "@/lib/extraction/schema";

type PageLine = { pageNumber: number; text: string };

function extracted<T>(
  value: T,
  source?: PageLine,
  confidence = source ? 0.82 : 0,
  ambiguity?: string,
) {
  return {
    value,
    confidence,
    evidence: source
      ? [{ pageNumber: source.pageNumber, quote: source.text }]
      : [],
    ambiguity: ambiguity ?? null,
  };
}

function toIsoDate(raw: string) {
  const match = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (!match) return null;

  const month = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ].indexOf(match[1].toLocaleLowerCase("en-US"));
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[2])));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function eventType(line: string) {
  const normalized = line.toLocaleLowerCase("en-US");
  if (
    normalized.includes("exam") ||
    normalized.includes("midterm") ||
    normalized.includes("final")
  )
    return "exam" as const;
  if (normalized.includes("quiz")) return "quiz" as const;
  if (normalized.includes("project")) return "project" as const;
  if (
    normalized.includes("assignment") ||
    normalized.includes("homework") ||
    normalized.includes("problem set")
  )
    return "assignment" as const;
  if (normalized.includes("due") || normalized.includes("deadline"))
    return "deadline" as const;
  return "other" as const;
}

export class FixtureSyllabusExtractor implements SyllabusExtractor {
  async extract(input: ExtractorInput): Promise<SyllabusExtractionV1> {
    const lines = input.pages.flatMap((page) =>
      page.text
        .split(/(?<=[.!?])\s+|\s{3,}/)
        .map((text) => ({ pageNumber: page.pageNumber, text: text.trim() }))
        .filter((line) => line.text.length > 1),
    );
    const documentText = lines.map((line) => line.text).join("\n");

    const codeMatch = documentText.match(/\b[A-Z]{2,5}[ -]?\d{2,4}\b/);
    const codeLine = codeMatch
      ? lines.find((line) => line.text.includes(codeMatch[0]))
      : undefined;
    const titleCandidate =
      codeMatch && codeLine
        ? codeLine.text
            .slice(codeLine.text.indexOf(codeMatch[0]) + codeMatch[0].length)
            .replace(/^[\s:–—-]+/, "")
            .split(/[|•]|\s{2,}/)[0]
            .trim()
            .slice(0, 180) || null
        : null;

    const termMatch = documentText.match(
      /\b(Fall|Spring|Summer|Winter)\s+20\d{2}\b/i,
    );
    const termLine = termMatch
      ? lines.find((line) => line.text.includes(termMatch[0]))
      : undefined;

    const people = lines.flatMap((line) => {
      const emails =
        line.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
      return emails.map((email) => {
        const nameCandidate = line.text
          .slice(0, line.text.indexOf(email))
          .replace(
            /(?:email|e-mail|contact|instructor|professor|prof\.?|dr\.?)[:\s-]*/gi,
            " ",
          )
          .trim()
          .split(/[|,;]/)
          .at(-1)
          ?.trim();
        return extracted(
          {
            name:
              nameCandidate && nameCandidate.length <= 80
                ? nameCandidate
                : email.split("@")[0],
            role: /instructor|professor|prof\.|dr\./i.test(line.text)
              ? ("instructor" as const)
              : /\bTA\b|teaching assistant/i.test(line.text)
                ? ("teaching_assistant" as const)
                : ("other" as const),
            email,
            officeLocation: null,
          },
          line,
          0.68,
        );
      });
    });

    const gradingCategories = lines.flatMap((line) => {
      const match = line.text.match(
        /([A-Za-z][A-Za-z &/-]{1,48}?)\s*[:–—-]?\s*(\d{1,3}(?:\.\d+)?)\s*%/,
      );
      if (!match) return [];
      const weight = Number(match[2]);
      if (weight < 0 || weight > 100) return [];
      return [
        extracted({ name: match[1].trim(), weightPercent: weight }, line, 0.76),
      ];
    });

    const events = lines.flatMap((line) => {
      const date = toIsoDate(line.text);
      if (!date) return [];
      if (
        !/exam|midterm|final|quiz|assignment|homework|project|problem set|due|deadline/i.test(
          line.text,
        )
      )
        return [];
      return [
        extracted(
          {
            title: line.text.slice(0, 120),
            type: eventType(line.text),
            startDate: date,
            startTime: null,
            endDate: null,
            endTime: null,
            isAllDay: true,
            location: null,
          },
          line,
          0.62,
        ),
      ];
    });

    const warnings: SyllabusExtractionV1["warnings"] = [];
    if (!codeMatch) {
      warnings.push({
        code: "MISSING_COURSE_CODE",
        message: "No clear course code was found. Add it before publishing.",
        severity: "review",
      });
    }
    if (gradingCategories.length === 0) {
      warnings.push({
        code: "MISSING_GRADING_STRUCTURE",
        message: "No supported grading weights were found.",
        severity: "review",
      });
    }

    return syllabusExtractionV1Schema.parse({
      schemaVersion: "1",
      course: {
        code: extracted(codeMatch?.[0] ?? null, codeLine, codeLine ? 0.9 : 0),
        title: extracted(
          titleCandidate,
          titleCandidate ? codeLine : undefined,
          titleCandidate ? 0.66 : 0,
        ),
        section: extracted(null),
        term: extracted(
          termMatch?.[0] ?? input.assumedTerm?.name ?? null,
          termLine,
          termLine ? 0.86 : 0,
        ),
        timeZone: extracted(input.assumedTerm?.timeZone ?? null),
      },
      people,
      officeHours: [],
      events,
      gradingCategories,
      gradingPolicies: [],
      warnings,
    });
  }
}
