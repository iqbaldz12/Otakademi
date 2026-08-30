import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { markPaid } from "@/server/services/payment.service";

/**
 * POST /api/payments/webhook - payment gateway callback.
 *
 * The spec leaves the provider unchosen (section 13), so this implements the
 * shape every Indonesian gateway shares: a JSON body plus an HMAC signature
 * header. Swapping in Midtrans/Xendit/Doku later means adjusting the field names
 * and the signature recipe, not the settlement logic.
 *
 * Security notes:
 *  - The signature is required and compared in constant time. Without it, anyone
 *    who guessed a registration code could mark it paid.
 *  - `markPaid` is idempotent, so provider retries are safe.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  // Refuse to run in an insecure configuration rather than accepting anything.
  if (!secret) {
    console.error("[webhook] PAYMENT_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  // Read the raw body: the signature is computed over exact bytes, so parsing
  // first and re-serialising would break verification.
  const raw = await request.text();

  const provided =
    request.headers.get("x-signature") ??
    request.headers.get("x-callback-token") ??
    "";

  const expected = createHmac("sha256", secret).update(raw).digest("hex");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    registrationCode?: string;
    order_id?: string;
    external_id?: string;
    status?: string;
    transaction_status?: string;
    payment_method?: string;
    id?: string;
  };

  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Accept the common aliases providers use for the merchant reference.
  const code =
    payload.registrationCode ?? payload.order_id ?? payload.external_id;

  if (!code) {
    return NextResponse.json(
      { error: "Missing registration reference" },
      { status: 400 },
    );
  }

  const status = (payload.status ?? payload.transaction_status ?? "").toUpperCase();
  const settled = ["PAID", "SETTLEMENT", "SUCCESS", "CAPTURE", "COMPLETED"];

  if (!settled.includes(status)) {
    // Acknowledge non-settlement events so the provider stops retrying.
    return NextResponse.json({ received: true, applied: false, status });
  }

  const result = await markPaid({
    registrationCode: code.toUpperCase(),
    method: payload.payment_method ?? "gateway",
    providerRef: payload.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  return NextResponse.json({
    received: true,
    applied: !result.alreadyPaid,
  });
}
