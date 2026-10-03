import { randomUUID } from "node:crypto";
import { normalizeAiVoucherDraft } from "@/lib/voucher";

export const runtime = "nodejs";
export const maxDuration = 60;

const voucherDraftSchema = {
  type: "object",
  properties: {
    message: { type: "string", description: "A warm guest-facing gift message, at most 45 words." },
    sender: { type: "string", description: "Gift giver's name, or an empty string when not explicitly present." },
    guestName: { type: "string", description: "Guest or recipient name in title case." },
    voucherNumber: { type: "string", description: "Voucher, booking, or confirmation number exactly as shown in the source, or an empty string when absent." },
    villaType: {
      type: "string",
      enum: [
        "DELUXE COTTAGE WITH FOREST VIEW",
        "DELUXE COTTAGE WITH LAWN VIEW",
        "HONEYMOON SUITE",
        "PREMIUM COTTAGE WITH MOUNTAIN VIEW",
        "PREMIUM COTTAGE WITH POOL VIEW AND MOUNTAIN VIEW",
        "PRIVATE POOL VILLA",
      ],
    },
    voucherType: { type: "string", enum: ["dated", "open"] },
    checkInDate: { type: "string", description: "Date formatted as d MMMM yyyy, or empty for an open voucher." },
    checkInTime: { type: "string", description: "Time formatted as AT h:mm AM/PM, or empty for an open voucher." },
    checkOutDate: { type: "string", description: "Date formatted as d MMMM yyyy, or empty for an open voucher." },
    checkOutTime: { type: "string", description: "Time formatted as AT h:mm AM/PM, or empty for an open voucher." },
    redeemDate: { type: "string", description: "Date formatted as d MMMM yyyy for an open voucher, otherwise empty." },
    bbqDinner: { type: "boolean" },
    candlelightDinner: { type: "boolean" },
    flowerBed: { type: "boolean" },
    floatingBreakfast: { type: "boolean" },
    notes: {
      type: "array",
      items: { type: "string" },
      description: "Short review notes for missing or ambiguous voucher details. Empty when everything needed is clear.",
    },
  },
  required: [
    "message", "sender", "guestName", "voucherNumber", "villaType", "voucherType", "checkInDate",
    "checkInTime", "checkOutDate", "checkOutTime", "redeemDate", "bbqDinner",
    "candlelightDinner", "flowerBed", "floatingBreakfast", "notes",
  ],
  additionalProperties: false,
} as const;

