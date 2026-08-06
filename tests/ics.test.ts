import { describe, expect, it } from "vitest";

import {
  createIcsCalendar,
  escapeIcsText,
  foldIcsLine,
} from "@/lib/calendar/ics";

describe("iCalendar export", () => {
  it("escapes text and folds lines to RFC 5545 byte limits", () => {
    expect(escapeIcsText("A, B; C\\D\nE")).toBe("A\\, B\\; C\\\\D\\nE");
    const folded = foldIcsLine(`DESCRIPTION:${"课".repeat(40)}`);
    expect(folded).toContain("\r\n ");
    expect(
      folded.split("\r\n").every((line) => Buffer.byteLength(line) <= 75),
    ).toBe(true);
  });

  it("exports deterministic all-day and timed events", () => {
    const calendar = createIcsCalendar(
      [
        {
          uid: "midterm@crackedcourse",
          title: "Midterm, part 1",
          isAllDay: true,
          startDate: "2026-10-10",
          timeZone: "America/New_York",
        },
        {
          uid: "office-hours@crackedcourse",
          title: "Office hours",
          isAllDay: false,
          startsAt: "2026-10-12T18:00:00.000Z",
          endsAt: "2026-10-12T19:00:00.000Z",
          timeZone: "America/New_York",
          rrule: "FREQ=WEEKLY;BYDAY=MO",
        },
      ],
      { generatedAt: new Date("2026-08-05T12:00:00.000Z") },
    );

    expect(calendar).toContain("DTSTART;VALUE=DATE:20261010");
    expect(calendar).toContain("DTEND;VALUE=DATE:20261011");
    expect(calendar).toContain("DTSTART;TZID=America/New_York:20261012T140000");
    expect(calendar).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");
    expect(calendar.endsWith("\r\n")).toBe(true);
  });
});
