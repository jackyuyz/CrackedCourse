import {
  syllabusExtractionV1Schema,
  type ExtractorInput,
  type SyllabusExtractionV1,
  type SyllabusExtractor,
} from "@/lib/extraction/schema";

type PageLine = {
  pageNumber: number;
  lineNumber: number;
  text: string;
  evidenceTexts?: string[];
};

type ParsedTime = {
  startTime: string;
  endTime: string | null;
  raw: string;
  index: number;
};

type DateCandidate = {
  raw: string;
  start: number;
  end: number;
  isoDate: string | null;
  inferredYear: boolean;
};

const monthNumbers: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const dayNumbers: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mondays: 1,
  mon: 1,
  tuesday: 2,
  tuesdays: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wednesdays: 3,
  wed: 3,
  thursday: 4,
  thursdays: 4,
  thu: 4,
  thur: 4,
  fri: 5,
  friday: 5,
  fridays: 5,
  sat: 6,
  saturday: 6,
  saturdays: 6,
};

const timeZoneNames: Record<string, string> = {
  ET: "America/New_York",
  EST: "America/New_York",
  EDT: "America/New_York",
  CT: "America/Chicago",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MT: "America/Denver",
  MST: "America/Denver",
  MDT: "America/Denver",
  PT: "America/Los_Angeles",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
};

const courseCodePattern =
  /\b(?:\d{2,3}\s*[-–—]\s*\d{2,4}[A-Z]?|[A-Z]{2,5}\s*[- ]?\s*\d{2,4}[A-Z]?)\b/g;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

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
      ? (source.evidenceTexts ?? [source.text]).map((quote) => ({
          pageNumber: source.pageNumber,
          quote,
        }))
      : [],
    ambiguity: ambiguity ?? null,
  };
}

function normalizeLine(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[●•◦▪]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageLines(input: ExtractorInput) {
  return input.pages.flatMap((page) =>
    page.text
      .split(/\n+/)
      .flatMap((rawLine) => {
        const line = normalizeLine(rawLine);
        if (line.length <= 500) return [line];
        return line.split(/(?<=[.!?])\s+(?=[A-Z])/).map(normalizeLine);
      })
      .filter((text) => text.length > 1)
      .map((text, lineNumber) => ({
        pageNumber: page.pageNumber,
        lineNumber,
        text,
      })),
  );
}

function normalizeCourseCode(raw: string) {
  return raw
    .toLocaleUpperCase("en-US")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "");
}

function titleAfterCode(line: string, rawCode: string) {
  const start = line.indexOf(rawCode) + rawCode.length;
  const candidate = line
    .slice(start)
    .replace(/^[\s:|–—-]+/, "")
    .replace(/\b(Fall|Spring|Summer|Winter)\s+20\d{2}\b/gi, " ")
    .replace(/\bSyllabus\b/gi, " ")
    .replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    candidate.length < 4 ||
    !/[A-Za-z]{3}/.test(candidate) ||
    /^(?:section|course|fall|spring|summer|winter)\b/i.test(candidate)
  ) {
    return null;
  }
  return candidate.slice(0, 180);
}

