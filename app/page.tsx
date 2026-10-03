"use client";

import { useEffect, useRef, useState } from "react";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format, isValid, parse } from "date-fns";
import { Calendar as CalendarIcon, Check, ClipboardPaste, Moon, PencilLine, Sparkles, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { VoucherPages } from "@/components/voucher/voucher-pages";
import { initialVoucherContent as initialContent, type AiVoucherDraft, type VoucherContent, type VoucherPageIndex } from "@/lib/voucher";

const APP_PIN = "1947";
const VOUCHER_STORAGE_KEY = "gift-voucher-content-v2";
const DEFAULT_MESSAGE = "Wishing you both a lifetime of love, laughter, and beautiful moments together. May this little getaway be the beginning of countless wonderful journeys and cherished memories.";

function toTitleCase(value: string) {
  return value.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function readSavedContent(): VoucherContent {
  if (typeof window === "undefined") return initialContent;
  try {
    const storedValue = window.localStorage.getItem(VOUCHER_STORAGE_KEY);
    if (!storedValue) return initialContent;
    const parsed: unknown = JSON.parse(storedValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return initialContent;
    const saved = parsed as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(initialContent).map(([key, fallback]) => [key, typeof saved[key] === typeof fallback ? saved[key] : fallback]),
    ) as VoucherContent;
  } catch {
    window.localStorage.removeItem(VOUCHER_STORAGE_KEY);
    return initialContent;
  }
}

function EditorField({ id, label, value, placeholder, multiline = false, disabled = false, onChange }: { id: string; label: string; value: string; placeholder?: string; multiline?: boolean; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea id={id} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input id={id} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      )}
    </Field>
  );
}

function DateEditorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  const parsedDate = parse(value, "d MMMM yyyy", new Date());
  const date = isValid(parsedDate) ? parsedDate : undefined;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          id={id}
          render={
            <Button
              variant="outline"
              data-empty={!date}
              className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
            />
          }
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={(selectedDate) => selectedDate && onChange(format(selectedDate, "d MMMM yyyy"))} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState<string[]>(() => Array(APP_PIN.length).fill(""));
  const [pinError, setPinError] = useState("");
  const pinRef = useRef<string[]>(Array(APP_PIN.length).fill(""));
  const pinInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [content, setContent] = useState<VoucherContent>(initialContent);
  const [isDark, setIsDark] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [exporting, setExporting] = useState<number | "all" | null>(null);
  const [pasteStatus, setPasteStatus] = useState("");
  const [inclusionsVerified, setInclusionsVerified] = useState(false);
  const [exportError, setExportError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState("");
  const [mobileStep, setMobileStep] = useState(0);
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [mobileShareFile, setMobileShareFile] = useState<File | null>(null);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [preparationRequested, setPreparationRequested] = useState(false);
  const [voucherSource, setVoucherSource] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [draftNotes, setDraftNotes] = useState<string[]>([]);
  const update = <Key extends keyof typeof initialContent>(key: Key) => (value: (typeof initialContent)[Key]) => setContent((current) => ({ ...current, [key]: value }));
  const selectedInclusions = [
    content.bbqDinner && "BBQ Dinner",
    content.candlelightDinner && "Candlelight dinner",
    content.flowerBed && "Flower bed decoration",
    content.floatingBreakfast && "Floating breakfast",
  ].filter((inclusion): inclusion is string => Boolean(inclusion));
  const messageState = !content.message.trim() ? "Empty" : content.message === DEFAULT_MESSAGE ? "Autofilled" : "Custom";
  const mobileSteps = ["Message", "Cottage", "Guest & stay", "Review"];

  function changeMobileStep(nextStep: number) {
    if (nextStep > mobileStep) {
      if (mobileStep === 0 && !content.message.trim()) {
        setExportError("Add or autofill the gift message to continue.");
        return;
      }
      if (mobileStep === 1 && (!content.voucherNumber.trim() || !content.villaType.trim() || !inclusionsVerified)) {
        setExportError("Add the voucher number, choose the cottage, and verify the inclusions to continue.");
        return;
      }
      if (mobileStep === 2) {
        const scheduleComplete = content.voucherType === "dated"
          ? Boolean(content.checkInDate.trim() && content.checkInTime.trim() && content.checkOutDate.trim() && content.checkOutTime.trim())
          : Boolean(content.redeemDate.trim());
        if (!content.guestName.trim() || !scheduleComplete) {
          setExportError("Enter the guest name and complete the voucher schedule to continue.");
          return;
        }
      }
    }
    const boundedStep = Math.max(0, Math.min(mobileSteps.length - 1, nextStep));
    setMobileShareFile(null);
    setPreparationProgress(0);
    setPreparationRequested(boundedStep === mobileSteps.length - 1);
    setMobileStep(boundedStep);
    setExportError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setContent(readSavedContent());
      setIsDark(window.localStorage.getItem("gift-voucher-theme") === "dark");
      setHasHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(content));
  }, [content, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("gift-voucher-theme", isDark ? "dark" : "light");
  }, [hasHydrated, isDark]);

  function unlockApp(candidate: string) {
    if (candidate === APP_PIN) {
      setIsUnlocked(true);
      setPinError("");
      return;
    }
    setPinError("Incorrect password. Please try again.");
    const emptyPin = Array<string>(APP_PIN.length).fill("");
    pinRef.current = emptyPin;
    setPin(emptyPin);
    window.setTimeout(() => focusPinInput(0), 0);
    if ("vibrate" in navigator) navigator.vibrate([80, 50, 80]);
  }

  function focusPinInput(index: number) {
    const input = pinInputRefs.current[index];
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
  }

  function updatePin(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextPin = [...pinRef.current];
    nextPin[index] = digit;
    pinRef.current = nextPin;
    setPin(nextPin);
    if (pinError) setPinError("");

    if (digit && index < APP_PIN.length - 1) {
      focusPinInput(index + 1);
      window.requestAnimationFrame(() => focusPinInput(index + 1));
    }
    if (nextPin.every(Boolean)) {
      unlockApp(nextPin.join(""));
    }
  }

  function pastePin(value: string) {
    const pastedPin = value.replace(/\D/g, "").slice(0, APP_PIN.length);
    if (!pastedPin) return;
    const nextPin = Array.from({ length: APP_PIN.length }, (_, index) => pastedPin[index] ?? "");
    pinRef.current = nextPin;
    setPin(nextPin);
    setPinError("");
    if (pastedPin.length === APP_PIN.length) unlockApp(pastedPin);
    else focusPinInput(pastedPin.length);
  }

  async function pasteInto(field: "message" | "guestName") {
    try {
      const clipboardText = await navigator.clipboard.readText();
      update(field)(field === "guestName" ? toTitleCase(clipboardText.trim()) : clipboardText);
      setPasteStatus(`${field === "guestName" ? "Guest name" : "Message"} pasted.`);
    } catch {
      setPasteStatus("Clipboard access was not available. Use your browser's paste command instead.");
    }
  }

  function validateVoucher() {
    const requiredFields: Array<[string, string]> = [
      [content.frontTitle, "front title"], [content.message, "message"],
      [content.backTitle, "voucher title"], [content.voucherNumber, "voucher number"], [content.villaType, "cottage"], [content.guestName, "guest name"],
      [content.address, "address"], [content.phone, "phone"], [content.email, "email"],
      ...(content.voucherType === "dated"
        ? [[content.checkInDate, "check-in date"], [content.checkInTime, "check-in time"], [content.checkOutDate, "check-out date"], [content.checkOutTime, "check-out time"]] as Array<[string, string]>
        : [[content.redeemDate, "redemption date"]] as Array<[string, string]>),
    ];
    const missingFields = requiredFields.filter(([value]) => !value.trim()).map(([, label]) => label);
    if (missingFields.length || !inclusionsVerified) {
      const fieldMessage = missingFields.length ? `Complete: ${missingFields.join(", ")}.` : "";
      const inclusionMessage = !inclusionsVerified ? " Verify the inclusion selection." : "";
      setExportError(`${fieldMessage}${inclusionMessage}`.trim());
      if ("vibrate" in navigator) navigator.vibrate(80);
      return false;
    }
    setExportError("");
    return true;
  }

  async function pasteVoucherDetails() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setVoucherSource(clipboardText.trim());
      setDraftNotice("Booking details pasted. Review them, then create the draft.");
    } catch {
      setDraftNotice("Clipboard access was not available. Paste into the box with your browser's paste command.");
    }
  }

  async function draftVoucherWithAi() {
    if (voucherSource.trim().length < 10) {
      setExportError("Paste the booking or voucher details first.");
      return;
    }

    setIsDrafting(true);
    setExportError("");
    setDraftNotice("");
    setDraftNotes([]);
    try {
      const response = await fetch("/api/voucher/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: voucherSource }),
      });
      const result = await response.json().catch(() => null) as { draft?: AiVoucherDraft; error?: string; requestId?: string } | null;
      if (!response.ok || !result?.draft) {
        const reference = result?.requestId ? ` Reference: ${result.requestId}.` : "";
        throw new Error(`${result?.error || "The voucher could not be drafted."}${reference}`);
      }

      const draft = result.draft;
      setContent((current) => ({
        ...current,
        message: draft.message,
        sender: draft.sender,
        guestName: draft.guestName,
        voucherNumber: draft.voucherNumber,
        villaType: draft.villaType,
        voucherType: draft.voucherType,
        checkInDate: draft.checkInDate || current.checkInDate,
        checkInTime: draft.checkInTime || current.checkInTime,
        checkOutDate: draft.checkOutDate || current.checkOutDate,
        checkOutTime: draft.checkOutTime || current.checkOutTime,
        redeemDate: draft.redeemDate || current.redeemDate,
        bbqDinner: draft.bbqDinner,
        candlelightDinner: draft.candlelightDinner,
        flowerBed: draft.flowerBed,
        floatingBreakfast: draft.floatingBreakfast,
      }));
      setInclusionsVerified(false);
      setDraftNotes(draft.notes);
      setDraftNotice(`Draft ready for ${draft.guestName || "your guest"}. Fine-tune anything below, then review the voucher.`);
      setHasStartedEditing(true);
      setMobileStep(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The voucher could not be drafted. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  }

  async function requestVoucherPdf(indices: VoucherPageIndex[]) {
    const response = await fetch("/api/voucher/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, indices }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string; code?: string; requestId?: string } | null;
      const reference = result?.requestId ? ` Reference: ${result.requestId}.` : "";
      const code = result?.code ? ` (${result.code})` : "";
      throw new Error(`${result?.error || "The PDF could not be generated."}${code}${reference}`);
    }
    return { blob: await response.blob(), fileName: createPdfFileName(indices) };
  }

  async function downloadVoucherPdf() {
    setDownloadNotice("");
    if (!validateVoucher()) return;
    setExporting("all");
    try {
      const { blob, fileName } = await requestVoucherPdf([0, 1]);
      downloadPdfBlob(blob, fileName);
      setDownloadNotice("Voucher PDF downloaded.");
    } catch (error) {
      console.error("Voucher PDF generation failed.", error);
      setExportError(error instanceof Error ? error.message : "The PDF could not be downloaded. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  function createPdfFileName(indices: VoucherPageIndex[]) {
    const guestFileName = content.guestName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\.+$/, "") || "Guest";
    const voucherFileName = content.voucherNumber.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\.+$/, "") || "No-number";
    const pageSuffix = indices.length === 2 ? " - Front and Back" : indices[0] === 0 ? " - Front" : " - Back";
    return `${guestFileName} - ${voucherFileName}${pageSuffix} - ${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.pdf`;
  }

  function createShareText() {
    const schedule = content.voucherType === "dated"
      ? [`Check-in: ${content.checkInDate} ${content.checkInTime}`, `Check-out: ${content.checkOutDate} ${content.checkOutTime}`]
      : [`Valid until: ${content.redeemDate}`];
    const lines = [
      "CHEMBARATHI WAYANAD",
      "Gift Voucher",
      "",
      `Dear ${content.guestName},`,
      "",
      "Please find your gift voucher attached. We look forward to welcoming you for a memorable stay.",
      "",
      `Voucher no.: ${content.voucherNumber}`,
      `Cottage: ${content.villaType}`,
      schedule,
      selectedInclusions.length ? `Inclusions: ${selectedInclusions.join(", ")}` : "",
      "",
      content.message.trim(),
      content.sender.trim() ? `With warm wishes,\n${content.sender.trim()}` : "Warm regards,\nChembarathi Wayanad",
    ];
    return lines.flat().filter((line, index, all) => line || all[index - 1]).join("\n");
  }

  function downloadPdfBlob(blob: Blob, fileName: string) {
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    downloadLink.rel = "noopener";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  async function shareMobileVoucher() {
    if (!mobileShareFile) return;
    try {
      const canShareFile = typeof navigator.share === "function"
        && typeof navigator.canShare === "function"
        && navigator.canShare({ files: [mobileShareFile] });
      if (canShareFile) {
        setDownloadNotice("Opening the share sheet…");
        await navigator.share({ files: [mobileShareFile], title: `Gift voucher for ${content.guestName} · ${content.voucherNumber}`, text: createShareText() });
        setDownloadNotice("Voucher shared.");
        return;
      }
      downloadPdfBlob(mobileShareFile, mobileShareFile.name);
      setDownloadNotice("Sharing is unavailable in this browser, so the PDF was downloaded instead.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Voucher save failed.", error);
      setExportError("The voucher could not be shared. Please try again.");
    }
  }

  useEffect(() => {
    if (mobileStep !== 3 || !preparationRequested) return;
    let cancelled = false;
    void (async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
      if (cancelled) return;
      if (!cancelled) {
        setExporting("all");
        setPreparationProgress(5);
      }
      try {
        if (!cancelled) setPreparationProgress(35);
        const { blob, fileName } = await requestVoucherPdf([0, 1]);
        if (!cancelled) {
          setPreparationProgress(100);
          setMobileShareFile(new File([blob], fileName, { type: "application/pdf" }));
        }
      } catch (error) {
        console.error("Gift voucher preparation failed.", error);
        if (!cancelled) {
          setPreparationProgress(0);
          setPreparationRequested(false);
          const reason = error instanceof Error ? error.message : "The PDF service could not prepare the voucher.";
          setExportError(`${reason} Please try preparing the voucher again.`);
        }
      } finally {
        if (!cancelled) setExporting(null);
      }
    })();
    return () => { cancelled = true; };
    // The PDF is prepared once when the final mobile step becomes visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileStep, preparationRequested]);

  if (!isUnlocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10 font-secondary dark:bg-zinc-950">
        <Button variant="outline" size="icon" className="fixed top-4 right-4" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
        <section className="w-[min(100%,24rem)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04),0_16px_48px_rgba(0,0,0,.08)] dark:bg-zinc-900 sm:p-8" aria-labelledby="lock-title">
          <p className="text-[10px] font-semibold tracking-[.16em] text-zinc-500 uppercase">Voucher studio</p>
          <h1 id="lock-title" className="mt-2 text-2xl font-semibold tracking-[-.03em] text-zinc-950 dark:text-zinc-50">Enter access password</h1>
          <p className="mt-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400">Enter the four-digit password to open the gift voucher editor.</p>
          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              unlockApp(pinRef.current.join(""));
            }}
          >
            <Field>
              <FieldLabel>Four-digit password</FieldLabel>
              <div className="flex gap-3" role="group" aria-label="Four-digit password" aria-describedby={pinError ? "pin-error" : undefined}>
                {Array.from({ length: APP_PIN.length }, (_, index) => (
                  <Input
                    key={index}
                    ref={(element) => { pinInputRefs.current[index] = element; }}
                    id={`app-password-${index + 1}`}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]"
                    autoComplete={index === 0 ? "current-password" : "off"}
                    maxLength={1}
                    value={pin[index] ?? ""}
                    aria-label={`Password digit ${index + 1}`}
                    aria-invalid={Boolean(pinError)}
                    autoFocus={index === 0}
                    className="h-14 w-12 text-center text-xl"
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => updatePin(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && !pinRef.current[index] && index > 0) {
                        focusPinInput(index - 1);
                      }
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      pastePin(event.clipboardData.getData("text"));
                    }}
                  />
                ))}
              </div>
              {pinError && <FieldDescription id="pin-error" className="text-destructive" aria-live="polite">{pinError}</FieldDescription>}
            </Field>
            <Button type="submit" className="w-full" disabled={!pin.every(Boolean)}>Enter</Button>
          </form>
        </section>
      </main>
    );
  }

  if (!hasStartedEditing) {
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10 font-secondary dark:bg-zinc-950">
        <Button variant="outline" size="icon" className="fixed top-4 right-4" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
        <section className="w-[min(100%,42rem)] overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_rgba(0,0,0,.09)] dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="details-title">
          <div className="border-b border-zinc-200/80 px-5 py-5 dark:border-zinc-800 sm:px-8 sm:py-7">
            <p className="text-[11px] font-semibold tracking-[.16em] text-amber-700 uppercase dark:text-amber-400">Step 1 · Add details</p>
            <h1 id="details-title" className="mt-2 text-2xl font-semibold tracking-[-.035em] text-zinc-950 dark:text-zinc-50 sm:text-3xl">Paste the booking details</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Add the booking confirmation or voucher notes. We’ll turn them into an editable draft, including the guest, voucher number, cottage, dates, and inclusions.</p>
          </div>
          <div className="p-5 sm:p-8">
            <Field>
              <FieldLabel htmlFor="voucher-source">Booking or voucher details</FieldLabel>
              <Textarea
                id="voucher-source"
                className="min-h-52 resize-y bg-zinc-50 text-base leading-6 dark:bg-zinc-950"
                value={voucherSource}
                placeholder="Paste the complete booking confirmation here…"
                disabled={isDrafting}
                autoFocus
                onChange={(event) => setVoucherSource(event.target.value)}
              />
              <FieldDescription>Payment, bank, UTR, phone, and policy details are excluded from the voucher.</FieldDescription>
            </Field>
            {isDrafting ? (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="status">Reading the details and preparing an editable draft…</div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr_auto]">
                <Button type="button" variant="outline" onClick={pasteVoucherDetails}><ClipboardPaste />Paste</Button>
                <Button type="button" onClick={draftVoucherWithAi} disabled={voucherSource.trim().length < 10}><Sparkles />Create editable draft</Button>
                <Button type="button" variant="ghost" disabled={voucherSource.trim().length < 10} onClick={() => { setHasStartedEditing(true); setMobileStep(0); setDraftNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><PencilLine />Enter manually</Button>
              </div>
            )}
            {draftNotice && <p role="status" className="mt-4 flex items-start gap-2 text-sm leading-5 text-emerald-700 dark:text-emerald-400"><Check className="mt-0.5 size-4 shrink-0" />{draftNotice}</p>}
            {exportError && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{exportError}</p>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full bg-zinc-50/70 px-0 pb-8 dark:bg-zinc-950 sm:bg-transparent sm:px-[clamp(16px,3vw,48px)] sm:pb-20 sm:dark:bg-transparent">
      <header className="no-print sticky top-0 z-40 mx-0 flex items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 sm:-mx-[clamp(16px,3vw,48px)] sm:px-[clamp(16px,3vw,48px)] sm:py-4">
        <div>
          <p className="font-secondary text-[10px] font-semibold tracking-[.16em] text-zinc-500 uppercase">Voucher studio</p>
          <h1 className="font-secondary text-lg font-semibold tracking-[-.02em] sm:text-xl">Gift voucher</h1>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" aria-label="Edit pasted details" onClick={() => { setHasStartedEditing(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Source</Button>
        <Button variant="outline" size="icon" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
        <Button className="hidden sm:inline-flex" onClick={downloadVoucherPdf} disabled={exporting !== null}>{exporting !== null ? "Preparing PDF…" : "Download PDF"}</Button>
        </div>
      </header>
      {exportError && <div role="alert" className="no-print mx-4 mt-3 rounded-xl bg-destructive/10 px-4 py-3 font-secondary text-sm leading-5 text-destructive sm:mx-0 sm:mt-4 sm:rounded-none">{exportError}</div>}
      {downloadNotice && <div role="status" className="no-print mx-4 mt-3 rounded-xl bg-emerald-500/10 px-4 py-3 font-secondary text-sm leading-5 text-emerald-700 dark:text-emerald-400 sm:mx-0 sm:mt-4 sm:rounded-none">{downloadNotice}</div>}

      <nav className="no-print mx-auto w-full max-w-3xl px-4 pt-4 sm:px-0" aria-label="Voucher creation progress">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-secondary text-xs font-semibold">Step {mobileStep + 1} of {mobileSteps.length}</p>
          <p className="font-secondary text-xs text-zinc-500">{mobileSteps[mobileStep]}</p>
        </div>
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {mobileSteps.map((step, index) => <span key={step} className={`h-1.5 rounded-full ${index <= mobileStep ? "bg-zinc-950 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-800"}`} />)}
        </div>
      </nav>

      <div className={`voucher-studio-layout mt-4 grid items-start gap-4 px-4 sm:mt-5 sm:gap-5 sm:px-0 lg:mt-8 ${mobileStep === 3 ? "xl:grid-cols-1" : "xl:grid-cols-[400px_minmax(0,1fr)]"} xl:gap-8`}>
      <section className={`no-print ${mobileStep === 3 ? "hidden" : "block"} self-start overflow-hidden rounded-2xl border border-zinc-200/70 bg-white font-secondary shadow-[0_8px_28px_rgba(0,0,0,.05)] dark:border-zinc-800 dark:bg-zinc-900 sm:border-0 sm:shadow-[0_1px_2px_rgba(0,0,0,.03),0_12px_32px_rgba(0,0,0,.04)] xl:sticky xl:top-24`} aria-labelledby="editor-title">
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-3">
            <p className="font-secondary text-[11px] font-semibold tracking-[.16em] text-zinc-500 uppercase">Step {mobileStep + 1} of 4</p>
            <Badge variant="outline"><span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />Live preview</Badge>
          </div>
          <h2 id="editor-title" className="font-secondary text-xl font-semibold tracking-[-.02em] text-zinc-950 dark:text-zinc-50 sm:text-2xl">{mobileSteps[mobileStep]}</h2>
          <p className="mt-1.5 font-secondary text-sm leading-5 text-zinc-500 dark:text-zinc-400 sm:mt-2">Complete this section, then continue. Your changes appear on the preview instantly.</p>
        </div>
        <div className="bg-zinc-50/70 px-3 pb-3 pt-px dark:bg-zinc-950/60 sm:px-5 sm:pb-5 sm:pt-0">
        {draftNotes.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 rounded-xl bg-amber-50 px-7 py-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {draftNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        )}
        <div>
          <div className={`${mobileStep === 0 ? "block" : "hidden"} mt-3 rounded-xl bg-white px-4 py-4 shadow-xs dark:bg-zinc-900 sm:mt-4 sm:px-4`}>
              <div>
              <h3 className="mb-4 text-base font-semibold">Message</h3>
              <FieldSet>
                <FieldLegend className="sr-only">Voucher copy</FieldLegend>
                <EditorField id="front-title" label="Title" value={content.frontTitle} multiline disabled onChange={update("frontTitle")} />
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="message">Message</FieldLabel>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge variant={messageState === "Autofilled" ? "secondary" : "outline"}>{messageState}</Badge>
                      <Button type="button" variant="outline" size="sm" onClick={() => update("message")(DEFAULT_MESSAGE)}>Autofill</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => pasteInto("message")}>Paste</Button>
                    </div>
                  </div>
                  <Textarea id="message" rows={6} value={content.message} placeholder="Write a personal message" onChange={(event) => update("message")(event.target.value)} />
                  <FieldDescription>Write, paste, or autofill a message.</FieldDescription>
                </Field>
                <EditorField id="sender" label="Sender" value={content.sender} placeholder="Enter sender name" onChange={update("sender")} />
              </FieldSet>
              </div>
          </div>

          <div className={`${mobileStep === 1 ? "block" : "hidden"} mt-3 rounded-xl bg-white px-4 py-4 shadow-xs dark:bg-zinc-900 sm:mt-4 sm:px-4`}>
            <div>
              <h3 className="mb-4 text-base font-semibold">Cottage &amp; voucher</h3>
              <FieldSet>
              <FieldLegend className="sr-only">Voucher &amp; inclusions</FieldLegend>
              <EditorField id="back-title" label="Voucher title" value={content.backTitle} disabled onChange={update("backTitle")} />
              <EditorField id="voucher-number" label="Voucher number" value={content.voucherNumber} placeholder="e.g. GV-2026-014" onChange={update("voucherNumber")} />
              <Field>
                <FieldLabel htmlFor="villa-type">Cottage</FieldLabel>
                <Select value={content.villaType} onValueChange={(value) => value && update("villaType")(value)}>
                  <SelectTrigger id="villa-type" className="w-full"><SelectValue placeholder="Select a villa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DELUXE COTTAGE WITH FOREST VIEW">Deluxe Cottage with Forest View</SelectItem>
                    <SelectItem value="DELUXE COTTAGE WITH LAWN VIEW">Deluxe Cottage with Lawn View</SelectItem>
                    <SelectItem value="HONEYMOON SUITE">Honeymoon Suite</SelectItem>
                    <SelectItem value="PREMIUM COTTAGE WITH MOUNTAIN VIEW">Premium Cottage with Mountain View</SelectItem>
                    <SelectItem value="PREMIUM COTTAGE WITH POOL VIEW AND MOUNTAIN VIEW">Premium Cottage with Pool View and Mountain View</SelectItem>
                    <SelectItem value="PRIVATE POOL VILLA">Private Pool Villa</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Inclusions</FieldLabel>
                <div className="grid gap-3">
                  <Field orientation="horizontal">
                    <Switch id="bbq-dinner" checked={content.bbqDinner} onCheckedChange={(value) => { update("bbqDinner")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="bbq-dinner">BBQ Dinner</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Switch id="candlelight-dinner" checked={content.candlelightDinner} onCheckedChange={(value) => { update("candlelightDinner")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="candlelight-dinner">Candlelight dinner</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Switch id="flower-bed" checked={content.flowerBed} onCheckedChange={(value) => { update("flowerBed")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="flower-bed">Flower bed</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Switch id="floating-breakfast" checked={content.floatingBreakfast} onCheckedChange={(value) => { update("floatingBreakfast")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="floating-breakfast">Floating breakfast</FieldLabel>
                  </Field>
                </div>
                {selectedInclusions.length === 0 && <FieldDescription>No inclusions will be shown on the voucher.</FieldDescription>}
                <Field orientation="horizontal">
                  <Checkbox id="verify-inclusions" checked={inclusionsVerified} onCheckedChange={setInclusionsVerified} />
                  <FieldLabel htmlFor="verify-inclusions">I verified the inclusion selection</FieldLabel>
                </Field>
              </Field>
              </FieldSet>
            </div>
          </div>

          <div className={`${mobileStep === 2 ? "block" : "hidden"} mt-3 rounded-xl bg-white px-4 py-4 shadow-xs dark:bg-zinc-900 sm:mt-4 sm:px-4`}>
            <div>
              <h3 className="mb-4 text-base font-semibold">Guest &amp; stay</h3>
              <FieldSet>
              <FieldLegend className="sr-only">Guest &amp; stay</FieldLegend>
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="guest-name">Guest name</FieldLabel>
                  <Button type="button" variant="outline" size="sm" onClick={() => pasteInto("guestName")}>Paste</Button>
                </div>
                <Input id="guest-name" value={content.guestName} placeholder="Enter guest name" onChange={(event) => update("guestName")(toTitleCase(event.target.value))} />
              </Field>
              <Field>
                <FieldLabel>Voucher schedule</FieldLabel>
                <RadioGroup value={content.voucherType} onValueChange={(value) => update("voucherType")(value)}>
                  <Field orientation="horizontal">
                    <RadioGroupItem id="dated-voucher" value="dated" />
                    <FieldLabel htmlFor="dated-voucher">Specific dates</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem id="open-voucher" value="open" />
                    <FieldLabel htmlFor="open-voucher">No specific date</FieldLabel>
                  </Field>
                </RadioGroup>
              </Field>
              {content.voucherType === "dated" ? (
                <>
                  <DateEditorField id="check-in-date" label="Check-in date" value={content.checkInDate} onChange={(checkInDate) => {
                    const parsedCheckIn = parse(checkInDate, "d MMMM yyyy", new Date());
                    setContent((current) => ({
                      ...current,
                      checkInDate,
                      checkOutDate: isValid(parsedCheckIn) ? format(addDays(parsedCheckIn, 1), "d MMMM yyyy") : current.checkOutDate,
                    }));
                  }} />
                  <EditorField id="check-in-time" label="Check-in time" value={content.checkInTime} disabled onChange={update("checkInTime")} />
                  <DateEditorField id="check-out-date" label="Check-out date" value={content.checkOutDate} onChange={update("checkOutDate")} />
                  <EditorField id="check-out-time" label="Check-out time" value={content.checkOutTime} disabled onChange={update("checkOutTime")} />
                </>
              ) : (
                <DateEditorField id="redeem-date" label="Redeem before" value={content.redeemDate} onChange={update("redeemDate")} />
              )}
              </FieldSet>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 mt-3 flex gap-2.5 border-t border-zinc-200 bg-zinc-50/95 pt-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <Button variant="outline" className="flex-1" onClick={() => changeMobileStep(mobileStep - 1)} disabled={mobileStep === 0}>Back</Button>
          <Button className="flex-1" onClick={() => changeMobileStep(mobileStep + 1)}>Continue</Button>
        </div>
        </div>
      </section>

      <section className={`${mobileStep === 3 ? "grid" : "hidden"} voucher-print-area min-w-0 gap-4 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,.05)] dark:border-zinc-800 dark:bg-zinc-900 sm:grid sm:border-0 sm:bg-zinc-100/70 sm:p-5 sm:shadow-none sm:dark:bg-zinc-900/70 lg:p-6`} aria-label="Voucher pages">
        <div className="voucher-print-chrome flex items-center justify-between gap-4">
          <div>
            <h2 className="font-secondary text-sm font-semibold text-zinc-900 dark:text-zinc-100">Canvas preview</h2>
            <p className="mt-0.5 font-secondary text-xs text-zinc-500 dark:text-zinc-400">Review both sides before saving.</p>
          </div>
          <Badge variant="secondary">2 pages</Badge>
        </div>
        {preparationRequested && !mobileShareFile && (
          <div className="voucher-print-chrome rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/70 sm:hidden" aria-live="polite">
            <div className="mb-1.5 flex items-center justify-between font-secondary text-xs">
              <span>Preparing voucher</span>
              <span className="font-semibold tabular-nums">{preparationProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="h-full rounded-full bg-zinc-950 transition-[width] duration-500 dark:bg-zinc-50" style={{ width: `${preparationProgress}%` }} />
            </div>
          </div>
        )}
        <VoucherPages content={content} interactivePreview />
        <div className="voucher-print-chrome sticky bottom-0 -mx-4 -mb-4 grid grid-cols-[auto_1fr] gap-2.5 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
          <Button variant="outline" onClick={() => changeMobileStep(2)}>Back</Button>
          {mobileShareFile ? (
            <Button onClick={shareMobileVoucher}>Share PDF</Button>
          ) : (
            <Button onClick={() => setPreparationRequested(true)} disabled={preparationRequested}>
              {preparationRequested ? `Preparing PDF ${preparationProgress}%…` : "Prepare PDF"}
            </Button>
          )}
        </div>
      </section>
      </div>

      <p className="sr-only" aria-live="polite">{pasteStatus}</p>
    </main>
  );
}
