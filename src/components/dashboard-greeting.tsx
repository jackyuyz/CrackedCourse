"use client";

import { useSyncExternalStore } from "react";

import { getGreetingForTimeZone } from "@/lib/time-zone";

function subscribeToBrowserTimeZone() {
  return () => {};
}

function browserGreetingSnapshot() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return getGreetingForTimeZone(new Date(), timeZone);
}

function serverGreetingSnapshot() {
  return null;
}

export function DashboardGreeting({ displayName }: { displayName: string }) {
  const greeting = useSyncExternalStore(
    subscribeToBrowserTimeZone,
    browserGreetingSnapshot,
    serverGreetingSnapshot,
  );

  return `${greeting ?? "Hello"}, ${displayName}.`;
}
