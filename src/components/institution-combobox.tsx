"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown, LoaderCircle, School, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InstitutionOption } from "@/lib/institutions";
import { institutionLocation } from "@/lib/institutions";
import { cn } from "@/lib/utils";

export function InstitutionCombobox({
  value,
  onChange,
  inputId,
  disabled = false,
  placeholder = "Search a U.S. or Canadian school",
}: {
  value: InstitutionOption | null;
  onChange: (institution: InstitutionOption | null) => void;
  inputId?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 2 || query === value?.name) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/institutions?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const body = (await response.json().catch(() => null)) as {
          institutions?: InstitutionOption[];
        } | null;
        setResults(response.ok ? (body?.institutions ?? []) : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, value?.name]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <School className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value && event.target.value !== value.name) onChange(null);
            setOpen(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className="pr-20 pl-9"
        />
        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label="Clear school"
              onClick={() => {
                onChange(null);
                setQuery("");
                setOpen(true);
              }}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label="Show school suggestions"
            onClick={() => setOpen((current) => !current)}
          >
            <ChevronsUpDown className="size-3.5" />
          </Button>
        </div>
      </div>

      {open && query.trim().length >= 2 && query !== value?.name ? (
        <div
          id={listId}
          role="listbox"
          className="bg-popover ring-foreground/10 absolute z-70 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl p-1.5 shadow-xl ring-1"
        >
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-xs">
              <LoaderCircle className="size-3.5 animate-spin" /> Searching
            </div>
          ) : results.length > 0 ? (
            results.map((institution) => (
              <button
                key={institution.id}
                type="button"
                role="option"
                aria-selected={institution.id === value?.id}
                className={cn(
                  "hover:bg-accent focus-visible:bg-accent flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left outline-none",
                  institution.id === value?.id && "bg-accent",
                )}
                onClick={() => {
                  onChange(institution);
                  setQuery(institution.name);
                  setOpen(false);
                }}
              >
                <School className="text-ocean mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-navy block truncate text-sm font-semibold">
                    {institution.name}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-[10px]">
                    {institutionLocation(institution)}
                  </span>
                </span>
                {institution.id === value?.id ? (
                  <Check className="text-ocean mt-0.5 size-4" />
                ) : null}
              </button>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-3 text-xs">
              No matching school yet. Try its full name or abbreviation.
            </p>
          )}
        </div>
      ) : null}

      {value ? (
        <p className="text-muted-foreground mt-1.5 text-[10px]">
          {institutionLocation(value)}
        </p>
      ) : null}
    </div>
  );
}
