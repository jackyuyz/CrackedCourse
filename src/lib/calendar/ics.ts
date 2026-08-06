import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export interface CalendarExportEvent {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  isAllDay: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  timeZone: string;
  rrule?: string | null;
  updatedAt?: string | null;
}

export function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let current = "";

  for (const character of line) {
    const prefix = chunks.length === 0 ? "" : " ";
    const candidate = current + character;
    if (Buffer.byteLength(prefix + candidate, "utf8") > 75) {
      chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  chunks.push(current);
  return chunks.join("\r\n ");
}

function compactDate(date: string) {
  return date.replaceAll("-", "");
}

function utcTimestamp(value: string) {
  return formatInTimeZone(new Date(value), "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

function localTimestamp(value: string, timeZone: string) {
  return formatInTimeZone(new Date(value), timeZone, "yyyyMMdd'T'HHmmss");
}

function eventLines(event: CalendarExportEvent, generatedAt: Date) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${formatInTimeZone(generatedAt, "UTC", "yyyyMMdd'T'HHmmss'Z'")}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.isAllDay && event.startDate) {
    const inclusiveEnd = event.endDate ?? event.startDate;
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.startDate)}`);
    lines.push(
      `DTEND;VALUE=DATE:${compactDate(
        addDays(new Date(`${inclusiveEnd}T00:00:00Z`), 1)
          .toISOString()
          .slice(0, 10),
      )}`,
    );
  } else if (event.startsAt) {
    lines.push(
      `DTSTART;TZID=${event.timeZone}:${localTimestamp(event.startsAt, event.timeZone)}`,
    );
    if (event.endsAt) {
      lines.push(
        `DTEND;TZID=${event.timeZone}:${localTimestamp(event.endsAt, event.timeZone)}`,
      );
    }
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.rrule) {
    lines.push(`RRULE:${event.rrule.replace(/^RRULE:/i, "")}`);
  }
  if (event.updatedAt) {
    lines.push(`LAST-MODIFIED:${utcTimestamp(event.updatedAt)}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

export function createIcsCalendar(
  events: CalendarExportEvent[],
  options: { name?: string; generatedAt?: Date } = {},
) {
  const name = options.name ?? "CrackedCourse";
  const generatedAt = options.generatedAt ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CrackedCourse//Course Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(name)}`,
    ...events.flatMap((event) => eventLines(event, generatedAt)),
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
