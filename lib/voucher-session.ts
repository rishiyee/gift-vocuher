import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "voucher_session";
const sessionLifetimeSeconds = 60 * 60 * 12;

function secret() {
  const value = process.env.VOUCHER_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("VOUCHER_SESSION_SECRET must be at least 32 characters.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function sameString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyVoucherPin(pin: string) {
  const expected = process.env.VOUCHER_ADMIN_PIN;
  if (!expected || !process.env.VOUCHER_SESSION_SECRET) throw new Error("Voucher access is not configured.");
  return sameString(pin, expected);
}

export function createVoucherSessionCookie() {
  const expires = Date.now() + sessionLifetimeSeconds * 1000;
  const payload = String(expires);
  const token = `${payload}.${signature(payload)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${sessionLifetimeSeconds}`;
}

export function hasVoucherSession(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  if (!token) return false;
  const separator = token.indexOf(".");
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  const expires = Number(payload);
  if (!Number.isSafeInteger(expires) || expires <= Date.now()) return false;
  try {
    return sameString(suppliedSignature, signature(payload));
  } catch {
    return false;
  }
}
