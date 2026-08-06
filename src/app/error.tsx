"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div className="max-w-sm">
        <span className="bg-orange/10 text-orange mx-auto grid size-14 place-items-center rounded-2xl">
          <CircleAlert className="size-6" />
        </span>
        <h1 className="text-navy mt-5 text-xl font-extrabold tracking-[-0.03em]">
          Something interrupted the workspace
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Your saved data is safe. Try loading this view again.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RotateCcw className="size-4" /> Try again
        </Button>
      </div>
    </main>
  );
}