type GeminiResponse = {
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

type GeminiFailure = {
  status: number;
  model: string;
  message?: string;
};

type GenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

function getOutputText(response: GeminiResponse) {
  for (const step of [...(response.steps ?? [])].reverse()) {
    if (step.type !== "model_output") continue;
    for (const content of step.content ?? []) {
      if (content.type === "text" && content.text) return content.text;
    }
  }
  return null;
}

function parseGeminiJson(text: string) {
  const trimmed = text.trim();
  const json = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  return JSON.parse(json) as unknown;
}

function geminiErrorMessage(failure: GeminiFailure | null) {
  if (!failure) return "The AI service could not draft this voucher. Please try again.";
  if (failure.status === 429) return "Gemini has reached its request limit. Wait a moment and try again.";
  if (failure.status === 503) return "Gemini Flash is temporarily busy. Please try again shortly.";
  if (failure.status === 401 || failure.status === 403) return "The Gemini API key is invalid or does not have access to this model.";
  return "The AI service could not draft this voucher. Please try again.";
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Paste valid voucher details and try again.", requestId }, { status: 400 });
  }

  const source = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).source
    : null;
  if (typeof source !== "string" || source.trim().length < 10 || source.length > 20_000) {
    return Response.json({ error: "Voucher details must be between 10 and 20,000 characters.", requestId }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI drafting is not configured. Add GEMINI_API_KEY to the server environment.", requestId },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const prompt = [
      "Extract a polished gift voucher draft from resort booking text.",
      "Use only facts explicitly present in the source. Correct obvious spelling mistakes and normalize dates/times.",
      "Map the cottage to the closest allowed villaType enum.",
      "Copy the voucher, booking, or confirmation number into voucherNumber. Keep it out of the gift message.",
      "Treat an inclusion as true only when it is explicitly included; complimentary standard breakfast is not floating breakfast.",
      "Never place prices, balances, bank details, UTR IDs, phone numbers, policies, or booking reference numbers in the gift message.",
      "Do not use a resort employee's sign-off as the sender. If no gift giver is named, return an empty sender.",
      "For a dated booking, redeemDate must be empty. For an open voucher, all check-in/check-out fields must be empty.",
      "Write a warm, tasteful message of no more than 45 words suitable for the voucher front.",
      "SOURCE BOOKING TEXT:",
      source.trim(),
    ].join(" ");
    const models = [...new Set([
      process.env.GEMINI_MODEL || "gemini-3.8-flash",
      process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash",
    ])];
    let lastFailure: GeminiFailure | null = null;

    for (const model of models) {
      try {
        const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            store: false,
            input: prompt,
            response_format: {
              type: "text",
              mime_type: "application/json",
              schema: voucherDraftSchema,
            },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        const result = await geminiResponse.json().catch(() => null) as GeminiResponse | null;
        if (!geminiResponse.ok) {
          lastFailure = { status: geminiResponse.status, model, message: result?.error?.message };
          console.warn(`Gemini voucher draft attempt failed: ${requestId} ${model} ${geminiResponse.status} ${lastFailure.message || "Unknown provider error"}`);
          if ([404, 429, 503].includes(geminiResponse.status)) continue;
          return Response.json(
            { error: geminiErrorMessage(lastFailure), requestId },
            { status: 502, headers: { "Cache-Control": "no-store" } },
          );
        }

        const outputText = result ? getOutputText(result) : null;
        const draft = outputText ? normalizeAiVoucherDraft(parseGeminiJson(outputText)) : null;
        if (!draft) {
          lastFailure = { status: 422, model, message: "The model response did not match the voucher schema." };
          console.warn(`Gemini voucher draft attempt failed: ${requestId} ${model} schema mismatch`);
          continue;
        }

        console.info(`Gemini voucher draft generated: ${requestId} ${model}`);
        return Response.json({ draft, requestId }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown request failure";
        lastFailure = { status: 0, model, message };
        console.warn(`Gemini voucher draft attempt failed: ${requestId} ${model} ${message}`);
      }
    }

    const compatibilityModel = "gemini-2.5-flash";
    try {
      const compatibilityResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${compatibilityModel}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: voucherDraftSchema,
            },
          }),
          signal: AbortSignal.timeout(20_000),
        },
      );
      const compatibilityResult = await compatibilityResponse.json().catch(() => null) as GenerateContentResponse | null;
      if (compatibilityResponse.ok) {
        const outputText = compatibilityResult?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
        const draft = outputText ? normalizeAiVoucherDraft(parseGeminiJson(outputText)) : null;
        if (draft) {
          console.info(`Gemini voucher draft generated: ${requestId} ${compatibilityModel} generateContent`);
          return Response.json({ draft, requestId }, { headers: { "Cache-Control": "no-store" } });
        }
        lastFailure = { status: 422, model: compatibilityModel, message: "The compatibility response did not match the voucher schema." };
      } else {
        lastFailure = {
          status: compatibilityResponse.status,
          model: compatibilityModel,
          message: compatibilityResult?.error?.message,
        };
      }
      console.warn(`Gemini voucher draft compatibility attempt failed: ${requestId} ${compatibilityModel} ${lastFailure.status} ${lastFailure.message || "Unknown provider error"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown request failure";
      lastFailure = { status: 0, model: compatibilityModel, message };
      console.warn(`Gemini voucher draft compatibility attempt failed: ${requestId} ${compatibilityModel} ${message}`);
    }

    return Response.json(
      { error: geminiErrorMessage(lastFailure), requestId },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("AI voucher drafting failed.", { requestId, error });
    return Response.json({ error: "The voucher draft could not be prepared. Please try again.", requestId }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
