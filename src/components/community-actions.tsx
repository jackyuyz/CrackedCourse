"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flag, FolderInput, LoaderCircle, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

async function apiMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    courseId?: string;
    endorsed?: boolean;
  } | null;
  if (!response.ok) throw new Error(body?.error?.message ?? fallback);
  return body;
}

export function CommunityActions({
  publicationId,
  isOwner,
  endorsed,
}: {
  publicationId: string;
  isOwner: boolean;
  endorsed: boolean;
}) {
  const router = useRouter();
  const [isEndorsed, setIsEndorsed] = useState(endorsed);
  const [busy, setBusy] = useState<"import" | "endorse" | "report" | null>(
    null,
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("incorrect");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importCourse() {
    setBusy("import");
    setError(null);
    try {
      const response = await fetch(`/api/community/${publicationId}/import`, {
        method: "POST",
      });
      const body = await apiMessage(
        response,
        "We couldn’t import this course. Try again.",
      );
      if (body?.courseId) {
        router.push(`/courses/${body.courseId}`);
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleEndorsement() {
    setBusy("endorse");
    setError(null);
    try {
      const response = await fetch(
        `/api/community/${publicationId}/endorsement`,
        { method: "POST" },
      );
      const body = await apiMessage(
        response,
        "We couldn’t update your endorsement.",
      );
      setIsEndorsed(Boolean(body?.endorsed));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("report");
    setError(null);
    try {
      const response = await fetch(`/api/community/${publicationId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || null }),
      });
      await apiMessage(response, "We couldn’t submit this report.");
      setReportOpen(false);
      setMessage("Report submitted for review.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!isOwner ? (
          <>
            <Button onClick={importCourse} disabled={Boolean(busy)}>
              {busy === "import" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FolderInput className="size-4" />
              )}
              Import private copy
            </Button>
            <Button
              variant={isEndorsed ? "default" : "outline"}
              onClick={toggleEndorsement}
              disabled={Boolean(busy)}
            >
              {busy === "endorse" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ThumbsUp className="size-4" />
              )}
              {isEndorsed ? "Endorsed" : "Endorse"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setError(null);
                setReportOpen(true);
              }}
            >
              <Flag className="size-4" /> Report
            </Button>
          </>
        ) : (
          <p className="bg-ocean/8 text-ocean rounded-lg px-3 py-2 text-xs font-semibold">
            This is your published snapshot.
          </p>
        )}
      </div>
      {message ? (
        <p role="status" className="text-ocean mt-2 text-xs">
          {message}
        </p>
      ) : null}
      {error && !reportOpen ? (
        <p role="alert" className="text-destructive mt-2 text-xs">
          {error}
        </p>
      ) : null}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this publication</DialogTitle>
            <DialogDescription>
              Reports help protect students, contributors, and copyright
              holders. The publication stays visible until it is reviewed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="report-reason" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incorrect">Incorrect course information</SelectItem>
                  <SelectItem value="copyright">Copyright concern</SelectItem>
                  <SelectItem value="personal_information">Personal information</SelectItem>
                  <SelectItem value="spam">Spam or abuse</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-details">Details (optional)</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={1000}
                rows={4}
              />
            </div>
            {error ? (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportOpen(false)}
                disabled={busy === "report"}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy === "report"}>
                {busy === "report" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Flag className="size-4" />
                )}
                Submit report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
