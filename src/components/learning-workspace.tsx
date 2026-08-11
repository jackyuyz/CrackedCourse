"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  BookOpenText,
  ExternalLink,
  FileText,
  Globe2,
  LinkIcon,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LearningWorkspaceData } from "@/lib/data/learning-units";
import type { CourseMaterial, LearningUnit, LearningUnitNoteVisibility } from "@/lib/learning-units";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ApiError = { error?: { message?: string } };
type MaterialMode = "link" | "file";

function errorMessage(body: unknown, fallback: string) {
  return (body as ApiError | null)?.error?.message ?? fallback;
}

function formattedSize(bytes: number | null) {
  if (bytes === null) return null;
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function materialMimeType(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "pdf") return "application/pdf" as const;
  if (extension === "ppt") return "application/vnd.ms-powerpoint" as const;
  if (extension === "pptx") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation" as const;
  }
  return null;
}

function updateUnitNote(
  units: LearningUnit[],
  unitId: string,
  visibility: LearningUnitNoteVisibility,
  bodyMarkdown: string,
  id: string,
  updatedAt: string,
) {
  return units.map((unit) =>
    unit.id === unitId
      ? {
          ...unit,
          notes: {
            ...unit.notes,
            [visibility]: { id, visibility, bodyMarkdown, updatedAt },
          },
        }
      : unit,
  );
}

