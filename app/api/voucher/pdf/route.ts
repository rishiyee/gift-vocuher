import serverlessChromium from "@sparticuz/chromium";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import { normalizeVoucherContent, normalizeVoucherPageIndices } from "@/lib/voucher";

export const runtime = "nodejs";
export const maxDuration = 60;

type PdfStage = "launch" | "navigation" | "content" | "assets" | "pdf";

const errorCodeByStage: Record<PdfStage, string> = {
  launch: "CHROMIUM_LAUNCH_FAILED",
  navigation: "PRINT_ROUTE_TIMEOUT",
  content: "PRINT_ROUTE_NOT_READY",
  assets: "ASSET_LOAD_TIMEOUT",
  pdf: "PDF_RENDER_FAILED",
};

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
  const requestId = randomUUID();
  const startedAt = Date.now();
  let browser;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: "The voucher request was not valid.", code: "INVALID_REQUEST_BODY", requestId },
      { status: 400, headers: { "Cache-Control": "no-store", "X-PDF-Request-Id": requestId } },
    );
  }

  const content = normalizeVoucherContent(body.content);
  const indices = normalizeVoucherPageIndices(body.indices);
  if (!content || !indices) {
    return Response.json(
      { error: "Invalid voucher data.", code: "INVALID_VOUCHER_DATA", requestId },
      { status: 400, headers: { "Cache-Control": "no-store", "X-PDF-Request-Id": requestId } },
    );
  }

  let stage: PdfStage = "launch";
  try {
    const printUrl = new URL("/voucher/print", request.url);
    browser = await launchChromium();
    const page = await browser.newPage();
    await page.addInitScript((data) => {
      window.__VOUCHER_PRINT_DATA__ = data;
    }, { content, indices });

    stage = "navigation";
    await page.goto(printUrl.toString(), { waitUntil: "networkidle", timeout: 30_000 });

    stage = "content";
    await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 10_000 });

    stage = "assets";
    await page.waitForFunction(() => document.fonts.status === "loaded" && Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 20_000 });

    stage = "pdf";
    const pdf = await page.pdf({ width: "210mm", height: "99mm", margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true, printBackground: true });
    console.info("Voucher PDF generated.", { requestId, durationMs: Date.now() - startedAt, pages: indices.length });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/pdf",
        "X-PDF-Request-Id": requestId,
      },
    });
  } catch (error) {
    const code = errorCodeByStage[stage];
    console.error("Chromium PDF generation failed.", {
      requestId,
      code,
      stage,
      durationMs: Date.now() - startedAt,
      error,
    });
    return Response.json(
      { error: "The PDF service could not prepare the voucher.", code, requestId },
      { status: 500, headers: { "Cache-Control": "no-store", "X-PDF-Request-Id": requestId } },
    );
  } finally {
    if (browser) {
      await browser.close().catch((error) => {
        console.warn("Chromium cleanup failed.", { requestId, error });
      });
    }
  }
}
