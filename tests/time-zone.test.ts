import { describe, expect, it } from "vitest";

import { getGreetingForTimeZone, PRIMARY_TIME_ZONE } from "@/lib/time-zone";

describe("getGreetingForTimeZone", () => {
  it.each([
    ["2026-08-09T05:00:00.000Z", "Hello night owl"],
    ["2026-08-09T10:00:00.000Z", "Rise and shine"],
    ["2026-08-09T13:00:00.000Z", "Good morning"],
    ["2026-08-09T19:00:00.000Z", "Good afternoon"],
    ["2026-08-10T01:00:00.000Z", "Good evening"],
    ["2026-08-10T03:00:00.000Z", "Burning the midnight oil"],
  ])("uses the provided time zone for %s", (timestamp, expected) => {
    expect(getGreetingForTimeZone(new Date(timestamp), PRIMARY_TIME_ZONE)).toBe(
      expected,
    );
  });

  it("can use the browser’s resolved time zone instead of New York", () => {
    expect(
      getGreetingForTimeZone(
        new Date("2026-08-09T02:00:00.000Z"),
        "America/Los_Angeles",
      ),
    ).toBe("Good evening");
  });

  it("handles New York standard time as well as daylight time", () => {
    expect(
      getGreetingForTimeZone(
        new Date("2026-01-09T14:00:00.000Z"),
        PRIMARY_TIME_ZONE,
      ),
    ).toBe("Good morning");
  });
});
