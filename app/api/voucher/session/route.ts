import { createVoucherSessionCookie, verifyVoucherPin } from "@/lib/voucher-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter the voucher password." }, { status: 400 });
  }
  const pin = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).pin : null;
  if (typeof pin !== "string" || pin.length > 100) {
    return Response.json({ error: "Enter the voucher password." }, { status: 400 });
  }
  try {
    if (!verifyVoucherPin(pin)) {
      return Response.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }
    return Response.json({ ok: true }, {
      headers: { "Cache-Control": "no-store", "Set-Cookie": createVoucherSessionCookie() },
    });
  } catch {
    return Response.json({ error: "Voucher access is not configured on the server." }, { status: 503 });
  }
}
