"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileSettingsForm({
  displayName,
  email,
  primaryTimeZone,
  readOnly = false,
}: {
  displayName: string;
  email: string;
  primaryTimeZone: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [savedName, setSavedName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trimmedName = name.trim();
  const changed = trimmedName !== savedName;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || readOnly || !changed || !trimmedName) return;

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmedName }),
      });
      const body = (await response.json().catch(() => null)) as {
        profile?: { displayName?: string };
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(
          body?.error?.message ?? "We couldn’t save your profile. Try again.",
        );
      }

      const nextSavedName = body?.profile?.displayName ?? trimmedName;
      setName(nextSavedName);
      setSavedName(nextSavedName);
      setMessage("Display name saved everywhere.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn’t save your profile. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={saveProfile} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setMessage(null);
              setError(null);
            }}
            minLength={1}
            maxLength={80}
            required
            disabled={readOnly || saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-setting">Email</Label>
          <Input id="email-setting" value={email} disabled />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Primary time zone</Label>
        <Input id="timezone" value={primaryTimeZone} disabled />
        <p className="text-muted-foreground text-[10px] leading-5">
          Fixed to New York time. Course time zones take priority when a
          syllabus specifies one.
        </p>
      </div>

      <div className="border-border flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5">
          {readOnly ? (
            <p className="text-muted-foreground text-xs">
              Demo profile settings are read-only.
            </p>
          ) : message ? (
            <p
              className="text-ocean flex items-center gap-1.5 text-xs"
              role="status"
            >
              <Check className="size-3.5" /> {message}
            </p>
          ) : error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              This name appears in your workspace and sidebar.
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={readOnly || saving || !changed || !trimmedName}
        >
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}
