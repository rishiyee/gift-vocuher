import serverlessChromium from "@sparticuz/chromium";
import { chromium } from "playwright-core";
import { normalizeVoucherContent, normalizeVoucherPageIndices } from "@/lib/voucher";

export const runtime = "nodejs";
export const maxDuration = 60;

async function launchChromium() {
  const isServerless = Boolean(
    process.env.VERCEL
    || process.env.AWS_LAMBDA_FUNCTION_NAME
    || process.env.NETLIFY,
  );

  if (isServerless) {
    return chromium.launch({
      args: serverlessChromium.args,
      executablePath: await serverlessChromium.executablePath(),
      headless: true,
    });
  }

  return chromium.launch({ headless: true });
}

export async function POST(request: Request) {
  let browser;
  try {
    const body = await request.json() as Record<string, unknown>;
    const content = normalizeVoucherContent(body.content);
    const indices = normalizeVoucherPageIndices(body.indices);
    if (!content || !indices) return Response.json({ error: "Invalid voucher data." }, { status: 400 });

    const printUrl = new URL("/voucher/print", request.url);
    browser = await launchChromium();
    const page = await browser.newPage();
    await page.addInitScript((data) => {
      window.__VOUCHER_PRINT_DATA__ = data;
    }, { content, indices });
    await page.goto(printUrl.toString(), { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 10_000 });
    await page.waitForFunction(() => document.fonts.status === "loaded" && Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 20_000 });
    const pdf = await page.pdf({ width: "210mm", height: "99mm", margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true, printBackground: true });
    return new Response(new Uint8Array(pdf), { headers: { "Cache-Control": "no-store", "Content-Type": "application/pdf" } });
  } catch (error) {
    console.error("Chromium PDF generation failed.", error);
    return Response.json({ error: "The PDF could not be generated." }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
