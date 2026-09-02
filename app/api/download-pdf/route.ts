const MAX_PDF_BASE64_LENGTH = 20_000_000;

export async function POST(request: Request) {
  const formData = await request.formData();
  const encodedPdf = formData.get("pdf");
  const requestedFileName = formData.get("fileName");

  if (typeof encodedPdf !== "string" || !encodedPdf.length || encodedPdf.length > MAX_PDF_BASE64_LENGTH) {
    return new Response("Invalid PDF payload", { status: 400 });
  }

  const pdf = Buffer.from(encodedPdf, "base64");
  if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return new Response("Invalid PDF file", { status: 400 });
  }

  const fileName = (typeof requestedFileName === "string" ? requestedFileName : "Gift Voucher.pdf")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\.+$/, "")
    .slice(0, 180) || "Gift Voucher.pdf";
  const encodedFileName = encodeURIComponent(fileName);

  return new Response(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="Gift Voucher.pdf"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
