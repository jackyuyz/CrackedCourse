export const PRIMARY_TIME_ZONE = "America/New_York" as const;

export function getGreetingForTimeZone(
  date: Date = new Date(),
  timeZone: string = PRIMARY_TIME_ZONE,
) {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  })
    .formatToParts(date)
    .find((part) => part.type === "hour");
  const hour = Number(hourPart?.value);

  if (hour < 5) return "Hello night owl";
  if (hour < 8) return "Rise and shine";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Burning the midnight oil";
}

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