export function LearningWorkspace({
  initialData,
  demo,
}: {
  initialData: LearningWorkspaceData;
  demo: boolean;
}) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [units, setUnits] = useState(initialData.units);
  const [hiddenUnits, setHiddenUnits] = useState(initialData.hiddenUnits);
  const [materials, setMaterials] = useState(initialData.materials);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialData.units[0]?.id ?? null,
  );
  const [visibility, setVisibility] = useState<LearningUnitNoteVisibility>("public");
  const [noteBody, setNoteBody] = useState(
    initialData.units[0]?.notes.public?.bodyMarkdown ?? "",
  );
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [unitTitle, setUnitTitle] = useState(initialData.units[0]?.title ?? "");
  const [unitDescription, setUnitDescription] = useState(
    initialData.units[0]?.description ?? "",
  );
  const [newTitle, setNewTitle] = useState("");
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialMode, setMaterialMode] = useState<MaterialMode>("link");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedUnit = units.find((unit) => unit.id === selectedId) ?? null;
  const selectedNote = selectedUnit?.notes[visibility];
  const hasUnpublishedPublicChanges = Boolean(
    initialData.publicationVersion &&
      units.some((unit) => {
        const note = unit.notes.public;
        return note && (!initialData.publishedAt || note.updatedAt > initialData.publishedAt);
      }),
  );

  function selectUnit(unitId: string) {
    const unit = units.find((item) => item.id === unitId);
    if (!unit) return;
    setSelectedId(unitId);
    setUnitTitle(unit.title);
    setUnitDescription(unit.description ?? "");
    setNoteBody(unit.notes[visibility]?.bodyMarkdown ?? "");
    setNoteStatus("idle");
  }

  function selectVisibility(nextVisibility: LearningUnitNoteVisibility) {
    setVisibility(nextVisibility);
    setNoteBody(selectedUnit?.notes[nextVisibility]?.bodyMarkdown ?? "");
    setNoteStatus("idle");
  }

  const saveNote = useCallback(
    async (unitId: string, noteVisibility: LearningUnitNoteVisibility, bodyMarkdown: string) => {
      if (demo) return;
      setNoteStatus("saving");
      try {
        const response = await fetch(`/api/courses/${initialData.courseId}/learning-units/${unitId}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: noteVisibility, bodyMarkdown }),
        });
        const payload = (await response.json().catch(() => null)) as {
          note?: { id: string; visibility: LearningUnitNoteVisibility; body_markdown: string; updated_at: string };
        } & ApiError;
        if (!response.ok || !payload?.note) throw new Error(errorMessage(payload, "We couldn’t save that note."));
        const note = payload.note;
        setUnits((current) => updateUnitNote(current, unitId, note.visibility, note.body_markdown, note.id, note.updated_at));
        setNoteStatus("saved");
      } catch (caught) {
        setNoteStatus("error");
        setError(caught instanceof Error ? caught.message : "We couldn’t save that note.");
      }
    },
    [demo, initialData.courseId],
  );

  useEffect(() => {
    if (!selectedUnit || demo || noteBody === (selectedNote?.bodyMarkdown ?? "")) return;
    const timer = window.setTimeout(() => {
      void saveNote(selectedUnit.id, visibility, noteBody);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [demo, noteBody, saveNote, selectedNote?.bodyMarkdown, selectedUnit, visibility]);

  async function createUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo || !newTitle.trim()) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/courses/${initialData.courseId}/learning-units`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }),
      });
      const payload = (await response.json().catch(() => null)) as { unit?: { id: string; title: string; description: string | null; display_order: number; is_hidden: boolean } } & ApiError;
      if (!response.ok || !payload.unit) throw new Error(errorMessage(payload, "We couldn’t add that learning unit."));
      const unit: LearningUnit = { id: payload.unit.id, title: payload.unit.title, description: payload.unit.description, displayOrder: payload.unit.display_order, isHidden: payload.unit.is_hidden, notes: {} };
      setUnits((current) => [...current, unit]); setSelectedId(unit.id); setUnitTitle(unit.title); setUnitDescription(""); setNoteBody(""); setNoteStatus("idle"); setNewTitle(""); setShowNewUnit(false); setMessage("Learning unit added.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn’t add that learning unit."); } finally { setBusy(false); }
  }

  async function saveUnit() {
    if (demo || !selectedUnit || !unitTitle.trim()) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/courses/${initialData.courseId}/learning-units/${selectedUnit.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: unitTitle, description: unitDescription || null }),
      });
      const payload = (await response.json().catch(() => null)) as ApiError;
      if (!response.ok) throw new Error(errorMessage(payload, "We couldn’t save that learning unit."));
      setUnits((current) => current.map((unit) => unit.id === selectedUnit.id ? { ...unit, title: unitTitle.trim(), description: unitDescription.trim() || null } : unit));
      setMessage("Learning unit saved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn’t save that learning unit."); } finally { setBusy(false); }
  }

  async function toggleUnitHidden(unit: LearningUnit, isHidden: boolean) {
    if (demo) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/courses/${initialData.courseId}/learning-units/${unit.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isHidden }),
      });
      const payload = (await response.json().catch(() => null)) as ApiError;
      if (!response.ok) throw new Error(errorMessage(payload, "We couldn’t update that learning unit."));
      if (isHidden) {
        setUnits((current) => current.filter((item) => item.id !== unit.id));
        setHiddenUnits((current) => [...current, { ...unit, isHidden: true }]);
        if (selectedId === unit.id) {
          const nextUnit = units.find((item) => item.id !== unit.id);
          setSelectedId(nextUnit?.id ?? null);
          setUnitTitle(nextUnit?.title ?? "");
          setUnitDescription(nextUnit?.description ?? "");
          setNoteBody(nextUnit?.notes[visibility]?.bodyMarkdown ?? "");
          setNoteStatus("idle");
        }
      } else {
        setHiddenUnits((current) => current.filter((item) => item.id !== unit.id));
        setUnits((current) => [...current, { ...unit, isHidden: false }].toSorted((left, right) => left.displayOrder - right.displayOrder));
      }
      setMessage(isHidden ? "Unit hidden. Publish an update to remove it from Community." : "Unit restored.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn’t update that learning unit."); } finally { setBusy(false); }
  }

  async function moveUnit(index: number, direction: -1 | 1) {
    if (demo || index + direction < 0 || index + direction >= units.length) return;
    const reordered = [...units];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    const normalized = reordered.map((unit, displayOrder) => ({ ...unit, displayOrder }));
    setUnits(normalized);
    try {
      const response = await fetch(`/api/courses/${initialData.courseId}/learning-units/reorder`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitIds: normalized.map((unit) => unit.id) }),
      });
      if (!response.ok) throw new Error();
    } catch { router.refresh(); setError("We couldn’t reorder learning units. The latest saved order was restored."); }
  }

  async function addMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo || !materialTitle.trim()) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      let payload: Record<string, unknown>;
      if (materialMode === "link") {
        payload = { kind: "link", title: materialTitle, learningUnitId: selectedUnit?.id ?? null, externalUrl: materialUrl };
      } else {
        if (!materialFile) throw new Error("Choose a PDF or slide deck.");
        const mimeType = materialMimeType(materialFile);
        if (!mimeType || materialFile.size > 20 * 1024 * 1024) throw new Error("Choose a PDF, .ppt, or .pptx file smaller than 20 MB.");
        const supabase = createClient();
        const { data: userResult, error: userError } = await supabase.auth.getUser();
        if (userError || !userResult.user) throw new Error("Sign in again before uploading a material.");
        const safeName = materialFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const storagePath = `${userResult.user.id}/${crypto.randomUUID()}/${safeName}`;
        const { error: uploadError } = await supabase.storage.from("course-materials").upload(storagePath, materialFile, { cacheControl: "3600", contentType: mimeType, upsert: false });
        if (uploadError) throw new Error("The material upload failed. Try again.");
        payload = { kind: "file", title: materialTitle, learningUnitId: selectedUnit?.id ?? null, storagePath, originalName: materialFile.name, mimeType, sizeBytes: materialFile.size };
      }
      const response = await fetch(`/api/courses/${initialData.courseId}/materials`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await response.json().catch(() => null)) as { material?: { id: string; title: string; kind: "file" | "link"; material_type: "pdf" | "slides" | "link" | "other"; learning_unit_id: string | null; external_url: string | null; original_name: string | null; size_bytes: number | null; is_hidden: boolean } } & ApiError;
      if (!response.ok || !body.material) throw new Error(errorMessage(body, "We couldn’t save that material."));
      const material: CourseMaterial = { id: body.material.id, title: body.material.title, kind: body.material.kind, materialType: body.material.material_type, learningUnitId: body.material.learning_unit_id, externalUrl: body.material.external_url, originalName: body.material.original_name, sizeBytes: body.material.size_bytes, isHidden: body.material.is_hidden };
      setMaterials((current) => [...current, material]); setMaterialTitle(""); setMaterialUrl(""); setMaterialFile(null); if (uploadInputRef.current) uploadInputRef.current.value = ""; setShowMaterialForm(false); setMessage("Private material added.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn’t add that material."); } finally { setBusy(false); }
  }

  async function hideMaterial(material: CourseMaterial) {
    if (demo) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/courses/${initialData.courseId}/materials/${material.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isHidden: true }) });
      const body = (await response.json().catch(() => null)) as ApiError;
      if (!response.ok) throw new Error(errorMessage(body, "We couldn’t hide that material."));
      setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, isHidden: true } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn’t hide that material."); } finally { setBusy(false); }
  }

  const visibleMaterials = materials.filter((material) => !material.isHidden);
  const selectedMaterials = selectedUnit ? visibleMaterials.filter((material) => material.learningUnitId === selectedUnit.id) : [];
  const courseMaterials = visibleMaterials.filter((material) => material.learningUnitId === null);

  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[245px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Card className="gap-0 py-0 shadow-none"><CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between px-2 pt-1"><p className="text-muted-foreground text-[10px] font-bold tracking-[0.1em] uppercase">Learning units</p><Button type="button" size="icon-sm" variant="ghost" onClick={() => setShowNewUnit((current) => !current)} disabled={demo || busy} aria-label="Add learning unit"><Plus className="size-4" /></Button></div>
          {showNewUnit ? <form onSubmit={createUnit} className="space-y-2 border-border mb-2 rounded-lg border p-2"><Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. Chapter 1 Intro" autoFocus maxLength={180} /><Button type="submit" size="sm" className="w-full" disabled={busy || !newTitle.trim()}>{busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Add unit</Button></form> : null}
          <nav className="space-y-1" aria-label="Learning units">
            {units.map((unit, index) => <div key={unit.id} className={cn("group flex items-center rounded-lg", selectedId === unit.id ? "bg-ocean/10 text-navy" : "text-muted-foreground hover:bg-muted hover:text-navy")}><button type="button" onClick={() => selectUnit(unit.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm font-semibold"><span className="block truncate">{unit.title}</span></button><div className="mr-1 hidden gap-0.5 group-hover:flex focus-within:flex"><Button type="button" variant="ghost" size="icon-sm" onClick={() => void moveUnit(index, -1)} disabled={demo || busy || index === 0} aria-label={`Move ${unit.title} up`}><ArrowUp className="size-3" /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => void moveUnit(index, 1)} disabled={demo || busy || index === units.length - 1} aria-label={`Move ${unit.title} down`}><ArrowDown className="size-3" /></Button></div></div>)}
          </nav>
          {!units.length ? <p className="text-muted-foreground px-3 py-6 text-center text-xs leading-5">Create chapters, topics, weeks, or any structure that suits this course.</p> : null}
        </CardContent></Card>
        {hiddenUnits.length ? <Card className="gap-0 py-0 shadow-none"><CardContent className="p-3"><p className="text-muted-foreground px-2 pt-1 pb-2 text-[10px] font-bold tracking-[0.1em] uppercase">Hidden units</p>{hiddenUnits.map((unit) => <div key={unit.id} className="flex items-center gap-2 px-2 py-1.5"><span className="min-w-0 flex-1 truncate text-xs font-semibold">{unit.title}</span><Button type="button" size="sm" variant="ghost" onClick={() => void toggleUnitHidden(unit, false)} disabled={demo || busy}><ArchiveRestore className="size-3.5" /> Restore</Button></div>)}</CardContent></Card> : null}
      </aside>

      <div className="min-w-0 space-y-6">
        {error ? <div role="alert" className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm">{error}</div> : null}
        {message ? <div className="border-ocean/20 bg-ocean/6 text-navy rounded-xl border px-4 py-3 text-sm">{message}</div> : null}
        {initialData.publicationVersion ? <div className="border-ocean/20 bg-ocean/6 text-navy flex items-start gap-3 rounded-xl border p-4 text-xs leading-5"><Globe2 className="text-ocean mt-0.5 size-4 shrink-0" /><p>{hasUnpublishedPublicChanges ? <>You have unpublished learning updates. Use <strong>Update public snapshot</strong> in the course menu when they are ready to share.</> : <>Public course notes are included in Community only when you update the public snapshot. Current snapshot: v{initialData.publicationVersion}.</>}</p></div> : null}

        {selectedUnit ? <>
          <Card className="gap-0 py-0"><CardHeader className="border-border border-b px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><BookOpenText className="text-ocean size-4" /> Learning unit</CardTitle></CardHeader><CardContent className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="space-y-1.5"><Label htmlFor="unit-title">Title</Label><Input id="unit-title" value={unitTitle} onChange={(event) => setUnitTitle(event.target.value)} disabled={demo || busy} maxLength={180} /></div><div className="flex items-end gap-2"><Button type="button" onClick={() => void saveUnit()} disabled={demo || busy || !unitTitle.trim()}>Save unit</Button><Button type="button" variant="outline" onClick={() => void toggleUnitHidden(selectedUnit, true)} disabled={demo || busy}><ArchiveRestore className="size-4" /> Hide</Button></div></div><div className="space-y-1.5"><Label htmlFor="unit-description">Description <span className="text-muted-foreground">(optional)</span></Label><Textarea id="unit-description" value={unitDescription} onChange={(event) => setUnitDescription(event.target.value)} disabled={demo || busy} maxLength={1000} /></div></CardContent></Card>

          <Card className="gap-0 py-0"><CardHeader className="border-border border-b px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><FileText className="text-ocean size-4" /> Unit materials <Badge variant="outline" className="ml-auto bg-white text-[9px]">Private</Badge></CardTitle></CardHeader><CardContent className="space-y-3 p-5">{selectedMaterials.map((material) => <MaterialRow key={material.id} material={material} courseId={initialData.courseId} demo={demo} busy={busy} onHide={hideMaterial} />)}{!selectedMaterials.length ? <p className="text-muted-foreground text-sm">No materials are attached to this unit yet.</p> : null}<Button type="button" variant="outline" size="sm" onClick={() => setShowMaterialForm((current) => !current)} disabled={demo || busy}><Plus className="size-3.5" /> Add material</Button>{showMaterialForm ? <form onSubmit={addMaterial} className="border-border space-y-3 rounded-xl border p-4"><div className="flex gap-2"><Button type="button" size="sm" variant={materialMode === "link" ? "default" : "outline"} onClick={() => setMaterialMode("link")}>Link</Button><Button type="button" size="sm" variant={materialMode === "file" ? "default" : "outline"} onClick={() => setMaterialMode("file")}>File</Button></div><div className="space-y-1.5"><Label htmlFor="material-title">Title</Label><Input id="material-title" value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} maxLength={180} /></div>{materialMode === "link" ? <div className="space-y-1.5"><Label htmlFor="material-url">HTTPS link</Label><Input id="material-url" type="url" placeholder="https://…" value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} /></div> : <div className="space-y-1.5"><Label htmlFor="material-file">PDF or slide deck</Label><Input ref={uploadInputRef} id="material-file" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => { const next = event.target.files?.[0] ?? null; setMaterialFile(next); if (next && !materialTitle) setMaterialTitle(next.name.replace(/\.[^.]+$/, "")); }} /><p className="text-muted-foreground text-xs">Private files only; maximum 20 MB.</p></div>}<Button type="submit" size="sm" disabled={busy || !materialTitle.trim() || (materialMode === "link" ? !materialUrl.trim() : !materialFile)}>{busy ? <LoaderCircle className="size-3.5 animate-spin" /> : materialMode === "file" ? <Upload className="size-3.5" /> : <LinkIcon className="size-3.5" />} Add private material</Button></form> : null}</CardContent></Card>

          <Card className="gap-0 py-0"><CardHeader className="border-border border-b px-5 py-0"><div className="flex gap-5"><button type="button" onClick={() => selectVisibility("public")} className={cn("relative flex h-12 items-center gap-2 text-sm font-bold", visibility === "public" ? "text-navy" : "text-muted-foreground")}><Globe2 className="size-3.5" /> Public course note{visibility === "public" ? <span className="bg-ocean absolute inset-x-0 bottom-0 h-0.5 rounded-full" /> : null}</button><button type="button" onClick={() => selectVisibility("private")} className={cn("relative flex h-12 items-center gap-2 text-sm font-bold", visibility === "private" ? "text-navy" : "text-muted-foreground")}><LockKeyhole className="size-3.5" /> Private note{visibility === "private" ? <span className="bg-ocean absolute inset-x-0 bottom-0 h-0.5 rounded-full" /> : null}</button></div></CardHeader><CardContent className="p-5"><p className="text-muted-foreground mb-3 text-xs leading-5">{visibility === "public" ? "Saved locally until you update the Community snapshot. Private notes and materials are never published." : "Visible only in your private workspace. It will never be included in Community."}</p><Textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} onBlur={() => void saveNote(selectedUnit.id, visibility, noteBody)} disabled={demo} placeholder={visibility === "public" ? "Write an explanation, summary, or study guidance for this unit…" : "Write personal reminders, questions, or scratch notes…"} className="min-h-72 font-mono text-sm leading-6" maxLength={120000} /><div className="text-muted-foreground mt-3 flex items-center justify-between text-xs"><span>{noteBody.length.toLocaleString()} / 120,000</span><span>{demo ? "Demo notes are read only" : noteStatus === "saving" ? "Saving…" : noteStatus === "saved" ? "Saved" : noteStatus === "error" ? "Couldn’t save — retry on blur" : ""}</span></div></CardContent></Card>
        </> : <Card><CardContent className="p-8 text-center"><BookOpenText className="text-ocean mx-auto size-7" /><h2 className="text-navy mt-4 text-base font-extrabold">Start with a learning unit</h2><p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">Add chapters, topics, weeks, or your own course structure. Each unit can keep public course notes and private notes side by side.</p><Button type="button" className="mt-5" onClick={() => setShowNewUnit(true)} disabled={demo}><Plus className="size-4" /> Add learning unit</Button></CardContent></Card>}

        {courseMaterials.length ? <Card className="gap-0 py-0"><CardHeader className="border-border border-b px-5 py-4"><CardTitle className="flex items-center gap-2 text-sm font-extrabold"><FileText className="text-ocean size-4" /> Course materials <Badge variant="outline" className="ml-auto bg-white text-[9px]">Private</Badge></CardTitle></CardHeader><CardContent className="space-y-3 p-5">{courseMaterials.map((material) => <MaterialRow key={material.id} material={material} courseId={initialData.courseId} demo={demo} busy={busy} onHide={hideMaterial} />)}</CardContent></Card> : null}
      </div>
    </div>
  );
}

function MaterialRow({ material, courseId, demo, busy, onHide }: { material: CourseMaterial; courseId: string; demo: boolean; busy: boolean; onHide: (material: CourseMaterial) => Promise<void> }) {
  const Icon = material.kind === "link" ? LinkIcon : FileText;
  const href = material.kind === "link" ? material.externalUrl : `/api/courses/${courseId}/materials/${material.id}/open`;
  return <div className="border-border flex flex-wrap items-center gap-3 rounded-xl border p-3"><span className="bg-sky/25 text-ocean grid size-9 place-items-center rounded-lg"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-navy truncate text-sm font-bold">{material.title}</p><p className="text-muted-foreground mt-0.5 text-[10px]">{material.kind === "link" ? "Private link" : `${material.materialType === "pdf" ? "PDF" : "Slide deck"}${formattedSize(material.sizeBytes) ? ` · ${formattedSize(material.sizeBytes)}` : ""}`}</p></div>{demo ? <Button type="button" size="sm" variant="outline" disabled>Preview unavailable</Button> : <><Button asChild type="button" size="sm" variant="outline"><a href={href ?? undefined} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Open</a></Button><Button type="button" size="sm" variant="ghost" onClick={() => void onHide(material)} disabled={busy} aria-label={`Hide ${material.title}`}><ArchiveRestore className="size-3.5" /> Hide</Button></>}</div>;
}
