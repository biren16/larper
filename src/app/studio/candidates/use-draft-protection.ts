"use client";
import { startTransition, useEffect, useRef, useState } from "react";
export type EditorResult = { ok: boolean; error?: string; revision?: number; conflict?: boolean; mediaId?: string; destination?: string };
export type EditorAction = (data: FormData) => void | EditorResult | Promise<void | EditorResult>;
export function useDraftProtection(key: string, initialVersion: number, action?: EditorAction) {
 const form = useRef<HTMLFormElement>(null);
 const version = useRef(initialVersion);
 const sequence = useRef(0);
 const dirty = useRef(false);
 const saving = useRef(false);
 const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const [currentVersion, setCurrentVersion] = useState(initialVersion);
 const conflicted = useRef(false);
 const [status, setStatus] = useState("Saved");
 const [failure, setFailure] = useState("");
 const [recovery, setRecovery] = useState<Record<string,string[]> | null>(null);
 const store = () => {
  if (!form.current) return;
  const values: Record<string,string[]> = {};
  for (const [name,value] of new FormData(form.current)) if (typeof value === "string" && !["editorialVersion","independentSourcesConfirmed"].includes(name)) (values[name] ??= []).push(value);
  try { sessionStorage.setItem(key,JSON.stringify(values)); } catch { /* Writing stays in the form if storage is unavailable. */ }
 };
 const clear = () => { try { sessionStorage.removeItem(key); } catch {} };
 const save = async (selected = action, data?: FormData) => {
  if (!selected || !form.current || saving.current || conflicted.current) return;
  clearTimeout(timer.current); saving.current = true; setStatus("Saving"); store();
  const start = sequence.current;
  const submitted = data ?? new FormData(form.current);
  submitted.set("editorialVersion",String(version.current));
  try {
   const result = await new Promise<void | EditorResult>((resolve,reject) => {
     startTransition(async () => { try { resolve(await selected(submitted)); } catch (error) { reject(error); } });
   });
   if (result && !result.ok) { setFailure(result.error ?? "Could not save"); conflicted.current=Boolean(result.conflict); setStatus(result.conflict ? "Conflict" : "Save failed"); dirty.current=true; return; }
   if (result?.revision !== undefined) { version.current=result.revision; setCurrentVersion(result.revision); }
   if (result?.mediaId) {
    const select = form.current.elements.namedItem("mediaId") as HTMLSelectElement;
    select.add(new Option("Uploaded cover",result.mediaId)); select.value=result.mediaId;
    dirty.current=true; sequence.current++;
   }
   setFailure("");
   if (sequence.current === start) { dirty.current=false; clear(); setStatus("Saved"); }
   else { setStatus("Unsaved"); store(); timer.current=setTimeout(() => void save(),1000); }
   if (result?.destination) window.location.assign(result.destination);
  } catch (error) { setFailure(error instanceof Error ? error.message : "Could not save"); setStatus("Save failed"); dirty.current=true; }
  finally { saving.current=false; }
 };
 const changed = () => {
  dirty.current=true; sequence.current++; store();
  if (!conflicted.current) { setStatus("Unsaved"); clearTimeout(timer.current); timer.current=setTimeout(() => void save(),1000); }
 };
 const restore = () => {
  if (!recovery || !form.current) return;
  for (const [name,values] of Object.entries(recovery)) {
   const controls = form.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name.replace(/[^a-zA-Z0-9]/g,"")}"]`);
   controls.forEach(control => { if (control instanceof HTMLInputElement && ["checkbox","radio"].includes(control.type)) control.checked=values.includes(control.value); else control.value=values[0] ?? ""; });
  }
  setRecovery(null); changed();
 };
 useEffect(() => {
  try { const stored=sessionStorage.getItem(key); if (stored) queueMicrotask(() => setRecovery(JSON.parse(stored))); } catch {}
  const before = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue=""; } };
  const navigate = (event: MouseEvent) => {
   const anchor=(event.target as Element)?.closest?.("a[href]");
   if (dirty.current && anchor && !anchor.getAttribute("href")?.startsWith("#") && !window.confirm("Your writing has not been saved. Leave this page?")) { event.preventDefault(); event.stopPropagation(); }
  };
  window.addEventListener("beforeunload",before); document.addEventListener("click",navigate,true);
  return () => { clearTimeout(timer.current); window.removeEventListener("beforeunload",before); document.removeEventListener("click",navigate,true); };
 }, [key]);
 const runExternal = async (selected: EditorAction, data: FormData) => {
  if (dirty.current) await save();
  if (dirty.current || saving.current || conflicted.current) return;
  await save(selected,data);
 };
 return { runExternal,attachForm: (element: HTMLFormElement | null) => { form.current=element; },currentVersion,status,failure,recovery,restore,discard: () => { clear(); setRecovery(null); },changed,save };
}