function findCourse(lines: PageLine[]) {
  const candidates = lines.flatMap((line) => {
    courseCodePattern.lastIndex = 0;
    return Array.from(line.text.matchAll(courseCodePattern)).map((match) => {
      const title = titleAfterCode(line.text, match[0]);
      let score = line.pageNumber === 1 ? 4 : Math.max(0, 3 - line.pageNumber);
      if (title) score += 7;
      if (/prerequisite|page\s+\d+\s+of/i.test(line.text)) score -= 8;
      if (/syllabus/i.test(line.text)) score += 1;
      return { line, rawCode: match[0], title, score };
    });
  });
  candidates.sort((left, right) => right.score - left.score);

  const best = candidates[0];
  let title = best?.title ?? null;
  let titleLine = best?.title ? best.line : undefined;
  if (title && titleLine) {
    const currentIndex = lines.indexOf(titleLine);
    const next = lines[currentIndex + 1];
    if (
      next?.pageNumber === titleLine.pageNumber &&
      next.text.length <= 80 &&
      /^[A-Z][A-Za-z0-9 &'’():/-]+$/.test(next.text) &&
      !/^(?:Instructor|Professor|TA|Course|Fall|Spring|Summer|Winter|Page)\b/i.test(
        next.text,
      )
    ) {
      title = `${title} ${next.text}`.slice(0, 180);
      titleLine = {
        ...titleLine,
        text: `${titleLine.text} ${next.text}`,
        evidenceTexts: [titleLine.text, next.text],
      };
    }
  }
  return {
    code: best ? normalizeCourseCode(best.rawCode) : null,
    codeLine: best?.line,
    title,
    titleLine,
  };
}

function findTerm(lines: PageLine[]) {
  for (const line of lines) {
    const match = line.text.match(/\b(Fall|Spring|Summer|Winter)\s+20\d{2}\b/i);
    if (match) return { value: match[0], line };
  }
  return { value: null, line: undefined };
}

function findSection(lines: PageLine[]) {
  const matches = lines.flatMap((line) => {
    if (/\b(?:lab|recitation)\b/i.test(line.text)) return [];
    const match = line.text.match(
      /\b(?:course\s+)?section\s*(?:number|no\.?|#)?\s*[:=]\s*([A-Z0-9][A-Z0-9-]{0,19})\b/i,
    );
    return match ? [{ value: match[1], line }] : [];
  });
  return matches.length === 1 ? matches[0] : { value: null, line: undefined };
}

function findTimeZone(lines: PageLine[]) {
  for (const line of lines) {
    const iana = line.text.match(
      /\b(?:Africa|America|Antarctica|Asia|Atlantic|Australia|Europe|Indian|Pacific)\/[A-Z][A-Za-z_+-]+\b/,
    );
    if (iana) return { value: iana[0], line, ambiguity: undefined };

    const abbreviation = line.text.match(
      /\b(?:ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT)\b/,
    );
    if (abbreviation) {
      return {
        value: timeZoneNames[abbreviation[0]],
        line,
        ambiguity: `Normalized from ${abbreviation[0]}.`,
      };
    }
  }
  return { value: null, line: undefined, ambiguity: undefined };
}

function parseClock(
  hourRaw: string,
  minuteRaw: string | undefined,
  meridiemRaw?: string,
) {
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw ?? "0");
  const meridiem = meridiemRaw?.replace(/\./g, "").toLocaleLowerCase("en-US");
  if (hour > 23 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  } else if (hour <= 12) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function oppositeMeridiem(meridiem: string) {
  return meridiem.replace(/\./g, "").toLocaleLowerCase("en-US") === "pm"
    ? "am"
    : "pm";
}

function parseTime(text: string): ParsedTime | null {
  const token = "(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?";
  const range = new RegExp(`${token}\\s*(?:[-–—]|to)\\s*${token}`, "i").exec(
    text,
  );
  if (range) {
    const startMeridiem = range[3] ?? range[6];
    const endMeridiem = range[6] ?? range[3];
    let startTime = parseClock(range[1], range[2], startMeridiem);
    let endTime = parseClock(range[4], range[5], endMeridiem);

    if (!range[3] && range[6] && endTime) {
      const alternativeStart = parseClock(
        range[1],
        range[2],
        oppositeMeridiem(range[6]),
      );
      if (
        alternativeStart &&
        alternativeStart <= endTime &&
        (!startTime || startTime > endTime)
      ) {
        startTime = alternativeStart;
      }
    }

    if (range[3] && !range[6] && startTime) {
      const alternativeEnd = parseClock(
        range[4],
        range[5],
        oppositeMeridiem(range[3]),
      );
      if (
        alternativeEnd &&
        alternativeEnd >= startTime &&
        (!endTime || endTime < startTime)
      ) {
        endTime = alternativeEnd;
      }
    }

    if (startTime && endTime) {
      return {
        startTime,
        endTime,
        raw: range[0],
        index: range.index,
      };
    }
  }

  const single = new RegExp(`\\b(?:by|at)\\s+${token}`, "i").exec(text);
  if (!single) return null;
  const startTime = parseClock(single[1], single[2], single[3]);
  return startTime
    ? { startTime, endTime: null, raw: single[0], index: single.index }
    : null;
}

function parseDayOfWeek(text: string) {
  const match = text.match(
    /\b(Sundays?|Sun|Mondays?|Mon|Tuesdays?|Tues?|Wednesdays?|Wed|Thursdays?|Thurs?|Thu|Fridays?|Fri|Saturdays?|Sat)\b/i,
  );
  return match ? dayNumbers[match[1].toLocaleLowerCase("en-US")] : null;
}

function validIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function extractDates(text: string, assumedYear: number | null) {
  const candidates: DateCandidate[] = [];
  const monthPattern = new RegExp(
    `\\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Tues|Wed|Thu|Thur|Fri|Sat)?\\s*,?\\s*(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`,
    "gi",
  );
  for (const match of text.matchAll(monthPattern)) {
    const explicitYear = match[3] ? Number(match[3]) : null;
    const year = explicitYear ?? assumedYear;
    candidates.push({
      raw: match[0].trim(),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      isoDate: year
        ? validIsoDate(
            year,
            monthNumbers[match[1].toLocaleLowerCase("en-US")],
            Number(match[2]),
          )
        : null,
      inferredYear: explicitYear == null && year != null,
    });
  }

  const numericPattern = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?\b/g;
  for (const match of text.matchAll(numericPattern)) {
    const start = match.index ?? 0;
    if (
      candidates.some(
        (candidate) =>
          start < candidate.end && start + match[0].length > candidate.start,
      )
    ) {
      continue;
    }
    const explicitYear = match[3]
      ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
      : null;
    const year = explicitYear ?? assumedYear;
    candidates.push({
      raw: match[0],
      start,
      end: start + match[0].length,
      isoDate: year
        ? validIsoDate(year, Number(match[1]), Number(match[2]))
        : null,
      inferredYear: explicitYear == null && year != null,
    });
  }

  return candidates.sort((left, right) => left.start - right.start);
}

function nearbyRole(lines: PageLine[], index: number) {
  for (let cursor = index; cursor >= Math.max(0, index - 5); cursor -= 1) {
    const text = lines[cursor].text;
    if (
      /\b(?:teaching assistants?|TAs?|course assistants?)\b\s*:?/i.test(text)
    ) {
      return "teaching_assistant" as const;
    }
    if (/\b(?:instructor|professor|prof\.?|lecturer)\b\s*:?/i.test(text)) {
      return "instructor" as const;
    }
  }
  return null;
}

function cleanName(value: string) {
  return value
    .replace(emailPattern, " ")
    .replace(
      /\b(?:email|e-mail|contact|instructor|professor|prof\.?|lecturer|teaching assistant|TA)\b\s*:?/gi,
      " ",
    )
    .replace(/^[\s:;,|–—-]+|[\s:;,|–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function plausibleName(value: string) {
  if (value.length < 3 || value.length > 100 || /@|https?:|\d{3}/i.test(value))
    return false;
  if (
    /\b(?:course staff|office hours|syllabus|department|university|canvas|baker|hall|room)\b/i.test(
      value,
    )
  )
    return false;
  const words = value.match(/[A-Za-z][A-Za-z.'’-]*/g) ?? [];
  const capitalized = words.filter((word) => /^[A-Z]/.test(word));
  return (
    /^[A-Z]/.test(value) &&
    words.length >= 2 &&
    words.length <= 8 &&
    capitalized.length >= Math.min(2, words.length)
  );
}

function precedingName(lines: PageLine[], index: number) {
  for (let cursor = index - 1; cursor >= Math.max(0, index - 5); cursor -= 1) {
    if (lines[cursor].pageNumber !== lines[index].pageNumber) break;
    const candidate = cleanName(lines[cursor].text);
    if (plausibleName(candidate)) {
      return { value: candidate, line: lines[cursor] };
    }
  }
  return null;
}

function officeLocationNear(lines: PageLine[], index: number, name: string) {
  const current = lines[index].text;
  const labeled = current.match(
    /\boffice(?:\s+location)?\s*:\s*([^,;|]+(?:\s+[^,;|]+){0,4})/i,
  );
  if (labeled) return { value: labeled[1].trim(), line: lines[index] };

  for (let cursor = index - 1; cursor >= Math.max(0, index - 4); cursor -= 1) {
    if (lines[cursor].pageNumber !== lines[index].pageNumber) break;
    const candidate = lines[cursor].text;
    if (
      candidate.includes(name) ||
      /\b(?:instructor|professor|TA)\b/i.test(candidate)
    )
      continue;
    if (
      /\b(?:Fall|Spring|Summer|Winter)\s+20\d{2}\b/i.test(candidate) ||
      courseCodePattern.test(candidate)
    ) {
      courseCodePattern.lastIndex = 0;
      continue;
    }
    courseCodePattern.lastIndex = 0;
    if (
      /\b(?:office|room|hall|building|baker|wean|gates|porter|hamburg|zoom)\b/i.test(
        candidate,
      ) ||
      /^\d{2,4}[A-Z]?(?:-[A-Z0-9]+)?\s+[A-Za-z]/.test(candidate)
    ) {
      return {
        value: candidate
          .replace(/^\s*office(?:\s+location)?\s*:\s*/i, "")
          .trim()
          .slice(0, 300),
        line: lines[cursor],
      };
    }
  }
  return { value: null, line: undefined };
}

function findPeople(lines: PageLine[]) {
  const byEmail = new Map<
    string,
    ReturnType<
      typeof extracted<{
        name: string;
        role: "instructor" | "teaching_assistant" | "other";
        email: string;
        officeLocation: string | null;
      }>
    >
  >();

  lines.forEach((line, index) => {
    emailPattern.lastIndex = 0;
    for (const emailMatch of line.text.matchAll(emailPattern)) {
      const role = nearbyRole(lines, index);
      if (!role) continue;

      const beforeEmail = cleanName(line.text.slice(0, emailMatch.index));
      const directName = plausibleName(beforeEmail) ? beforeEmail : null;
      const preceding = directName ? null : precedingName(lines, index);
      const name = directName ?? preceding?.value;
      if (!name) continue;

      const email = emailMatch[0].toLocaleLowerCase("en-US");
      const confidence = directName ? 0.92 : 0.84;
      const existing = byEmail.get(email);
      if (existing && existing.confidence >= confidence) continue;
      const officeLocation = officeLocationNear(lines, index, name);
      const evidenceTexts = Array.from(
        new Set(
          [preceding?.line?.text, officeLocation.line?.text, line.text].filter(
            (text): text is string => Boolean(text),
          ),
        ),
      );
      byEmail.set(
        email,
        extracted(
          {
            name,
            role,
            email,
            officeLocation: officeLocation.value,
          },
          { ...line, evidenceTexts },
          confidence,
        ),
      );
    }
  });

  return Array.from(byEmail.values());
}

function locationAfterTime(text: string, time: ParsedTime) {
  return (
    text
      .slice(time.index + time.raw.length)
      .replace(
        /^\s*,?\s*(?:ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT)?\s*,?\s*/i,
        "",
      )
      .replace(/[.;]$/, "")
      .trim() || null
  );
}

function personForOfficeHours(
  text: string,
  people: ReturnType<typeof findPeople>,
) {
  const lastName = text.match(
    /\b(?:Instructor|Professor)\s+([A-Z][A-Za-z'’-]+)/,
  )?.[1];
  if (lastName) {
    const person = people.find((item) =>
      item.value.name
        .toLocaleLowerCase("en-US")
        .includes(lastName.toLocaleLowerCase("en-US")),
    );
    if (person) return person.value.name;
  }
  return (
    people.find((item) => item.value.role === "instructor")?.value.name ?? null
  );
}

function findOfficeHours(
  lines: PageLine[],
  people: ReturnType<typeof findPeople>,
  input: ExtractorInput,
  courseTimeZone: string | null,
) {
  return lines.flatMap((line) => {
    if (!/\boffice hours?\b/i.test(line.text)) return [];
    const time = parseTime(line.text);
    const dayOfWeek = parseDayOfWeek(line.text);
    if (!time || dayOfWeek == null) return [];
    const recurrenceText =
      line.text.split(/office hours?\s*:/i)[1]?.trim() ?? line.text;
    const meetingUrl =
      line.text.match(/https?:\/\/\S+/)?.[0]?.replace(/[),.;]+$/, "") ?? null;
    return [
      extracted(
        {
          personName: personForOfficeHours(line.text, people),
          recurrenceText,
          dayOfWeek,
          startTime: time.startTime,
          endTime: time.endTime,
          startDate: input.assumedTerm?.startDate ?? null,
          endDate: input.assumedTerm?.endDate ?? null,
          timeZone: courseTimeZone ?? input.assumedTerm?.timeZone ?? null,
          location: meetingUrl ? null : locationAfterTime(line.text, time),
          meetingUrl,
        },
        line,
        0.88,
        input.assumedTerm?.startDate && input.assumedTerm?.endDate
          ? undefined
          : "Course date boundaries were not available for calendar recurrence.",
      ),
    ];
  });
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
    /assignment|homework|problem set|presentation|summary|summaries|gorilla|citi/.test(
      normalized,
    )
  )
    return "assignment" as const;
  if (normalized.includes("due") || normalized.includes("deadline"))
    return "deadline" as const;
  return "other" as const;
}

function eventTitle(line: string, date: DateCandidate) {
  let prefix = line.slice(0, date.start);
  const dueIndex = prefix.search(/\b(?:due|deadline)\b/i);
  if (dueIndex >= 0) prefix = prefix.slice(0, dueIndex);
  const assignmentPattern =
    /\b((?:(?:Upload|Submit|Watch|Look at|Complete)\s+)?(?:(?:Individual|Group)\s+)?(?:Gorilla task|presentation)\s*\d+|Summaries|summary|CITI(?: certification| completion)?|Canvas written assignment|homework|quiz)\b/gi;
  const rawAssignmentMatches = Array.from(prefix.matchAll(assignmentPattern));
  const rawAssignment = rawAssignmentMatches.at(-1)?.[1];
  if (rawAssignment) return rawAssignment.slice(0, 180);

  const prefixSegments = prefix
    .split(/[|•]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  prefix = (prefixSegments.at(-1) ?? prefix)
    .replace(/^.*?\b(?:Canvas to-do|Gorilla tasks?)\b\s*:?/i, "")
    .replace(/\b(?:by|at)\s+\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?).*$/i, "")
    .replace(/^[\s([\]{}:;,–—-]+|[\s([\]{}:;,–—-]+$/g, "")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (prefix.length < 2) {
    prefix = line
      .replace(date.raw, " ")
      .replace(/\b(?:due|deadline|by|on)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return prefix
    .replace(/\(\s*\)/g, " ")
    .replace(/[|•]/g, " ")
    .replace(/^[\s([\]{}:;,–—-]+|[\s([\]{}:;,–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function classMeeting(lines: PageLine[]) {
  for (const line of lines) {
    if (
      !/(?:\bmeeting times?\b|\blecture\s*:|\bclass\s+(?:meets|times?)\b)/i.test(
        line.text,
      )
    )
      continue;
    const time = parseTime(line.text);
    if (!time) continue;
    return {
      time,
      location: locationAfterTime(line.text, time),
      line,
    };
  }
  return null;
}

function findEvents(lines: PageLine[], term: string | null) {
  const assumedYear = term?.match(/\b(20\d{2})\b/)?.[1];
  const year = assumedYear ? Number(assumedYear) : null;
  const meeting = classMeeting(lines);
  const seen = new Set<string>();
  let inferredYearCount = 0;
  let unresolvedDateCount = 0;

  const stitchedLines = lines.map((line, index) => {
    if (!/\b(?:due|deadline)\b/i.test(line.text)) return line;
    const dates = extractDates(line.text, year);
    if (dates.length > 0) {
      const preview = eventTitle(line.text, dates[0]);
      if (
        /[A-Za-z]{3}/.test(preview) &&
        !/^(?:ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT)$/i.test(preview)
      ) {
        return line;
      }
      const previous = lines[index - 1];
      return previous?.pageNumber === line.pageNumber
        ? {
            ...previous,
            text: `${previous.text} ${line.text}`,
            evidenceTexts: [
              ...(previous.evidenceTexts ?? [previous.text]),
              ...(line.evidenceTexts ?? [line.text]),
            ],
          }
        : line;
    }

    const segments = line.text.split("|").map((segment) => segment.trim());
    const activeColumn =
      segments.length > 1
        ? segments.findIndex(
            (segment) =>
              /\b(?:due|deadline)\b/i.test(segment) &&
              extractDates(segment, year).length === 0,
          )
        : -1;
    let text = activeColumn >= 0 ? segments[activeColumn] : line.text;
    const evidenceTexts = [...(line.evidenceTexts ?? [line.text])];
    for (let offset = 1; offset <= 2; offset += 1) {
      const next = lines[index + offset];
      if (!next || next.pageNumber !== line.pageNumber) break;
      const nextSegments = next.text
        .split("|")
        .map((segment) => segment.trim());
      const continuation =
        activeColumn >= 0 ? nextSegments[activeColumn] : next.text;
      if (!continuation) break;
      if (
        activeColumn < 0 &&
        /\b(?:due|deadline)\b/i.test(continuation) &&
        !/^\s*\(?\s*(?:due|deadline)\b/i.test(continuation)
      ) {
        break;
      }
      text += ` ${continuation}`;
      evidenceTexts.push(...(next.evidenceTexts ?? [next.text]));
      if (extractDates(text, year).length > 0) break;
    }
    return { ...line, text, evidenceTexts };
  });
  const uniqueLines = Array.from(
    new Map(
      stitchedLines.map((line) => [`${line.pageNumber}|${line.text}`, line]),
    ).values(),
  );

  const events = uniqueLines.flatMap((line) => {
    if (
      !/\b(?:exam|midterm|final|quiz|assignment|homework|project|problem set|presentation|summar(?:y|ies)|gorilla|CITI|due|deadline)\b/i.test(
        line.text,
      )
    ) {
      return [];
    }
    const dates = extractDates(line.text, year);
    if (dates.length === 0) return [];

    return dates.flatMap((date, dateIndex) => {
      if (!date.isoDate) {
        unresolvedDateCount += 1;
        return [];
      }
      const beforeDate = line.text.slice(0, date.start);
      const closestDueIndex = Math.max(
        beforeDate.toLocaleLowerCase("en-US").lastIndexOf("due"),
        beforeDate.toLocaleLowerCase("en-US").lastIndexOf("deadline"),
      );
      const alreadyUsedDateInClause = dates
        .slice(0, dateIndex)
        .some(
          (previousDate) =>
            previousDate.end <= date.start &&
            previousDate.start > closestDueIndex,
        );
      const explicitlyAssociated =
        /\b(?:due|deadline)\b[^.!?]{0,45}$/i.test(beforeDate) ||
        /^\s*(?:Exam|Midterm|Final Exam|Quiz|Project|Assignment|Homework)\b[^.!?]{0,100}$/i.test(
          beforeDate,
        );
      if (!explicitlyAssociated || alreadyUsedDateInClause) return [];
      const title = eventTitle(line.text, date);
      if (
        !title ||
        !/[A-Za-z]{2}/.test(title) ||
        /^(?:week|dates?|prepare|remainder of week|ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT)$/i.test(
          title,
        )
      ) {
        return [];
      }
      const inheritedMeeting = /regular (?:lecture|class) time/i.test(line.text)
        ? meeting
        : null;
      const time = parseTime(line.text) ?? inheritedMeeting?.time ?? null;
      const key = `${title.toLocaleLowerCase("en-US")}|${date.isoDate}|${time?.startTime ?? ""}`;
      if (seen.has(key)) return [];
      seen.add(key);
      if (date.inferredYear) inferredYearCount += 1;

      const item = extracted(
        {
          title,
          type: eventType(line.text),
          startDate: date.isoDate,
          startTime: time?.startTime ?? null,
          endDate: time?.endTime ? date.isoDate : null,
          endTime: time?.endTime ?? null,
          isAllDay: time == null,
          location: inheritedMeeting?.location ?? null,
        },
        line,
        date.inferredYear || inheritedMeeting ? 0.72 : 0.88,
        [
          date.inferredYear
            ? `The year ${year} was inferred from the course term.`
            : null,
          inheritedMeeting
            ? "The time and location were inherited from the regular lecture schedule."
            : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      );
      if (inheritedMeeting) {
        item.evidence.push({
          pageNumber: inheritedMeeting.line.pageNumber,
          quote: inheritedMeeting.line.text,
        });
      }
      return [item];
    });
  });

  return { events, inferredYearCount, unresolvedDateCount };
}

function gradingPageNumbers(lines: PageLine[]) {
  const pages = new Set<number>();
  for (const line of lines) {
    if (
      /\b(?:course grade consists|semester grade|assess your contribution|grading (?:structure|scheme|breakdown)|grade (?:breakdown|distribution)|evaluation breakdown)\b/i.test(
        line.text,
      )
    ) {
      pages.add(line.pageNumber);
      pages.add(line.pageNumber + 1);
    }
  }
  return pages;
}

function cleanCategoryName(value: string) {
  return value
    .replace(/^\s*(?:\(?\d+\)?|\(?[a-z]\))\s*/i, "")
    .replace(/[\s:;,|–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findGradingCategories(lines: PageLine[]) {
  const gradingPages = gradingPageNumbers(lines);
  const percentages: Array<{
    name: string;
    weight: number;
    line: PageLine;
  }> = [];
  const points: Array<{
    name: string;
    points: number;
    line: PageLine;
    group: "Individual" | "Team" | null;
  }> = [];
  let group: "Individual" | "Team" | null = null;

  for (const line of lines) {
    if (/\bindividual tasks?\b/i.test(line.text)) group = "Individual";
    if (/\bteam tasks?\b/i.test(line.text)) group = "Team";
    if (!gradingPages.has(line.pageNumber)) continue;

    const percentage = line.text.match(
      /^(.{1,70}?)\s+(\d{1,3}(?:\.\d+)?)\s*%(?:\s+of\s+(?:the\s+)?grade|\s*\(|\s*\[|\s*$)/i,
    );
    if (percentage) {
      const name = cleanCategoryName(percentage[1]);
      const weight = Number(percentage[2]);
      if (name && weight >= 0 && weight <= 100)
        percentages.push({ name, weight, line });
      continue;
    }

    const pointMatch = line.text.match(
      /^(.{1,100}?)\s*\[[^\]]*?(?:=\s*)?(\d{1,3}(?:\.\d+)?)\s*points?\s*\]/i,
    );
    if (pointMatch) {
      const name = cleanCategoryName(pointMatch[1]);
      const pointValue = Number(pointMatch[2]);
      if (name && pointValue > 0)
        points.push({ name, points: pointValue, line, group });
    }
  }

  if (percentages.length >= 2) {
    const seen = new Set<string>();
    return {
      categories: percentages.flatMap(({ name, weight, line }) => {
        const key = name.toLocaleLowerCase("en-US");
        if (seen.has(key)) return [];
        seen.add(key);
        return [extracted({ name, weightPercent: weight }, line, 0.93)];
      }),
      convertedPoints: false,
    };
  }

  const totalPoints = points.reduce((sum, item) => sum + item.points, 0);
  const duplicateNames = new Set(
    points
      .filter(
        (item, index) =>
          points.findIndex(
            (candidate) =>
              candidate.name.toLocaleLowerCase("en-US") ===
              item.name.toLocaleLowerCase("en-US"),
          ) !== index,
      )
      .map((item) => item.name.toLocaleLowerCase("en-US")),
  );
  return {
    categories: totalPoints
      ? points.map((item) => {
          const name =
            duplicateNames.has(item.name.toLocaleLowerCase("en-US")) &&
            item.group
              ? `${item.group} ${item.name}`
              : item.name;
          return extracted(
            {
              name,
              weightPercent: Number(
                ((item.points / totalPoints) * 100).toFixed(4),
              ),
            },
            item.line,
            totalPoints === 100 ? 0.9 : 0.72,
            `Converted from ${item.points} points out of ${totalPoints} total syllabus points.`,
          );
        })
      : [],
    convertedPoints: points.length > 0,
  };
}

function policyKind(
  text: string,
): SyllabusExtractionV1["gradingPolicies"][number]["value"]["kind"] | null {
  if (
    /\b(?:drop|dropped|dropping)\b.*\b(?:lowest|low)\b|\blowest\b.*\b(?:drop|dropped)\b/i.test(
      text,
    )
  )
    return "drop_lowest";
  if (
    /\b(?:replace|replaced|replacement)\b.*\b(?:exam|grade|final)\b/i.test(text)
  )
    return "replacement";
  if (/\b(?:curve|curved|curving)\b/i.test(text)) return "curve";
  if (/\b(?:extra credit|bonus points?)\b/i.test(text)) return "extra_credit";
  if (
    /\b(?:attendance|required to attend|cannot be made up if missed)\b/i.test(
      text,
    )
  )
    return "attendance";
  if (
    /\b(?:no late work|late (?:homework|labs?|projects?|assignments?) (?:will not|won't) be accepted|will not be accepted after)\b/i.test(
      text,
    )
  )
    return "other";
  return null;
}

function findGradingPolicies(lines: PageLine[]) {
  const candidates = lines.flatMap((line, index) => {
    const next = lines[index + 1];
    const variants = [line];
    if (next?.pageNumber === line.pageNumber) {
      variants.push({ ...line, text: `${line.text} ${next.text}` });
    }

    return variants.flatMap((source) => {
      const kind = policyKind(source.text);
      if (!kind) return [];
      let score = Math.min(source.text.length, 240) / 40;
      if (/\bYour lowest\b/i.test(source.text)) score += 8;
      if (/\bmissing\b.*\breplaced\b/i.test(source.text)) score += 8;
      if (/\b(?:will not|won't|no late work)\b/i.test(source.text)) score += 4;
      if (/^(?:0\.|\[\*)/.test(source.text)) score -= 6;
      if (/^(?:Lab Attendance|Lecture Attendance)/i.test(source.text))
        score -= 3;

      if (/\battendance is not graded\b/i.test(source.text)) score += 5;
      let topic = "general";
      if (/\blabs?\b/i.test(source.text)) topic = "lab";
      else if (/\blecture\b/i.test(source.text)) topic = "lecture";
      else if (/\bhomework\b/i.test(source.text)) topic = "homework";
      else if (/\bprojects?\b/i.test(source.text)) topic = "project";
      else if (/\bassignments?\b/i.test(source.text)) topic = "assignment";

      const groupingKey = [
        "drop_lowest",
        "replacement",
        "curve",
        "extra_credit",
      ].includes(kind)
        ? kind
        : `${kind}|${topic}`;
      return [{ kind, groupingKey, source, score }];
    });
  });

  const bestByGroup = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    const existing = bestByGroup.get(candidate.groupingKey);
    if (!existing || candidate.score > existing.score) {
      bestByGroup.set(candidate.groupingKey, candidate);
    }
  }

  return Array.from(bestByGroup.values()).map(({ kind, source }) =>
    extracted(
      {
        kind,
        description: source.text.slice(0, 1_000),
        supportedByCalculator: false as const,
      },
      source,
      0.86,
    ),
  );
}

/**
 * Deterministic, evidence-first extractor used when no model provider is
 * configured. It intentionally covers common syllabus layouts and leaves every
 * derived date or points-to-weight conversion visible for student review.
 */
export class HeuristicSyllabusExtractor implements SyllabusExtractor {
  async extract(input: ExtractorInput): Promise<SyllabusExtractionV1> {
    const lines = pageLines(input);
    const course = findCourse(lines);
    const term = findTerm(lines);
    const section = findSection(lines);
    const timeZone = findTimeZone(lines);
    const people = findPeople(lines);
    const officeHours = findOfficeHours(lines, people, input, timeZone.value);
    const eventResult = findEvents(
      lines,
      term.value ?? input.assumedTerm?.name ?? null,
    );
    const gradingResult = findGradingCategories(lines);
    const gradingPolicies = findGradingPolicies(lines);

    const warnings: SyllabusExtractionV1["warnings"] = [];
    if (!course.code) {
      warnings.push({
        code: "MISSING_COURSE_CODE",
        message: "No clear course code was found. Add it before publishing.",
        severity: "review",
      });
    }
    if (!course.title) {
      warnings.push({
        code: "MISSING_COURSE_TITLE",
        message: "No clear course title was found. Add it before publishing.",
        severity: "review",
      });
    }
    if (people.length === 0) {
      warnings.push({
        code: "MISSING_COURSE_STAFF",
        message: "No named instructor or teaching assistant was found.",
        severity: "review",
      });
    }
    if (gradingResult.categories.length === 0) {
      warnings.push({
        code: "MISSING_GRADING_STRUCTURE",
        message: "No supported grading weights or points structure was found.",
        severity: "review",
      });
    }
    if (gradingResult.convertedPoints) {
      warnings.push({
        code: "POINTS_CONVERTED_TO_WEIGHTS",
        message:
          "Syllabus points were converted to course-weight percentages; review the derived weights.",
        severity: "review",
      });
    }
    if (eventResult.inferredYearCount > 0) {
      warnings.push({
        code: "INFERRED_EVENT_YEARS",
        message: `${eventResult.inferredYearCount} important date(s) used the year from ${term.value ?? input.assumedTerm?.name ?? "the course term"}.`,
        severity: "review",
      });
    }
    if (eventResult.unresolvedDateCount > 0) {
      warnings.push({
        code: "UNRESOLVED_EVENT_DATES",
        message: `${eventResult.unresolvedDateCount} important date(s) had no explicit or course-term year.`,
        severity: "review",
      });
    }
    if (
      lines.some((line) =>
        /\bfinal exam\b.*\b(?:to be determined|TBD|announced)\b/i.test(
          line.text,
        ),
      )
    ) {
      warnings.push({
        code: "UNSCHEDULED_FINAL_EXAM",
        message:
          "The final exam is important but its date is not yet scheduled in the syllabus.",
        severity: "review",
      });
    }

    return syllabusExtractionV1Schema.parse({
      schemaVersion: "1",
      course: {
        code: extracted(course.code, course.codeLine, course.code ? 0.96 : 0),
        title: extracted(
          course.title,
          course.titleLine,
          course.title ? 0.92 : 0,
        ),
        section: extracted(
          section.value,
          section.line,
          section.value ? 0.88 : 0,
        ),
        term: extracted(
          term.value ?? input.assumedTerm?.name ?? null,
          term.line,
          term.line ? 0.96 : 0,
          !term.line && input.assumedTerm?.name
            ? "Taken from the course draft, not the syllabus."
            : undefined,
        ),
        timeZone: extracted(
          timeZone.value,
          timeZone.line,
          timeZone.value ? 0.86 : 0,
          timeZone.ambiguity,
        ),
      },
      people,
      officeHours,
      events: eventResult.events,
      gradingCategories: gradingResult.categories,
      gradingPolicies,
      warnings,
    });
  }
}

/** Backwards-compatible provider name for existing extraction-run fixtures. */
export class FixtureSyllabusExtractor extends HeuristicSyllabusExtractor {}
