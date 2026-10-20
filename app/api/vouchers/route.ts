import { randomUUID } from "node:crypto";
import { voucherDb } from "@/lib/voucher-db";
import { normalizeVoucherContent } from "@/lib/voucher";
import { hasVoucherSession } from "@/lib/voucher-session";

export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Unlock the editor to access saved vouchers." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!hasVoucherSession(request)) return unauthorized();
  try {
    const result = await voucherDb().query(
      "SELECT id, voucher_number AS \"voucherNumber\", guest_name AS \"guestName\", content, updated_at AS \"updatedAt\" FROM vouchers ORDER BY updated_at DESC LIMIT 100",
    );
    return Response.json({ vouchers: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Loading vouchers failed.", error);
    return Response.json({ error: "Saved vouchers could not be loaded. Check the database setup." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasVoucherSession(request)) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid voucher details." }, { status: 400 });
  }
  const value = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).content : null;
  const content = normalizeVoucherContent(value);
  if (!content || !content.voucherNumber.trim() || !content.guestName.trim()
    || !["dated", "open"].includes(content.voucherType)) {
    return Response.json({ error: "Add a voucher number and guest name before saving." }, { status: 400 });
  }
  try {
    const result = await voucherDb().query(
      `INSERT INTO vouchers (id, voucher_number, guest_name, content)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (voucher_number) DO UPDATE SET
         guest_name = EXCLUDED.guest_name,
         content = EXCLUDED.content,
         updated_at = now()
       RETURNING id, updated_at AS "updatedAt"`,
      [randomUUID(), content.voucherNumber.trim(), content.guestName.trim(), JSON.stringify(content)],
    );
    return Response.json({ saved: result.rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Saving voucher failed.", error);
    return Response.json({ error: "The voucher could not be saved. Check the database setup." }, { status: 503 });
  }
}
