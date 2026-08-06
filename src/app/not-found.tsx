import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-5 text-center">
      <div className="max-w-sm">
        <span className="bg-sky/20 text-ocean mx-auto grid size-14 place-items-center rounded-2xl">
          <SearchX className="size-6" />
        </span>
        <p className="text-ocean mt-5 font-mono text-xs font-bold">404</p>
        <h1 className="text-navy mt-2 text-xl font-extrabold tracking-[-0.03em]">
          That workspace item isn’t here
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          It may have been removed, archived, or belong to another account.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}
