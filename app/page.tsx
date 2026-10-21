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
import { Calendar as CalendarIcon, Check, ClipboardPaste, Download, LibraryBig, Moon, PencilLine, Search, Share2, Sparkles, Sun, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VoucherPages } from "@/components/voucher/voucher-pages";
import { InstallApp } from "@/components/pwa/install-app";
import { initialVoucherContent as initialContent, type AiVoucherDraft, type VoucherContent, type VoucherPageIndex } from "@/lib/voucher";

const PIN_LENGTH = 4;
type SavedVoucher = { id: string; voucherNumber: string; guestName: string; content: VoucherContent; updatedAt: string };
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
  const [pin, setPin] = useState<string[]>(() => Array(PIN_LENGTH).fill(""));
  const [pinError, setPinError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const pinRef = useRef<string[]>(Array(PIN_LENGTH).fill(""));
  const pinInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [content, setContent] = useState<VoucherContent>(initialContent);
  const [isDark, setIsDark] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [exporting, setExporting] = useState<number | "all" | null>(null);
  const [pasteStatus, setPasteStatus] = useState("");
  const [inclusionsVerified, setInclusionsVerified] = useState(false);
  const [exportError, setExportError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState("");
  const [preparedDesktopPdf, setPreparedDesktopPdf] = useState<{ file: File; contentKey: string } | null>(null);
  const [mobileStep, setMobileStep] = useState(0);
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [mobileShareFile, setMobileShareFile] = useState<File | null>(null);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [preparationRequested, setPreparationRequested] = useState(false);
  const [voucherSource, setVoucherSource] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [draftNotes, setDraftNotes] = useState<string[]>([]);
  const [savedVouchers, setSavedVouchers] = useState<SavedVoucher[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingVoucherId, setDeletingVoucherId] = useState<string | null>(null);
  const [sharingVoucherId, setSharingVoucherId] = useState<string | null>(null);
  const [preparedShare, setPreparedShare] = useState<{ id: string; file: File; content: VoucherContent } | null>(null);
  const update = <Key extends keyof typeof initialContent>(key: Key) => (value: (typeof initialContent)[Key]) => setContent((current) => ({ ...current, [key]: value }));
  const selectedInclusions = [
    content.bbqDinner && "BBQ Dinner",
    content.candlelightDinner && "Candlelight dinner",
    content.flowerBed && "Flower bed decoration",
    content.floatingBreakfast && "Floating breakfast",
  ].filter((inclusion): inclusion is string => Boolean(inclusion));
  const messageState = !content.message.trim() ? "Empty" : content.message === DEFAULT_MESSAGE ? "Autofilled" : "Custom";
  const mobileSteps = ["Message", "Cottage", "Guest & stay", "Review"];
  const filteredSavedVouchers = savedVouchers.filter((voucher) =>
    `${voucher.voucherNumber} ${voucher.guestName}`.toLocaleLowerCase().includes(librarySearch.trim().toLocaleLowerCase()),
  );

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

  async function unlockApp(candidate: string) {
    setIsUnlocking(true);
    try {
      const response = await fetch("/api/voucher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: candidate }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The editor could not be unlocked.");
      setIsUnlocked(true);
      setPinError("");
      void loadSavedVouchers();
      return;
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "The editor could not be unlocked.");
      const emptyPin = Array<string>(PIN_LENGTH).fill("");
      pinRef.current = emptyPin;
      setPin(emptyPin);
      window.setTimeout(() => focusPinInput(0), 0);
      if ("vibrate" in navigator) navigator.vibrate([80, 50, 80]);
    } finally {
      setIsUnlocking(false);
    }
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

    if (digit && index < PIN_LENGTH - 1) {
      focusPinInput(index + 1);
      window.requestAnimationFrame(() => focusPinInput(index + 1));
    }
    if (nextPin.every(Boolean)) {
      void unlockApp(nextPin.join(""));
    }
  }

  function pastePin(value: string) {
    const pastedPin = value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!pastedPin) return;
    const nextPin = Array.from({ length: PIN_LENGTH }, (_, index) => pastedPin[index] ?? "");
    pinRef.current = nextPin;
    setPin(nextPin);
    setPinError("");
    if (pastedPin.length === PIN_LENGTH) void unlockApp(pastedPin);
    else focusPinInput(pastedPin.length);
  }

  async function loadSavedVouchers() {
    setLibraryError("");
    try {
      const response = await fetch("/api/vouchers", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Saved vouchers could not be loaded.");
      }
      const result = await response.json() as { vouchers?: SavedVoucher[] };
      setSavedVouchers(result.vouchers ?? []);
    } catch (error) {
      console.error("Loading saved vouchers failed.", error);
      setLibraryError(error instanceof Error ? error.message : "Saved vouchers could not be loaded.");
    }
  }

  async function saveVoucher() {
    if (!validateVoucher()) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingVoucherId, content }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The voucher could not be saved.");
      setDownloadNotice("Voucher details saved to the database.");
      setExportError("");
      await loadSavedVouchers();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The voucher could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  function openSavedVoucher(id: string) {
    const saved = savedVouchers.find((voucher) => voucher.id === id);
    if (!saved) return;
    setContent(saved.content);
    setEditingVoucherId(saved.id);
    setInclusionsVerified(true);
    setMobileStep(0);
    setMobileShareFile(null);
    setPreparationRequested(false);
    setExportError("");
    setDownloadNotice(`Loaded voucher ${saved.voucherNumber}.`);
    setPreparedShare(null);
    setIsLibraryOpen(false);
  }

  async function deleteSavedVoucher(voucher: SavedVoucher) {
    setDeletingVoucherId(voucher.id);
    setLibraryError("");
    try {
      const response = await fetch("/api/vouchers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: voucher.id }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "The voucher could not be deleted.");
      setSavedVouchers((current) => current.filter((saved) => saved.id !== voucher.id));
      setConfirmDeleteId(null);
      setPreparedShare((current) => current?.id === voucher.id ? null : current);
      setDownloadNotice(`Voucher ${voucher.voucherNumber} deleted.`);
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "The voucher could not be deleted.");
    } finally {
      setDeletingVoucherId(null);
    }
  }

  async function prepareSavedVoucherShare(voucher: SavedVoucher) {
    setSharingVoucherId(voucher.id);
    setLibraryError("");
    try {
      const { blob, fileName } = await requestVoucherPdf([0, 1], voucher.content);
      setPreparedShare({ id: voucher.id, file: new File([blob], fileName, { type: "application/pdf" }), content: voucher.content });
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "The voucher PDF could not be prepared.");
    } finally {
      setSharingVoucherId(null);
    }
  }

  async function sharePreparedVoucher(voucher: SavedVoucher) {
    const ready = preparedShare?.id === voucher.id ? preparedShare : null;
    if (!ready) return;
    try {
      const canShareFile = typeof navigator.share === "function"
        && typeof navigator.canShare === "function"
        && navigator.canShare({ files: [ready.file] });
      if (canShareFile) {
        await navigator.share({
          files: [ready.file],
          title: `Gift voucher for ${ready.content.guestName} · ${ready.content.voucherNumber}`,
          text: createShareText(ready.content),
        });
        setDownloadNotice(`Voucher ${voucher.voucherNumber} shared.`);
      } else {
        downloadPdfBlob(ready.file, ready.file.name);
        setDownloadNotice("Sharing is unavailable in this browser, so the voucher PDF was downloaded.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLibraryError(error instanceof Error ? error.message : "The voucher could not be shared.");
    }
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
      const draftedContent: VoucherContent = {
        ...content,
        message: draft.message,
        sender: draft.sender,
        guestName: draft.guestName,
        voucherNumber: draft.voucherNumber,
        villaType: draft.villaType,
        voucherType: draft.voucherType,
        checkInDate: draft.checkInDate || content.checkInDate,
        checkInTime: draft.checkInTime || content.checkInTime,
        checkOutDate: draft.checkOutDate || content.checkOutDate,
        checkOutTime: draft.checkOutTime || content.checkOutTime,
        redeemDate: draft.redeemDate || content.redeemDate,
        bbqDinner: draft.bbqDinner,
        candlelightDinner: draft.candlelightDinner,
        flowerBed: draft.flowerBed,
        floatingBreakfast: draft.floatingBreakfast,
      };
      setContent(draftedContent);
      setInclusionsVerified(false);
      setDraftNotes(draft.notes);
      let savedNotice = "";
      try {
        const saveResponse = await fetch("/api/vouchers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draftedContent }),
        });
        const saveResult = await saveResponse.json().catch(() => null) as { saved?: { id?: string }; error?: string } | null;
        if (!saveResponse.ok || !saveResult?.saved?.id) throw new Error(saveResult?.error || "The database did not confirm the save.");
        setEditingVoucherId(saveResult.saved.id);
        savedNotice = " Saved to your voucher library.";
        void loadSavedVouchers();
      } catch (saveError) {
        console.error("Saving generated voucher draft failed.", saveError);
        setExportError(`Draft generated but could not be saved: ${saveError instanceof Error ? saveError.message : "check the database connection"}`);
      }
      setDraftNotice(`Draft ready for ${draft.guestName || "your guest"}.${savedNotice} Fine-tune anything below, then review the voucher.`);
      setHasStartedEditing(true);
      setMobileStep(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The voucher could not be drafted. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  }

  async function requestVoucherPdf(indices: VoucherPageIndex[], voucherContent: VoucherContent = content) {
    const response = await fetch("/api/voucher/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: voucherContent, indices }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string; code?: string; requestId?: string } | null;
      const reference = result?.requestId ? ` Reference: ${result.requestId}.` : "";
      const code = result?.code ? ` (${result.code})` : "";
      throw new Error(`${result?.error || "The PDF could not be generated."}${code}${reference}`);
    }
    return { blob: await response.blob(), fileName: createPdfFileName(indices, voucherContent) };
  }

  async function downloadVoucherPdf() {
    setDownloadNotice("");
    setExportError("");
    if (!validateVoucher()) return;
    setExporting("all");
    try {
      const { blob, fileName } = await requestVoucherPdf([0, 1]);
      setPreparedDesktopPdf({ file: new File([blob], fileName, { type: "application/pdf" }), contentKey: JSON.stringify(content) });
      downloadPdfBlob(blob, fileName);
      setDownloadNotice("Your voucher PDF is ready. If the download did not start, use the button below.");
    } catch (error) {
      console.error("Voucher PDF generation failed.", error);
      setExportError(error instanceof Error ? error.message : "The PDF could not be downloaded. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  function createPdfFileName(indices: VoucherPageIndex[], voucherContent: VoucherContent = content) {
    const guestFileName = voucherContent.guestName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\.+$/, "") || "Guest";
    const voucherFileName = voucherContent.voucherNumber.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\.+$/, "") || "No-number";
    const pageSuffix = indices.length === 2 ? " - Front and Back" : indices[0] === 0 ? " - Front" : " - Back";
    return `${guestFileName} - ${voucherFileName}${pageSuffix} - ${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.pdf`;
  }

  function createShareText(voucherContent: VoucherContent = content) {
    const schedule = voucherContent.voucherType === "dated"
      ? [`🗓️ Check-in: ${voucherContent.checkInDate} ${voucherContent.checkInTime}`, `🗓️ Check-out: ${voucherContent.checkOutDate} ${voucherContent.checkOutTime}`]
      : [`🗓️ Valid until: ${voucherContent.redeemDate}`];
    const inclusions = [
      voucherContent.bbqDinner && "BBQ Dinner",
      voucherContent.candlelightDinner && "Candlelight dinner",
      voucherContent.flowerBed && "Flower bed decoration",
      voucherContent.floatingBreakfast && "Floating breakfast",
    ].filter((inclusion): inclusion is string => Boolean(inclusion));
    const lines = [
      "CHEMBARATHI WAYANAD",
      "🎁 Gift Voucher",
      "",
      `Dear ${voucherContent.guestName},`,
      "",
      "Please find your gift voucher attached. We look forward to welcoming you for a memorable stay.",
      "",
      `Voucher no.: ${voucherContent.voucherNumber}`,
      `🏡 Cottage: ${voucherContent.villaType}`,
      schedule,
      inclusions.length ? `Inclusions: ${inclusions.join(", ")}` : "",
      "",
      voucherContent.message.trim(),
      voucherContent.sender.trim() ? `With warm wishes,\n${voucherContent.sender.trim()}` : "Warm regards,\nChembarathi Wayanad",
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
      <main className="studio-gateway relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16 font-secondary">
        <Button variant="outline" size="icon" className="fixed top-4 right-4" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
      <div className="fixed top-4 left-4 z-20"><InstallApp /></div>
        <section className="studio-gateway-card relative w-[min(100%,24rem)] overflow-hidden rounded-[1.75rem] border border-emerald-950/10 bg-white p-6 shadow-[0_24px_80px_rgba(19,54,43,.12)] dark:border-emerald-100/10 dark:bg-zinc-900 sm:p-8" aria-labelledby="lock-title">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-950 text-sm font-semibold tracking-widest text-amber-200">CW</span>
            <div><p className="text-xs font-semibold tracking-[.17em] text-emerald-900 uppercase dark:text-emerald-200">Chembarathi</p><p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Wayanad · Voucher Studio</p></div>
          </div>
          <p className="text-[10px] font-semibold tracking-[.18em] text-amber-700 uppercase dark:text-amber-300">Private workspace</p>
          <h1 id="lock-title" className="mt-2 font-primary text-3xl font-light tracking-[-.035em] text-zinc-950 dark:text-zinc-50">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Enter your 4-digit PIN to continue to the voucher studio.</p>
          <div className="mt-5 grid gap-3">
            <Field>
              <FieldLabel className="sr-only">4-digit access PIN</FieldLabel>
              <div className="flex justify-between gap-2" role="group" aria-label="4-digit access PIN" aria-describedby={pinError ? "pin-error" : undefined} aria-busy={isUnlocking}>
                {Array.from({ length: PIN_LENGTH }, (_, index) => (
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
                    disabled={isUnlocking}
                    className="h-16 w-[3.35rem] rounded-2xl border-zinc-200 bg-zinc-50 text-center text-xl tabular-nums shadow-inner dark:border-zinc-700 dark:bg-zinc-950"
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
            {isUnlocking && <p className="text-center text-xs text-muted-foreground" role="status">Verifying PIN…</p>}
          </div>
        </section>
      </main>
    );
  }

  if (!hasStartedEditing) {
    return (
      <main className="studio-gateway relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16 font-secondary">
        <Button variant="outline" size="icon" className="fixed top-4 right-4" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
      <div className="fixed top-4 left-4 z-20"><InstallApp /></div>
        <section className="studio-gateway-card relative w-[min(100%,46rem)] overflow-hidden rounded-[1.75rem] border border-emerald-950/10 bg-white shadow-[0_24px_80px_rgba(19,54,43,.12)] dark:border-emerald-100/10 dark:bg-zinc-900" aria-labelledby="details-title">
          <div className="relative border-b border-emerald-950/10 bg-[linear-gradient(125deg,#f0f4ed,#fffaf0)] px-6 py-7 dark:border-emerald-100/10 dark:bg-[linear-gradient(125deg,#172a24,#20241f)] sm:px-9 sm:py-9">
            <div className="mb-7 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-xs font-semibold tracking-widest text-amber-200">CW</span><span className="text-xs font-semibold tracking-[.16em] text-emerald-950 uppercase dark:text-emerald-100">Chembarathi Wayanad</span></div>
            <p className="text-[11px] font-semibold tracking-[.17em] text-amber-800 uppercase dark:text-amber-300">Step 1 <span className="px-1 text-amber-500">·</span> Create a voucher</p>
            <h1 id="details-title" className="mt-2 font-primary text-3xl font-light tracking-[-.035em] text-zinc-950 dark:text-zinc-50 sm:text-4xl">Start with the booking</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">Paste the confirmation and we’ll prepare an editable voucher draft with the guest, stay, and inclusions.</p>
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
              <div className="mt-5 overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100" role="status" aria-live="polite" aria-busy="true">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="ai-sparkle size-4 text-amber-600 dark:text-amber-300" />
                  <span>Creating your voucher draft</span>
                  <span className="ml-auto flex items-center gap-1" aria-hidden="true">
                    {[0, 1, 2].map((dot) => <span key={dot} className="ai-stage-dot size-1.5 rounded-full bg-amber-600 dark:bg-amber-300" style={{ animationDelay: `${dot * 180}ms` }} />)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">Reading the booking details and preparing an editable draft…</p>
                <div className="mt-4 space-y-2.5" aria-hidden="true">
                  {["w-4/5", "w-full", "w-2/3"].map((width) => (
                    <div key={width} className={`relative h-2.5 ${width} overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-900/70`}>
                      <span className="ai-draft-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/85 to-transparent dark:via-amber-100/20" />
                    </div>
                  ))}
                </div>
              </div>
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
      <main className="studio-workspace min-h-dvh w-full px-0 pb-8 sm:px-[clamp(16px,3vw,48px)] sm:pb-20">
      <header className="studio-topbar no-print sticky top-0 z-40 mx-0 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 backdrop-blur-xl sm:-mx-[clamp(16px,3vw,48px)] sm:gap-4 sm:px-[clamp(16px,3vw,48px)] sm:py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-xs font-semibold tracking-widest text-amber-200 shadow-sm">CW</span>
          <div><p className="font-secondary text-[10px] font-semibold tracking-[.16em] text-emerald-900 uppercase dark:text-emerald-200">Chembarathi Wayanad</p>
          <h1 className="font-primary text-xl font-light tracking-[-.02em] sm:text-2xl">Gift voucher studio</h1></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
        <InstallApp />
        <Button variant="ghost" size="sm" aria-label="Edit pasted details" onClick={() => { setEditingVoucherId(null); setHasStartedEditing(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Source</Button>
        <Button variant="outline" size="sm" aria-label={`Open voucher library, ${savedVouchers.length} saved`} onClick={() => setIsLibraryOpen(true)}><LibraryBig /><span className="hidden sm:inline">Vouchers</span><span className="text-muted-foreground">{savedVouchers.length}</span></Button>
        <Button variant="outline" size="sm" onClick={saveVoucher} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
        <Button variant="outline" size="icon" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? "Use light mode" : "Use dark mode"}>
          {isDark ? <Sun /> : <Moon />}
        </Button>
        <Button className="hidden sm:inline-flex" onClick={downloadVoucherPdf} disabled={exporting !== null}>{exporting !== null ? "Preparing PDF…" : "Download PDF"}</Button>
        </div>
      </header>
      <Dialog open={isLibraryOpen} onOpenChange={(open) => {
        setIsLibraryOpen(open);
        if (open) void loadSavedVouchers();
      }}>
        <DialogContent className="studio-library flex max-h-[88dvh] max-w-3xl flex-col gap-4 overflow-hidden p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Voucher library</DialogTitle>
            <DialogDescription>Find a saved voucher to edit, share, or delete.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search vouchers" placeholder="Search by guest or voucher number" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} className="h-10 pl-9" />
          </div>
          {libraryError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{libraryError}</p>}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {filteredSavedVouchers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <LibraryBig className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">{savedVouchers.length ? "No vouchers match that search" : "No saved vouchers yet"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Save a completed voucher to keep it in this library.</p>
              </div>
            ) : filteredSavedVouchers.map((voucher) => {
              const isConfirmingDelete = confirmDeleteId === voucher.id;
              const shareIsReady = preparedShare?.id === voucher.id;
              return (
                <article key={voucher.id} className="studio-voucher-row rounded-2xl border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{voucher.guestName}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">Voucher {voucher.voucherNumber}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {voucher.content.voucherType === "dated"
                          ? `${voucher.content.checkInDate} · ${voucher.content.checkOutDate}`
                          : `Redeem by ${voucher.content.redeemDate}`}
                        {` · Last edited ${new Date(voucher.updatedAt).toLocaleString()}`}
                      </p>
                    </div>
                    {!isConfirmingDelete ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openSavedVoucher(voucher.id)}><PencilLine />Edit</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => shareIsReady ? void sharePreparedVoucher(voucher) : void prepareSavedVoucherShare(voucher)} disabled={sharingVoucherId === voucher.id}>
                          {shareIsReady ? <Share2 /> : <Download />}
                          {sharingVoucherId === voucher.id ? "Preparing…" : shareIsReady ? "Share PDF" : "Prepare share"}
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => setConfirmDeleteId(voucher.id)}><Trash2 />Delete</Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-destructive/5 p-2">
                        <span className="px-1 text-xs text-destructive">Delete this voucher permanently?</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={deletingVoucherId === voucher.id}>Keep</Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => void deleteSavedVoucher(voucher)} disabled={deletingVoucherId === voucher.id}>
                          {deletingVoucherId === voucher.id ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{savedVouchers.length} saved {savedVouchers.length === 1 ? "voucher" : "vouchers"}</p>
        </DialogContent>
      </Dialog>
      {exportError && <div role="alert" className="no-print mx-4 mt-3 rounded-xl bg-destructive/10 px-4 py-3 font-secondary text-sm leading-5 text-destructive sm:mx-0 sm:mt-4 sm:rounded-none">{exportError}</div>}
      {downloadNotice && <div role="status" className="no-print mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 font-secondary text-sm leading-5 text-emerald-700 dark:text-emerald-400 sm:mx-0 sm:mt-4 sm:rounded-none">
        <span>{downloadNotice}</span>
        {preparedDesktopPdf?.contentKey === JSON.stringify(content) && <Button type="button" size="sm" variant="outline" onClick={() => downloadPdfBlob(preparedDesktopPdf.file, preparedDesktopPdf.file.name)}>Download PDF</Button>}
      </div>}

      <nav className="studio-stepper no-print mx-auto mt-5 w-full max-w-5xl px-4 py-4 sm:px-5" aria-label="Voucher creation progress">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-secondary text-xs font-semibold">Step {mobileStep + 1} of {mobileSteps.length}</p>
          <p className="font-secondary text-xs text-zinc-500">{mobileSteps[mobileStep]}</p>
        </div>
        <div className="grid grid-cols-4 gap-2" aria-hidden="true">
          {mobileSteps.map((step, index) => <div key={step} className="flex min-w-0 items-center gap-2"><span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${index < mobileStep ? "bg-emerald-900 text-white dark:bg-emerald-200 dark:text-emerald-950" : index === mobileStep ? "bg-amber-300 text-emerald-950 ring-4 ring-amber-100 dark:ring-amber-900/40" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>{index + 1}</span><span className={`hidden truncate text-xs sm:block ${index === mobileStep ? "font-semibold text-emerald-950 dark:text-emerald-100" : "text-zinc-500"}`}>{step}</span><span className={`h-px min-w-2 flex-1 ${index < mobileStep ? "bg-emerald-800/50 dark:bg-emerald-200/50" : "bg-zinc-200 dark:bg-zinc-700"}`} /></div>)}
        </div>
      </nav>

      <div className={`voucher-studio-layout mx-auto mt-4 grid w-full max-w-[1440px] items-start gap-4 px-4 sm:mt-5 sm:gap-5 sm:px-0 lg:mt-7 ${mobileStep === 3 ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]"} xl:gap-7`}>
      <section className={`studio-editor-card no-print ${mobileStep === 3 ? "hidden" : "block"} self-start overflow-hidden rounded-[1.5rem] border font-secondary xl:sticky xl:top-24`} aria-labelledby="editor-title">
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
                <div className="grid gap-2">
                  <Field orientation="horizontal" className="min-h-12 gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <Switch id="bbq-dinner" checked={content.bbqDinner} onCheckedChange={(value) => { update("bbqDinner")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="bbq-dinner" className="min-h-10 flex-1 cursor-pointer leading-5">BBQ Dinner</FieldLabel>
                  </Field>
                  <Field orientation="horizontal" className="min-h-12 gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <Switch id="candlelight-dinner" checked={content.candlelightDinner} onCheckedChange={(value) => { update("candlelightDinner")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="candlelight-dinner" className="min-h-10 flex-1 cursor-pointer leading-5">Candlelight dinner</FieldLabel>
                  </Field>
                  <Field orientation="horizontal" className="min-h-12 gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <Switch id="flower-bed" checked={content.flowerBed} onCheckedChange={(value) => { update("flowerBed")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="flower-bed" className="min-h-10 flex-1 cursor-pointer leading-5">Flower bed</FieldLabel>
                  </Field>
                  <Field orientation="horizontal" className="min-h-12 gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <Switch id="floating-breakfast" checked={content.floatingBreakfast} onCheckedChange={(value) => { update("floatingBreakfast")(value); setInclusionsVerified(false); }} />
                    <FieldLabel htmlFor="floating-breakfast" className="min-h-10 flex-1 cursor-pointer leading-5">Floating breakfast</FieldLabel>
                  </Field>
                </div>
                {selectedInclusions.length === 0 && <FieldDescription>No inclusions will be shown on the voucher.</FieldDescription>}
                <Field orientation="horizontal" className="mt-2 min-h-12 gap-3 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                  <Checkbox id="verify-inclusions" checked={inclusionsVerified} onCheckedChange={setInclusionsVerified} />
                  <FieldLabel htmlFor="verify-inclusions" className="min-h-10 flex-1 cursor-pointer leading-5">I verified the inclusion selection</FieldLabel>
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
                  <Field orientation="horizontal" className="min-h-12 gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <RadioGroupItem id="dated-voucher" value="dated" />
                    <FieldLabel htmlFor="dated-voucher" className="min-h-10 flex-1 cursor-pointer leading-5">Specific dates</FieldLabel>
                  </Field>
                  <Field orientation="horizontal" className="min-h-12 gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <RadioGroupItem id="open-voucher" value="open" />
                    <FieldLabel htmlFor="open-voucher" className="min-h-10 flex-1 cursor-pointer leading-5">No specific date</FieldLabel>
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
      <div className="sticky bottom-0 mt-3 flex gap-2.5 border-t border-zinc-200 bg-zinc-50/95 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <Button variant="outline" className="flex-1" onClick={() => changeMobileStep(mobileStep - 1)} disabled={mobileStep === 0}>Back</Button>
          <Button className="flex-1" onClick={() => changeMobileStep(mobileStep + 1)}>Continue</Button>
        </div>
        </div>
      </section>

      <section className={`${mobileStep === 3 ? "grid" : "hidden"} studio-preview-card voucher-print-area min-w-0 gap-4 rounded-[1.5rem] border p-4 sm:grid sm:p-5 lg:p-6`} aria-label="Voucher pages">
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
        <div className="voucher-print-chrome sticky bottom-0 -mx-4 -mb-4 grid grid-cols-[auto_1fr] gap-2.5 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
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
