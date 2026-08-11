import { describe, expect, it } from "vitest";

import { buildCommunityCalendarData } from "@/lib/community-calendar";

describe("buildCommunityCalendarData", () => {
  it("maps confirmed shared events into the local calendar model", () => {
    const data = buildCommunityCalendarData({
      id: "publication-id",
      courseCode: "36-202",
      courseTitle: "Methods for Statistics & Data Science",
      section: null,
      termName: "Fall 2025",
      timeZone: "America/New_York",
      events: [
        {
          title: "Midterm",
          event_type: "exam",
          starts_at: "2025-10-06T15:00:00.000Z",
          start_date: null,
          is_all_day: false,
          time_zone: "America/New_York",
          location: "Baker Hall",
          status: "confirmed",
        },
        {
          title: "Project due",
          event_type: "project",
          starts_at: null,
          start_date: "2025-10-22",
          is_all_day: true,
          time_zone: "America/New_York",
          location: null,
          status: "confirmed",
        },
      ],
    });

    expect(data.courses).toEqual([
      expect.objectContaining({
        id: "publication-id",
        code: "36-202",
        color: "ocean",
      }),
    ]);
    expect(data.events).toEqual([
      expect.objectContaining({
        title: "Midterm",
        type: "exam",
        date: "2025-10-06",
        time: "11:00 AM",
        location: "Baker Hall",
      }),
      expect.objectContaining({
        title: "Project due",
        type: "project",
        date: "2025-10-22",
        time: null,
      }),
    ]);
  });

  it("omits unconfirmed or dateless events from a shared calendar", () => {
    const data = buildCommunityCalendarData({
      id: "publication-id",
      courseCode: "36-202",
      courseTitle: "Methods for Statistics & Data Science",
      section: null,
      termName: null,
      timeZone: "America/New_York",
      events: [
        {
          title: "Draft exam",
          event_type: "exam",
          starts_at: "2025-10-06T15:00:00.000Z",
          start_date: null,
          is_all_day: false,
          time_zone: "America/New_York",
          location: null,
          status: "draft",
        },
        {
          title: "Missing date",
          event_type: "other",
          starts_at: null,
          start_date: null,
          is_all_day: true,
          time_zone: null,
          location: null,
          status: "confirmed",
        },
      ],
    });

    expect(data.events).toEqual([]);
  });
});
