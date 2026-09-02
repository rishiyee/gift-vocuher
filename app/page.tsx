"use client";

import Image from "next/image";
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
import { format, isValid, parse } from "date-fns";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon, Moon, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

const pages = ["Front", "Back"];
const APP_PIN = "1947";
const VOUCHER_STORAGE_KEY = "gift-voucher-content-v2";
const DEFAULT_MESSAGE = "Wishing you both a lifetime of love, laughter, and beautiful moments together.\n\nMay this little getaway be the beginning of countless wonderful journeys and cherished memories.";

function toTitleCase(value: string) {
  return value.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

const initialContent = {
  frontTitle: "GIFT\nVOUCHER",
  message: "",
  sender: "",
  backTitle: "VOUCHER",
  villaType: "PRIVATE POOL VILLA",
  candlelightDinner: true,
  flowerBed: true,
  guestName: "",
  voucherType: "dated",
  checkInDate: "14 September 2026",
  checkInTime: "AT 2:00 PM",
  checkOutDate: "15 September 2026",
  checkOutTime: "AT 11:00 AM",
  redeemDate: "29 November 2026",
  address: "Chembarathi Wayanad Boutique Resort, Close to Sunrise Valley View, Kadassery, Vaduvanchal, Kerala 673581",
  phone: "+91 88 91 8888 18",
  email: "hello@chembarathi.com",
};

type VoucherContent = typeof initialContent;

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
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [content, setContent] = useState<VoucherContent>(readSavedContent);
  const [isDark, setIsDark] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("gift-voucher-theme") === "dark");
  const [exporting, setExporting] = useState<number | "all" | null>(null);
  const [preview, setPreview] = useState<{ indices: number[]; images: string[] } | null>(null);
  const [pasteStatus, setPasteStatus] = useState("");
  const [inclusionsVerified, setInclusionsVerified] = useState(false);
  const [exportError, setExportError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState("");
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const [editorSections, setEditorSections] = useState<string[]>(["front"]);
  const canvasRefs = useRef<Array<HTMLDivElement | null>>([]);
  const update = <Key extends keyof typeof initialContent>(key: Key) => (value: (typeof initialContent)[Key]) => setContent((current) => ({ ...current, [key]: value }));
  const selectedInclusions = [content.candlelightDinner && "a candlelight dinner", content.flowerBed && "a flower bed"].filter(Boolean);
  const inclusionText = selectedInclusions.length ? `Includes ${selectedInclusions.join(" and ")}.` : "";
  const displayMessage = content.message.trim();
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
    setMobileStep(boundedStep);
    setEditorSections(boundedStep === 0 ? ["front"] : boundedStep < 3 ? ["back"] : []);
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

  function unlockApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin === APP_PIN) {
      setIsUnlocked(true);
      setPinError("");
      return;
    }
    setPinError("Incorrect PIN. Please try again.");
    if ("vibrate" in navigator) navigator.vibrate([80, 50, 80]);
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

  async function renderPage(index: number) {
    const canvas = canvasRefs.current[index];
    if (!canvas) throw new Error("Voucher canvas is not available");
    await document.fonts.ready;
    await Promise.all(Array.from(canvas.querySelectorAll("img")).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
    return toPng(canvas, {
      canvasWidth: 2100,
      canvasHeight: 990,
      pixelRatio: 1,
      cacheBust: true,
      style: { borderRadius: "0px" },
    });
  }

  async function preparePreview(indices: number[]) {
    setDownloadNotice("");
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
      return;
    }
    setExportError("");
    const exportTarget = indices.length === 2 ? "all" : indices[0];
    setExporting(exportTarget);
    try {
      const images = [];
      for (const index of indices) images.push(await renderPage(index));
      setPreview({ indices, images });
    } catch (error) {
      console.error("Voucher PDF generation failed.", error);
      const pageSuggestion = indices.length === 2 ? " You can also try downloading one page at a time." : "";
      setExportError(`The PDF could not be prepared. Please wait for the voucher images to appear, then try again.${pageSuggestion}`);
    } finally {
      setExporting(null);
    }
  }

  async function savePreviewAsPdf() {
    if (!preview) return;
    try {
      setExportError("");
      setDownloadNotice("");
      setIsSavingPdf(true);
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [2100, 990], hotfixes: ["px_scaling"] });
      preview.images.forEach((image, imageIndex) => {
        if (imageIndex > 0) pdf.addPage([2100, 990], "landscape");
        pdf.addImage(image, "PNG", 0, 0, 2100, 990, undefined, "FAST");
      });
      const guestFileName = content.guestName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\.+$/, "") || "Gift Voucher";
      const pageSuffix = preview.indices.length === 2 ? " - Front and Back" : preview.indices[0] === 0 ? " - Front" : " - Back";
      const generatedAt = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const fileName = `${guestFileName}${pageSuffix} - ${generatedAt}.pdf`;

      const pdfBlob = pdf.output("blob");
      const objectUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = fileName;
      downloadLink.rel = "noopener";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setDownloadNotice("PDF download requested. Check your browser downloads if it does not appear immediately.");
      setPreview(null);
    } catch (error) {
      console.error("PDF download failed.", error);
      setExportError("The PDF could not be saved. Try one page at a time, or use Safari's Share menu and choose Save to Files.");
    } finally {
      setIsSavingPdf(false);
    }
  }

  if (!isUnlocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10 font-secondary dark:bg-zinc-950">
        <Button variant="outline" size="icon" className="fixed top-4 right-4" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
        <section className="w-[min(100%,24rem)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04),0_16px_48px_rgba(0,0,0,.08)] dark:bg-zinc-900 sm:p-8" aria-labelledby="lock-title">
          <p className="text-[10px] font-semibold tracking-[.16em] text-zinc-500 uppercase">Voucher studio</p>
          <h1 id="lock-title" className="mt-2 text-2xl font-semibold tracking-[-.03em] text-zinc-950 dark:text-zinc-50">Enter access PIN</h1>
          <p className="mt-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400">Enter the four-digit PIN to open the gift voucher editor.</p>
          <form className="mt-6 grid gap-4" onSubmit={unlockApp}>
            <Field>
              <FieldLabel htmlFor="app-pin">Four-digit PIN</FieldLabel>
              <Input
                id="app-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                autoComplete="current-password"
                maxLength={4}
                value={pin}
                aria-invalid={Boolean(pinError)}
                aria-describedby={pinError ? "pin-error" : undefined}
                autoFocus
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                  if (pinError) setPinError("");
                }}
              />
              {pinError && <FieldDescription id="pin-error" className="text-destructive" aria-live="polite">{pinError}</FieldDescription>}
            </Field>
            <Button type="submit" disabled={pin.length !== 4} className="w-full">Unlock editor</Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full px-0 pb-20 sm:px-[clamp(16px,3vw,48px)]">
      <header className="sticky top-0 z-40 mx-0 flex items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 sm:-mx-[clamp(16px,3vw,48px)] sm:px-[clamp(16px,3vw,48px)]">
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
              <DropdownMenuLabel>Choose pages</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => preparePreview([0])}>Front page</DropdownMenuItem>
              <DropdownMenuItem onClick={() => preparePreview([1])}>Back page</DropdownMenuItem>
              <DropdownMenuItem onClick={() => preparePreview([0, 1])}>Front &amp; back</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>
      {exportError && <div role="alert" className="mx-4 mt-4 bg-destructive/10 px-4 py-3 font-secondary text-sm text-destructive sm:mx-0">{exportError}</div>}
      {downloadNotice && <div role="status" className="mx-4 mt-4 bg-emerald-500/10 px-4 py-3 font-secondary text-sm text-emerald-700 dark:text-emerald-400 sm:mx-0">{downloadNotice}</div>}

      <nav className="px-4 pt-5 sm:hidden" aria-label="Voucher creation progress">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-secondary text-xs font-semibold">Step {mobileStep + 1} of {mobileSteps.length}</p>
          <p className="font-secondary text-xs text-zinc-500">{mobileSteps[mobileStep]}</p>
        </div>
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {mobileSteps.map((step, index) => <span key={step} className={`h-1 rounded-full ${index <= mobileStep ? "bg-zinc-950 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-800"}`} />)}
        </div>
      </nav>

      <div className="mt-0 grid items-start gap-5 sm:mt-5 lg:mt-8 xl:grid-cols-[400px_minmax(0,1fr)] xl:gap-8">
      <section className={`${mobileStep === 3 ? "hidden" : "block"} self-start overflow-hidden bg-white font-secondary dark:bg-zinc-900 sm:block sm:rounded-2xl sm:shadow-[0_1px_2px_rgba(0,0,0,.03),0_12px_32px_rgba(0,0,0,.04)] xl:sticky xl:top-24`} aria-labelledby="editor-title">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-secondary text-[11px] font-semibold tracking-[.16em] text-zinc-500 uppercase">Live editor</p>
            <Badge variant="outline"><span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />Live preview</Badge>
          </div>
          <h2 id="editor-title" className="font-secondary text-xl font-semibold tracking-[-.02em] text-zinc-950 dark:text-zinc-50 sm:text-2xl"><span className="sm:hidden">{mobileSteps[mobileStep]}</span><span className="hidden sm:inline">Customize your voucher</span></h2>
          <p className="mt-2 font-secondary text-sm leading-5 text-zinc-500 dark:text-zinc-400"><span className="sm:hidden">Complete this step, then continue to build your voucher.</span><span className="hidden sm:inline">Update the recipient and stay details. Every change appears on the canvas instantly.</span></p>
        </div>
        <div className="bg-zinc-50/70 px-4 pb-4 dark:bg-zinc-950/60 sm:px-5 sm:pb-5">
        <Accordion value={editorSections} onValueChange={setEditorSections}>
          <div className={`${mobileStep === 0 ? "block" : "hidden"} mt-4 bg-white px-3 dark:bg-zinc-900 sm:block sm:rounded-xl sm:shadow-xs sm:transition-shadow sm:hover:shadow-sm`}>
          <AccordionItem value="front">
            <AccordionTrigger className="hover:no-underline">Front page</AccordionTrigger>
            <AccordionContent>
              <div className="px-1 pt-3">
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
                <EditorField id="sender" label="Sender" value={content.sender} placeholder="OG BANGALORE" onChange={update("sender")} />
              </FieldSet>
              </div>
            </AccordionContent>
          </AccordionItem>
          </div>

          <div className={`${mobileStep === 1 || mobileStep === 2 ? "block" : "hidden"} mt-3 bg-white px-3 dark:bg-zinc-900 sm:block sm:rounded-xl sm:shadow-xs sm:transition-shadow sm:hover:shadow-sm`}>
          <AccordionItem value="back">
            <AccordionTrigger className="hover:no-underline">Back page</AccordionTrigger>
            <AccordionContent>
            <div className="grid gap-7 px-1 pt-3">
              <FieldSet className={mobileStep === 1 ? "flex" : "hidden sm:flex"}>
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
                    <Switch id="candlelight-dinner" checked={content.candlelightDinner} onCheckedChange={(value) => { update("candlelightDinner")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="candlelight-dinner">Candlelight dinner</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Switch id="flower-bed" checked={content.flowerBed} onCheckedChange={(value) => { update("flowerBed")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="flower-bed">Flower bed</FieldLabel>
                  </Field>
                </div>
                {selectedInclusions.length === 0 && <FieldDescription>No inclusions will be shown on the voucher.</FieldDescription>}
                <Field orientation="horizontal">
                  <Checkbox id="verify-inclusions" checked={inclusionsVerified} onCheckedChange={setInclusionsVerified} />
                  <FieldLabel htmlFor="verify-inclusions">I verified the inclusion selection</FieldLabel>
                </Field>
              </Field>
              </FieldSet>

              <FieldSet className={mobileStep === 2 ? "flex" : "hidden sm:flex"}>
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
                  <DateEditorField id="check-in-date" label="Check-in date" value={content.checkInDate} onChange={update("checkInDate")} />
                  <EditorField id="check-in-time" label="Check-in time" value={content.checkInTime} disabled onChange={update("checkInTime")} />
                  <DateEditorField id="check-out-date" label="Check-out date" value={content.checkOutDate} onChange={update("checkOutDate")} />
                  <EditorField id="check-out-time" label="Check-out time" value={content.checkOutTime} disabled onChange={update("checkOutTime")} />
                </>
              ) : (
                <DateEditorField id="redeem-date" label="Redeem before" value={content.redeemDate} onChange={update("redeemDate")} />
              )}
              </FieldSet>

              <FieldSet className="hidden sm:flex">
              <FieldLegend>Resort contact</FieldLegend>
              <EditorField id="address" label="Address" value={content.address} multiline disabled onChange={update("address")} />
              <EditorField id="phone" label="Phone" value={content.phone} disabled onChange={update("phone")} />
              <EditorField id="email" label="Email" value={content.email} disabled onChange={update("email")} />
              </FieldSet>
            </div>
            </AccordionContent>
          </AccordionItem>
          </div>
        </Accordion>
        <div className="sticky bottom-0 mt-4 flex gap-3 border-t border-zinc-200 bg-zinc-50/95 pt-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
          <Button variant="outline" className="flex-1" onClick={() => changeMobileStep(mobileStep - 1)} disabled={mobileStep === 0}>Back</Button>
          <Button className="flex-1" onClick={() => changeMobileStep(mobileStep + 1)}>Continue</Button>
        </div>
        </div>
      </section>

      <section className={`${mobileStep === 3 ? "grid" : "hidden"} min-w-0 gap-4 bg-transparent p-0 sm:grid sm:rounded-2xl sm:bg-zinc-100/70 sm:p-5 sm:dark:bg-zinc-900/70 lg:p-6`} aria-label="Voucher pages">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-secondary text-sm font-semibold text-zinc-900 dark:text-zinc-100">Canvas preview</h2>
            <p className="mt-0.5 font-secondary text-xs text-zinc-500 dark:text-zinc-400 xl:hidden">Swipe horizontally to inspect the full voucher.</p>
          </div>
          <Badge variant="secondary">2 pages</Badge>
        </div>
        <div className="grid gap-6 sm:gap-8 lg:gap-10">
        {pages.map((page, index) => (
          <article key={page} tabIndex={0} aria-label={`${page} voucher preview. Scroll horizontally on smaller screens.`} className="mx-0 overflow-x-auto px-0 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6 xl:mx-0 xl:overflow-visible xl:px-0 xl:pb-0">
            <div ref={(node) => { canvasRefs.current[index] = node; }} className="group relative aspect-[2100/990] w-full min-w-[840px] overflow-hidden rounded-[9px] bg-[linear-gradient(115deg,#141d1c_0%,#141f1e_50%,#121c1a_75%,#142421_100%)] shadow-[0_2px_3px_rgba(16,28,25,.1),0_14px_32px_rgba(16,28,25,.14)] [container-type:inline-size] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_40%,transparent_20%,rgba(3,10,8,.18)_100%)] after:content-[''] xl:min-w-0 xl:rounded-[clamp(10px,1.5vw,20px)] xl:shadow-[0_2px_4px_rgba(16,28,25,.12),0_24px_60px_rgba(16,28,25,.16)]">
              <Image className="absolute top-[-24.04%] left-[67.667%] z-10 h-[90.202%] w-[48.619%] origin-center rotate-150 object-contain" src="/spiral.svg" alt="" width={1021} height={893} priority={index === 0} />
              <Image className="absolute top-1/2 left-1/2 z-10 h-[90.202%] w-[48.619%] -translate-x-1/2 -translate-y-1/2 object-contain" src="/spiral.svg" alt="" width={1021} height={893} />
              <Image className="absolute top-[10.101%] left-[30.952%] z-20 h-[8.081%] w-[3.81%]" src="/dot.svg" alt="" width={80} height={80} />
              <Image className="absolute top-[20.202%] left-[28.571%] z-20 h-[3.03%] w-[1.429%]" src="/dot.svg" alt="" width={30} height={30} />

              {index === 0 && (
                <>
                  <div className="absolute top-1/2 left-[7.619%] z-20 w-[49.524%] -translate-y-1/2 text-[#beb16b]">
                    <p className="mb-[.8cqw] font-secondary text-[.65cqw] font-light tracking-[.24em]">A GIFT FOR YOU</p>
                    <h3 className="m-0 whitespace-pre-line font-primary text-[6.65cqw] leading-[.86] font-light tracking-[-.03em]">{content.frontTitle}</h3>

                    <div className="mt-[3.3cqw] h-px w-[38cqw] bg-[#beb16b]/40" />

                    <div className="mt-[1.8cqw] w-[83%]">
                      <p className="font-secondary text-[.62cqw] font-light tracking-[.22em]">MESSAGE</p>
                      <p className="mt-[.9cqw] whitespace-pre-line font-primary text-[1.05cqw] leading-[1.5] font-light tracking-[.005em]">{displayMessage}</p>
                      <p className="mt-[1.35cqw] font-secondary text-[.7cqw] font-medium tracking-[.12em]">{content.sender}</p>
                    </div>
                  </div>
                </>
              )}

              {index === 1 && (
                <div className="absolute inset-x-[7.619%] top-[11.5%] bottom-[9%] z-20 flex flex-col text-[#beb16b]">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="mb-[.7cqw] font-secondary text-[.62cqw] font-light tracking-[.24em]">CHEMBARATHI · WAYANAD</p>
                      <h3 className="m-0 font-primary text-[5.15cqw] leading-[.82] font-light tracking-[-.035em]">{content.backTitle}</h3>
                    </div>
                    <p className="ml-auto pb-[.3cqw] text-right font-secondary text-[.84cqw] font-medium tracking-[.1em] whitespace-nowrap">{content.villaType}</p>
                  </div>

                  <div className="mt-[2.4cqw] h-px w-full bg-[#beb16b]/40" />

                  <div className={inclusionText ? "grid flex-1 grid-cols-[1fr_1px_1fr] items-center gap-[4.3cqw]" : "grid flex-1 grid-cols-1 items-center"}>
                    {inclusionText && <div className="order-3">
                      <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">DETAILS</p>
                      <p className="mt-[1cqw] font-primary text-[1.22cqw] leading-[1.45] font-light">{inclusionText}</p>
                    </div>}

                    {inclusionText && <div className="order-2 h-[10.5cqw] w-px bg-[#beb16b]/25" />}

                    <div className={inclusionText ? "order-1" : "justify-self-start text-left"}>
                      <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">NAME</p>
                      <p className="mt-[.8cqw] font-primary text-[1.85cqw] leading-none font-light">{content.guestName}</p>

                      {content.voucherType === "dated" ? (
                      <div className="mt-[2.25cqw] grid grid-cols-2 gap-[2.2cqw]">
                        <div>
                          <p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">CHECK-IN</p>
                          <p className="mt-[.55cqw] font-primary text-[1.02cqw] leading-none font-light whitespace-nowrap">{content.checkInDate}</p>
                          <p className="mt-[.55cqw] font-secondary text-[.58cqw] font-medium tracking-[.13em]">{content.checkInTime}</p>
                        </div>
                        <div>
                          <p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">CHECK-OUT</p>
                          <p className="mt-[.55cqw] font-primary text-[1.02cqw] leading-none font-light whitespace-nowrap">{content.checkOutDate}</p>
                          <p className="mt-[.55cqw] font-secondary text-[.58cqw] font-medium tracking-[.13em]">{content.checkOutTime}</p>
                        </div>
                      </div>
                      ) : (
                        <div className="mt-[3cqw]">
                          <p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">REDEEM BEFORE</p>
                          <p className="mt-[.7cqw] font-primary text-[1.65cqw] leading-none font-light">{content.redeemDate}</p>
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="border-t border-[#beb16b]/40 pt-[1.25cqw]">
                    <div className="grid grid-cols-[4.2cqw_1fr_auto] items-center gap-[1.6cqw]">
                      <Image className="h-auto w-[4.2cqw] object-contain" src="/logo.svg" alt="" width={340} height={296} />
                      <p className="font-primary text-[.9cqw] leading-[1.55] font-light">{content.address}</p>
                      <p className="font-primary text-right text-[.8cqw] leading-[1.65] tracking-[.02em] whitespace-nowrap">{content.phone}<br />{content.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {index === 0 && <Image className="absolute top-1/2 left-[79.048%] z-20 h-[29.899%] w-[16.19%] -translate-y-1/2 object-contain" src="/logo.svg" alt="" width={340} height={296} />}

            </div>
          </article>
        ))}
        </div>
        <div className="sticky bottom-0 grid grid-cols-[auto_1fr] gap-3 border-t border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
          <Button variant="outline" onClick={() => changeMobileStep(2)}>Back</Button>
          <Button onClick={() => preparePreview([0, 1])} disabled={exporting !== null}>{exporting !== null ? "Preparing…" : "Review & save PDF"}</Button>
        </div>
      </section>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-none overflow-y-auto p-3 sm:w-[calc(100%-2rem)] sm:max-w-none sm:p-5 lg:w-[min(1200px,calc(100%-3rem))]">
          <DialogHeader>
            <DialogTitle>PDF preview</DialogTitle>
            <DialogDescription>Review the selected voucher pages before downloading.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4" aria-label="Selected PDF pages">
            {preview?.images.map((image, index) => (
              <Image key={`${preview.indices[index]}-${image.length}`} src={image} alt={`${preview.indices[index] === 0 ? "Front" : "Back"} voucher preview`} width={1050} height={495} unoptimized className="h-auto w-full" />
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={isSavingPdf}>Cancel</Button>
            <Button onClick={savePreviewAsPdf} disabled={isSavingPdf}>{isSavingPdf ? "Preparing PDF…" : "Save PDF"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="sr-only" aria-live="polite">{pasteStatus}</p>
    </main>
  );
}
