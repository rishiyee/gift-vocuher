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
      "SELECT id, voucher_number AS \"voucherNumber\", guest_name AS \"guestName\", content, updated_at AS \"updatedAt\" FROM vouchers ORDER BY updated_at DESC",
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
  const record = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown> : null;
  const value = record?.content ?? null;
  const id = record?.id ?? null;
  if (id !== null && (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    return Response.json({ error: "Select a valid voucher to update." }, { status: 400 });
  }
  const content = normalizeVoucherContent(value);
  if (!content || !content.voucherNumber.trim() || !content.guestName.trim()
    || !["dated", "open"].includes(content.voucherType)) {
    return Response.json({ error: "Add a voucher number and guest name before saving." }, { status: 400 });
  }
  try {
    if (typeof id === "string") {
      const result = await voucherDb().query(
        `UPDATE vouchers SET voucher_number = $2, guest_name = $3, content = $4::jsonb, updated_at = now()
         WHERE id = $1 RETURNING id, updated_at AS "updatedAt"`,
        [id, content.voucherNumber.trim(), content.guestName.trim(), JSON.stringify(content)],
      );
      if (result.rowCount === 0) return Response.json({ error: "That voucher was not found." }, { status: 404 });
      return Response.json({ saved: result.rows[0] }, { headers: { "Cache-Control": "no-store" } });
    }
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
    if ((error as { code?: string })?.code === "23505") {
      return Response.json({ error: "A voucher with that number already exists." }, { status: 409 });
    }
    return Response.json({ error: "The voucher could not be saved. Check the database setup." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!hasVoucherSession(request)) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid voucher selection." }, { status: 400 });
  }
  const id = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).id : null;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "Select a valid voucher to delete." }, { status: 400 });
  }
  try {
    const result = await voucherDb().query("DELETE FROM vouchers WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return Response.json({ error: "That voucher was not found." }, { status: 404 });
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Deleting voucher failed.", error);
    return Response.json({ error: "The voucher could not be deleted. Check the database setup." }, { status: 503 });
  }
}
