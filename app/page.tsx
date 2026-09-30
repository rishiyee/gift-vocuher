"use client";

import { useEffect, useRef, useState } from "react";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format, isValid, parse } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon, Moon, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { VoucherPages } from "@/components/voucher/voucher-pages";
import { initialVoucherContent as initialContent, type VoucherContent, type VoucherPageIndex } from "@/lib/voucher";

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
  const [content, setContent] = useState<VoucherContent>(readSavedContent);
  const [isDark, setIsDark] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("gift-voucher-theme") === "dark");
  const [exporting, setExporting] = useState<number | "all" | null>(null);
  const [preview, setPreview] = useState<{ indices: VoucherPageIndex[]; file: File; objectUrl: string } | null>(null);
  const [pasteStatus, setPasteStatus] = useState("");
  const [inclusionsVerified, setInclusionsVerified] = useState(false);
  const [exportError, setExportError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState("");
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const [editorSections, setEditorSections] = useState<string[]>(["message"]);
  const [mobileShareFile, setMobileShareFile] = useState<File | null>(null);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [preparationRequested, setPreparationRequested] = useState(false);
  const update = <Key extends keyof typeof initialContent>(key: Key) => (value: (typeof initialContent)[Key]) => setContent((current) => ({ ...current, [key]: value }));
  const selectedInclusions = [
    content.bbqDinner && "BBQ Dinner",
    content.candlelightDinner && "Candlelight dinner",
    content.flowerBed && "Flower bed decoration",
    content.floatingBreakfast && "Floating breakfast",
  ].filter((inclusion): inclusion is string => Boolean(inclusion));
  const messageState = !content.message.trim() ? "Empty" : content.message === DEFAULT_MESSAGE ? "Autofilled" : "Custom";
  const mobileSteps = ["Message", "Voucher", "Stay", "Review"];

  function changeMobileStep(nextStep: number) {
    if (nextStep > mobileStep) {
      if (mobileStep === 0 && !content.message.trim()) {
        setExportError("Add or autofill the gift message to continue.");
        return;
      }
      if (mobileStep === 1 && (!content.villaType.trim() || !inclusionsVerified)) {
        setExportError("Choose the villa and verify the inclusion selection to continue.");
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
    setEditorSections(boundedStep === 0 ? ["message"] : boundedStep === 1 ? ["voucher"] : boundedStep === 2 ? ["stay"] : []);
    setExportError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    window.localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(content));
  }, [content]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("gift-voucher-theme", isDark ? "dark" : "light");
  }, [isDark]);

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
      [content.backTitle, "voucher title"], [content.villaType, "villa type"], [content.guestName, "guest name"],
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

  async function waitForVoucherAssets() {
    await document.fonts.ready;
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".voucher-canvas img"));
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
  }

  async function printVoucher() {
    setDownloadNotice("");
    if (!validateVoucher()) return;
    setExporting("all");
    try {
      await waitForVoucherAssets();
      window.print();
      setDownloadNotice("Print dialog opened. Choose Save as PDF, use 100% scale, and enable background graphics.");
    } catch (error) {
      console.error("Browser printing failed.", error);
      setExportError("The browser print dialog could not be opened. Use Download exact-size PDF instead.");
    } finally {
      setExporting(null);
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

  async function preparePreview(indices: VoucherPageIndex[]) {
    setDownloadNotice("");
    if (!validateVoucher()) return;
    const exportTarget = indices.length === 2 ? "all" : indices[0];
    setExporting(exportTarget);
    try {
      const { blob, fileName } = await requestVoucherPdf(indices);
      const file = new File([blob], fileName, { type: "application/pdf" });
      setPreview({ indices, file, objectUrl: URL.createObjectURL(file) });
    } catch (error) {
      console.error("Voucher PDF generation failed.", error);
      setExportError(error instanceof Error ? error.message : "The PDF could not be prepared. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  function createPdfFileName(indices: VoucherPageIndex[]) {
    const guestFileName = content.guestName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\.+$/, "") || "Gift Voucher";
    const pageSuffix = indices.length === 2 ? " - Front and Back" : indices[0] === 0 ? " - Front" : " - Back";
    return `${guestFileName}${pageSuffix} - ${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.pdf`;
  }

  function isIphoneDevice() {
    return typeof navigator !== "undefined" && /iPhone|iPod/.test(navigator.userAgent);
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

  function openMobilePdf() {
    if (!mobileShareFile) return;
    const objectUrl = URL.createObjectURL(mobileShareFile);
    const pdfWindow = window.open(objectUrl, "_blank");
    if (pdfWindow) pdfWindow.opener = null;
    else window.location.assign(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60_000);
    setDownloadNotice("PDF opened. On iPhone, tap Share, then Save to Files.");
  }

  async function saveMobileVoucher() {
    if (!mobileShareFile) return;
    try {
      const canShareFile = typeof navigator.share === "function"
        && typeof navigator.canShare === "function"
        && navigator.canShare({ files: [mobileShareFile] });
      if (canShareFile) {
        setDownloadNotice("In the iPhone share sheet, choose Save to Files.");
        await navigator.share({ files: [mobileShareFile], title: "Gift voucher" });
        setDownloadNotice("Voucher save or share completed.");
        return;
      }
      if (isIphoneDevice()) {
        openMobilePdf();
        return;
      }
      downloadPdfBlob(mobileShareFile, mobileShareFile.name);
      setDownloadNotice("Voucher download requested. Check your browser downloads.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Voucher save failed.", error);
      setExportError("The voucher could not be saved. Open the PDF, then use Share and Save to Files.");
    }
  }

  async function savePreviewAsPdf() {
    if (!preview) return;
    try {
      setExportError("");
      setDownloadNotice("");
      setIsSavingPdf(true);
      downloadPdfBlob(preview.file, preview.file.name);
      setDownloadNotice("PDF download requested. Check your browser downloads if it does not appear immediately.");
      closePreview();
    } catch (error) {
      console.error("PDF download failed.", error);
      setExportError("The PDF could not be saved. Try one page at a time, or use Safari's Share menu and choose Save to Files.");
    } finally {
      setIsSavingPdf(false);
    }
  }

  function closePreview() {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.objectUrl);
      return null;
    });
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
          setExportError(`${reason} Use Print / Save PDF below, or try again.`);
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

  return (
    <main className="min-h-dvh w-full bg-zinc-50/70 px-0 pb-8 dark:bg-zinc-950 sm:bg-transparent sm:px-[clamp(16px,3vw,48px)] sm:pb-20 sm:dark:bg-transparent">
      <header className="no-print sticky top-0 z-40 mx-0 flex items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 sm:-mx-[clamp(16px,3vw,48px)] sm:px-[clamp(16px,3vw,48px)] sm:py-4">
        <div>
          <p className="font-secondary text-[10px] font-semibold tracking-[.16em] text-zinc-500 uppercase">Voucher studio</p>
          <h1 className="font-secondary text-lg font-semibold tracking-[-.02em] sm:text-xl">Gift voucher</h1>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="hidden sm:inline-flex" disabled={exporting !== null} />}>{exporting !== null ? "Preparing PDF..." : "Download PDF"}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={printVoucher}>Print / Save as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => preparePreview([0, 1])}>Download exact-size PDF</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>
      {exportError && <div role="alert" className="no-print mx-4 mt-3 rounded-xl bg-destructive/10 px-4 py-3 font-secondary text-sm leading-5 text-destructive sm:mx-0 sm:mt-4 sm:rounded-none">{exportError}</div>}
      {downloadNotice && <div role="status" className="no-print mx-4 mt-3 rounded-xl bg-emerald-500/10 px-4 py-3 font-secondary text-sm leading-5 text-emerald-700 dark:text-emerald-400 sm:mx-0 sm:mt-4 sm:rounded-none">{downloadNotice}</div>}

      <nav className="no-print px-4 pt-4 sm:hidden" aria-label="Voucher creation progress">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-secondary text-xs font-semibold">Step {mobileStep + 1} of {mobileSteps.length}</p>
          <p className="font-secondary text-xs text-zinc-500">{mobileSteps[mobileStep]}</p>
        </div>
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {mobileSteps.map((step, index) => <span key={step} className={`h-1.5 rounded-full ${index <= mobileStep ? "bg-zinc-950 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-800"}`} />)}
        </div>
      </nav>

      <div className="voucher-studio-layout mt-4 grid items-start gap-4 px-4 sm:mt-5 sm:gap-5 sm:px-0 lg:mt-8 xl:grid-cols-[400px_minmax(0,1fr)] xl:gap-8">
      <section className={`no-print ${mobileStep === 3 ? "hidden" : "block"} self-start overflow-hidden rounded-2xl border border-zinc-200/70 bg-white font-secondary shadow-[0_8px_28px_rgba(0,0,0,.05)] dark:border-zinc-800 dark:bg-zinc-900 sm:block sm:border-0 sm:shadow-[0_1px_2px_rgba(0,0,0,.03),0_12px_32px_rgba(0,0,0,.04)] xl:sticky xl:top-24`} aria-labelledby="editor-title">
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-3">
            <p className="font-secondary text-[11px] font-semibold tracking-[.16em] text-zinc-500 uppercase">Live editor</p>
            <Badge variant="outline"><span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />Live preview</Badge>
          </div>
          <h2 id="editor-title" className="font-secondary text-xl font-semibold tracking-[-.02em] text-zinc-950 dark:text-zinc-50 sm:text-2xl"><span className="sm:hidden">{mobileSteps[mobileStep]}</span><span className="hidden sm:inline">Customize your voucher</span></h2>
          <p className="mt-1.5 font-secondary text-sm leading-5 text-zinc-500 dark:text-zinc-400 sm:mt-2"><span className="sm:hidden">Complete this step, then continue to build your voucher.</span><span className="hidden sm:inline">Update the recipient and stay details. Every change appears on the canvas instantly.</span></p>
        </div>
        <div className="bg-zinc-50/70 px-3 pb-3 pt-px dark:bg-zinc-950/60 sm:px-5 sm:pb-5 sm:pt-0">
        <Accordion value={editorSections} onValueChange={setEditorSections}>
          <div className={`${mobileStep === 0 ? "block" : "hidden"} mt-3 rounded-xl bg-white px-4 shadow-xs dark:bg-zinc-900 sm:mt-4 sm:block sm:px-3 sm:transition-shadow sm:hover:shadow-sm`}>
          <AccordionItem value="message">
            <AccordionTrigger className="hover:no-underline">Message</AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 sm:px-1 sm:pt-3">
              <FieldSet>
                <FieldLegend>Voucher copy</FieldLegend>
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
            </AccordionContent>
          </AccordionItem>
          </div>

          <div className={`${mobileStep === 1 ? "block" : "hidden"} mt-3 rounded-xl bg-white px-4 shadow-xs dark:bg-zinc-900 sm:block sm:px-3 sm:transition-shadow sm:hover:shadow-sm`}>
          <AccordionItem value="voucher">
            <AccordionTrigger className="hover:no-underline">Voucher</AccordionTrigger>
            <AccordionContent>
            <div className="pt-2 sm:px-1 sm:pt-3">
              <FieldSet>
              <FieldLegend>Voucher &amp; inclusions</FieldLegend>
              <EditorField id="back-title" label="Voucher title" value={content.backTitle} disabled onChange={update("backTitle")} />
              <Field>
                <FieldLabel htmlFor="villa-type">Villa type</FieldLabel>
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
            </AccordionContent>
          </AccordionItem>
          </div>

          <div className={`${mobileStep === 2 ? "block" : "hidden"} mt-3 rounded-xl bg-white px-4 shadow-xs dark:bg-zinc-900 sm:block sm:px-3 sm:transition-shadow sm:hover:shadow-sm`}>
          <AccordionItem value="stay">
            <AccordionTrigger className="hover:no-underline">Stay</AccordionTrigger>
            <AccordionContent>
            <div className="pt-2 sm:px-1 sm:pt-3">
              <FieldSet>
              <FieldLegend>Guest &amp; stay</FieldLegend>
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="guest-name">Guest name</FieldLabel>
                  <Button type="button" variant="outline" size="sm" onClick={() => pasteInto("guestName")}>Paste</Button>
                </div>
                <Input id="guest-name" value={content.guestName} placeholder="Enter guest name" onChange={(event) => update("guestName")(toTitleCase(event.target.value))} />
              </Field>
              <Field>
                <FieldLabel>Voucher schedule</FieldLabel>
                <RadioGroup defaultValue={initialContent.voucherType} onValueChange={(value) => update("voucherType")(value)}>
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
            </AccordionContent>
          </AccordionItem>
          </div>
        </Accordion>
        <div className="sticky bottom-0 mt-3 flex gap-2.5 border-t border-zinc-200 bg-zinc-50/95 pt-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
          <Button variant="outline" className="flex-1" onClick={() => changeMobileStep(mobileStep - 1)} disabled={mobileStep === 0}>Back</Button>
          <Button className="flex-1" onClick={() => changeMobileStep(mobileStep + 1)}>Continue</Button>
        </div>
        </div>
      </section>

      <section className={`${mobileStep === 3 ? "grid" : "hidden"} voucher-print-area min-w-0 gap-4 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,.05)] dark:border-zinc-800 dark:bg-zinc-900 sm:grid sm:border-0 sm:bg-zinc-100/70 sm:p-5 sm:shadow-none sm:dark:bg-zinc-900/70 lg:p-6`} aria-label="Voucher pages">
        <div className="voucher-print-chrome flex items-center justify-between gap-4">
          <div>
            <h2 className="font-secondary text-sm font-semibold text-zinc-900 dark:text-zinc-100">Canvas preview</h2>
            <p className="mt-0.5 font-secondary text-xs text-zinc-500 dark:text-zinc-400 xl:hidden">Swipe horizontally to inspect the full voucher.</p>
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
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" onClick={openMobilePdf}>Open PDF</Button>
              <Button onClick={saveMobileVoucher}>Save voucher</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" onClick={printVoucher} disabled={preparationRequested}>Print / Save PDF</Button>
              <Button onClick={() => setPreparationRequested(true)} disabled={preparationRequested}>
                {preparationRequested ? `Preparing ${preparationProgress}%…` : "Try again"}
              </Button>
            </div>
          )}
        </div>
      </section>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-none overflow-y-auto p-4 sm:max-w-none sm:p-5 lg:w-[min(1200px,calc(100%-3rem))]">
          <DialogHeader>
            <DialogTitle>PDF preview</DialogTitle>
            <DialogDescription>Review the selected voucher pages before downloading.</DialogDescription>
          </DialogHeader>
          {preview && <iframe src={preview.objectUrl} title="Generated voucher PDF preview" className="h-[65dvh] w-full border-0" />}
          <DialogFooter>
            <Button variant="outline" onClick={closePreview} disabled={isSavingPdf}>Cancel</Button>
            <Button onClick={savePreviewAsPdf} disabled={isSavingPdf}>{isSavingPdf ? "Preparing PDF…" : "Save PDF"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="sr-only" aria-live="polite">{pasteStatus}</p>
    </main>
  );
}
