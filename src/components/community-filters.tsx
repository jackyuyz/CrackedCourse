"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { InstitutionCombobox } from "@/components/institution-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InstitutionOption } from "@/lib/institutions";

export function CommunityFilters({
  institution,
  initialQuery,
  initialYear,
}: {
  institution: InstitutionOption | null;
  initialQuery: string;
  initialYear: string;
}) {
  const router = useRouter();
  const [school, setSchool] = useState(institution);
  const [query, setQuery] = useState(initialQuery);
  const [year, setYear] = useState(initialYear);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (school) params.set("school", school.id);
    if (query.trim()) params.set("q", query.trim());
    if (/^\d{4}$/.test(year)) params.set("year", year);
    router.push(`/community${params.size ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      className="border-border bg-card grid items-start gap-3 rounded-2xl border p-4 shadow-[0_5px_20px_rgba(2,48,71,0.04)] lg:grid-cols-[1.2fr_1fr_130px_auto]"
    >
      <InstitutionCombobox
        value={school}
        onChange={setSchool}
        placeholder="School name or abbreviation"
      />
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label="Course number or name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Course number or name"
          className="pl-9"
        />
      </div>
      <Input
        aria-label="Term year"
        inputMode="numeric"
        value={year}
        onChange={(event) =>
          /^\d{0,4}$/.test(event.target.value) && setYear(event.target.value)
        }
        placeholder="Year"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
