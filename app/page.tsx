"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isValid, parse } from "date-fns";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const pages = ["Front", "Back"];

const initialContent = {
  frontTitle: "GIFT\nVOUCHER",
  message: "Wishing you both a lifetime of love, laughter, and beautiful moments together.\n\nMay this little getaway be the beginning of countless wonderful journeys and cherished memories.",
  sender: "OG BANGALORE",
  backTitle: "VOUCHER",
  villaType: "PRIVATE POOL VILLA",
  candlelightDinner: true,
  flowerBed: true,
  guestName: "Vyshanav & Parvathy",
  checkInDate: "14 September 2026",
  checkInTime: "AT 2:00 PM",
  checkOutDate: "15 September 2026",
  checkOutTime: "AT 11:00 AM",
  redeemDate: "29 November 2026",
  address: "Chembarathi Wayanad Boutique Resort, Close to Sunrise Valley View, Kadassery, Vaduvanchal, Kerala 673581",
  phone: "+91 88 91 8888 18",
  email: "hello@chembarathi.com",
};

function EditorField({ id, label, value, multiline = false, onChange }: { id: string; label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
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
  const [content, setContent] = useState(initialContent);
  const [exporting, setExporting] = useState<number | "all" | null>(null);
  const [preview, setPreview] = useState<{ indices: number[]; images: string[] } | null>(null);
  const canvasRefs = useRef<Array<HTMLDivElement | null>>([]);
  const update = <Key extends keyof typeof initialContent>(key: Key) => (value: (typeof initialContent)[Key]) => setContent((current) => ({ ...current, [key]: value }));
  const selectedInclusions = [content.candlelightDinner && "a candlelight dinner", content.flowerBed && "a flower bed"].filter(Boolean);
  const inclusionText = selectedInclusions.length ? `Includes ${selectedInclusions.join(" and ")}.` : "No special inclusions selected.";
  const displayMessage = content.message.trim() || initialContent.message;

  async function renderPage(index: number) {
    const canvas = canvasRefs.current[index];
    if (!canvas) throw new Error("Voucher canvas is not available");
    await document.fonts.ready;
    await Promise.all(Array.from(canvas.querySelectorAll("img")).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
    return toPng(canvas, { canvasWidth: 2100, canvasHeight: 990, pixelRatio: 1, cacheBust: true, style: { borderRadius: "0px" } });
  }

  async function preparePreview(indices: number[]) {
    const exportTarget = indices.length === 2 ? "all" : indices[0];
    setExporting(exportTarget);
    try {
      const images = [];
      for (const index of indices) images.push(await renderPage(index));
      setPreview({ indices, images });
    } finally {
      setExporting(null);
    }
  }

  function savePreviewAsPdf() {
    if (!preview) return;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [2100, 990], hotfixes: ["px_scaling"] });
    preview.images.forEach((image, imageIndex) => {
      if (imageIndex > 0) pdf.addPage([2100, 990], "landscape");
      pdf.addImage(image, "PNG", 0, 0, 2100, 990, undefined, "FAST");
    });
    const suffix = preview.indices.length === 2 ? "front-and-back" : preview.indices[0] === 0 ? "front" : "back";
    pdf.save(`gift-voucher-${suffix}.pdf`);
    setPreview(null);
  }

  return (
    <main className="mx-auto w-full max-w-[1800px] px-[clamp(20px,4vw,64px)] pt-8 pb-24 max-[720px]:px-4 max-[720px]:pb-14 max-[560px]:pt-5">
      <header className="flex items-end justify-between gap-7 border-b border-zinc-200 pb-6 max-[720px]:gap-[18px] max-[720px]:pb-5 max-[560px]:flex-col max-[560px]:items-start">
        <div>
          <p className="mb-2 font-secondary text-[11px] font-bold tracking-[.18em] text-zinc-500 uppercase">Voucher canvas</p>
          <h1 className="font-primary text-[clamp(28px,4vw,46px)] font-medium tracking-[-.045em]">Gift voucher</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button disabled={exporting !== null} />}>{exporting !== null ? "Preparing PDF..." : "Download PDF"}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Choose pages</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => preparePreview([0])}>Front page</DropdownMenuItem>
              <DropdownMenuItem onClick={() => preparePreview([1])}>Back page</DropdownMenuItem>
              <DropdownMenuItem onClick={() => preparePreview([0, 1])}>Front &amp; back</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white font-secondary shadow-sm" aria-labelledby="editor-title">
        <div className="border-b border-zinc-100 px-4 py-5 sm:px-5">
          <p className="font-secondary text-[11px] font-semibold tracking-[.18em] text-zinc-500 uppercase">Live editor</p>
          <h2 id="editor-title" className="mt-1 font-secondary text-2xl font-light text-zinc-950">Edit voucher text</h2>
          <p className="mt-2 font-secondary text-sm leading-5 text-zinc-500">Choose a page, then update its content. Changes appear instantly.</p>
        </div>
        <div className="px-4 pb-3 sm:px-5">
        <Accordion defaultValue={["front"]}>
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 shadow-xs">
          <AccordionItem value="front">
            <AccordionTrigger className="hover:no-underline">Front page</AccordionTrigger>
            <AccordionContent>
              <div className="px-1 pt-3">
              <FieldSet>
                <FieldLegend>Voucher copy</FieldLegend>
                <EditorField id="front-title" label="Title" value={content.frontTitle} multiline onChange={update("frontTitle")} />
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="message">Message</FieldLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => update("message")(initialContent.message)}>Autofill</Button>
                  </div>
                  <Textarea id="message" value={content.message} onChange={(event) => update("message")(event.target.value)} />
                  <FieldDescription>The default message is used when this field is empty.</FieldDescription>
                </Field>
                <EditorField id="sender" label="Sender" value={content.sender} onChange={update("sender")} />
              </FieldSet>
              </div>
            </AccordionContent>
          </AccordionItem>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 shadow-xs">
          <AccordionItem value="back">
            <AccordionTrigger className="hover:no-underline">Back page</AccordionTrigger>
            <AccordionContent>
            <div className="grid gap-7 px-1 pt-3">
              <FieldSet>
              <FieldLegend>Voucher &amp; inclusions</FieldLegend>
              <EditorField id="back-title" label="Voucher title" value={content.backTitle} onChange={update("backTitle")} />
              <Field>
                <FieldLabel htmlFor="villa-type">Villa type</FieldLabel>
                <Select value={content.villaType} onValueChange={(value) => value && update("villaType")(value)}>
                  <SelectTrigger id="villa-type"><SelectValue placeholder="Select a villa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE POOL VILLA">Private Pool Villa</SelectItem>
                    <SelectItem value="POOL VILLA">Pool Villa</SelectItem>
                    <SelectItem value="DELUXE VILLA">Deluxe Villa</SelectItem>
                    <SelectItem value="HONEYMOON VILLA">Honeymoon Villa</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Inclusions</FieldLabel>
                <div className="grid gap-3">
                  <Field orientation="horizontal">
                    <Checkbox id="candlelight-dinner" checked={content.candlelightDinner} onCheckedChange={update("candlelightDinner")} />
                    <FieldLabel htmlFor="candlelight-dinner">Candlelight dinner</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="flower-bed" checked={content.flowerBed} onCheckedChange={update("flowerBed")} />
                    <FieldLabel htmlFor="flower-bed">Flower bed</FieldLabel>
                  </Field>
                </div>
              </Field>
              </FieldSet>

              <FieldSet>
              <FieldLegend>Guest &amp; stay</FieldLegend>
              <EditorField id="guest-name" label="Guest name" value={content.guestName} onChange={update("guestName")} />
              <DateEditorField id="check-in-date" label="Check-in date" value={content.checkInDate} onChange={update("checkInDate")} />
              <EditorField id="check-in-time" label="Check-in time" value={content.checkInTime} onChange={update("checkInTime")} />
              <DateEditorField id="check-out-date" label="Check-out date" value={content.checkOutDate} onChange={update("checkOutDate")} />
              <EditorField id="check-out-time" label="Check-out time" value={content.checkOutTime} onChange={update("checkOutTime")} />
              <DateEditorField id="redeem-date" label="Redeem before" value={content.redeemDate} onChange={update("redeemDate")} />
              </FieldSet>

              <FieldSet>
              <FieldLegend>Resort contact</FieldLegend>
              <EditorField id="address" label="Address" value={content.address} multiline onChange={update("address")} />
              <EditorField id="phone" label="Phone" value={content.phone} onChange={update("phone")} />
              <EditorField id="email" label="Email" value={content.email} onChange={update("email")} />
              </FieldSet>
            </div>
            </AccordionContent>
          </AccordionItem>
          </div>
        </Accordion>
        </div>
      </section>

      <section className="grid min-w-0 gap-[clamp(50px,8vw,86px)] max-[720px]:gap-[42px] min-[1600px]:gap-24" aria-label="Voucher pages">
        {pages.map((page, index) => (
          <article key={page}>
            <div ref={(node) => { canvasRefs.current[index] = node; }} className="group relative aspect-[2100/990] w-full overflow-hidden rounded-[clamp(10px,1.5vw,20px)] border border-white/8 bg-[linear-gradient(115deg,#141d1c_0%,#141f1e_50%,#121c1a_75%,#142421_100%)] shadow-[0_2px_4px_rgba(16,28,25,.12),0_24px_60px_rgba(16,28,25,.16)] [container-type:inline-size] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_40%,transparent_20%,rgba(3,10,8,.18)_100%)] after:content-[''] max-[720px]:rounded-[9px] max-[720px]:shadow-[0_2px_3px_rgba(16,28,25,.1),0_14px_32px_rgba(16,28,25,.14)]">
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
                    <p className="pb-[.3cqw] font-secondary text-[1.05cqw] font-medium tracking-[.18em]">{content.villaType}</p>
                  </div>

                  <div className="mt-[2.4cqw] h-px w-full bg-[#beb16b]/40" />

                  <div className="grid flex-1 grid-cols-[1fr_1px_1fr] items-center gap-[4.3cqw]">
                    <div>
                      <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">DETAILS</p>
                      <p className="mt-[1cqw] max-w-[31cqw] font-primary text-[1.22cqw] leading-[1.45] font-light">{inclusionText}</p>
                    </div>

                    <div className="h-[10.5cqw] w-px bg-[#beb16b]/25" />

                    <div>
                      <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">NAME</p>
                      <p className="mt-[.8cqw] font-primary text-[1.85cqw] leading-none font-light">{content.guestName}</p>

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

                      <p className="mt-[1.4cqw] font-primary text-[.7cqw] font-light">Redeemable for stays before <span className="ml-[.35cqw] text-[.82cqw]">{content.redeemDate}</span></p>

                    </div>
                  </div>

                  <div className="border-t border-[#beb16b]/40 pt-[1.25cqw]">
                    <div className="grid grid-cols-[4.2cqw_1fr_auto] items-center gap-[1.6cqw]">
                      <Image className="h-auto w-[4.2cqw] object-contain" src="/logo.svg" alt="" width={340} height={296} />
                      <p className="max-w-[42cqw] font-primary text-[.9cqw] leading-[1.55] font-light">{content.address}</p>
                      <p className="font-secondary text-right text-[.8cqw] leading-[1.65] tracking-[.02em] whitespace-nowrap">{content.phone}<br />{content.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {index === 0 && <Image className="absolute top-1/2 left-[79.048%] z-20 h-[29.899%] w-[16.19%] -translate-y-1/2 object-contain" src="/logo.svg" alt="" width={340} height={296} />}

              <div className="absolute inset-[4.8%] z-30 rounded-lg border border-dashed border-[rgba(211,234,225,.12)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
            </div>
          </article>
        ))}
      </section>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>PDF preview</DialogTitle>
            <DialogDescription>Review the selected voucher pages before downloading.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {preview?.images.map((image, index) => (
              <Image key={`${preview.indices[index]}-${image.length}`} src={image} alt={`${preview.indices[index] === 0 ? "Front" : "Back"} voucher preview`} width={1050} height={495} unoptimized className="h-auto w-full border border-zinc-200" />
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button onClick={savePreviewAsPdf}>Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
