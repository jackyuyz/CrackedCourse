import { describe, expect, it } from "vitest";

import { getGreetingForTimeZone, PRIMARY_TIME_ZONE } from "@/lib/time-zone";

describe("getGreetingForTimeZone", () => {
  it.each([
    ["2026-08-09T13:00:00.000Z", "Good morning"],
    ["2026-08-09T19:00:00.000Z", "Good afternoon"],
    ["2026-08-10T01:00:00.000Z", "Good evening"],
  ])("uses New York local time for %s", (timestamp, expected) => {
    expect(getGreetingForTimeZone(new Date(timestamp), PRIMARY_TIME_ZONE)).toBe(
      expected,
    );
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
