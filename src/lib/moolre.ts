import { readEnv } from "@/lib/env";

// Shared client for Moolre APIs: SMS, Disbursements (transfers), and
// direct MoMo collections (USSD prompt). Payment links live in
// /api/payment/create-link and predate this module.
//
// Docs: https://docs.moolre.com

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

// Transfer (disbursement) channels: 1=MTN, 6=Telecel, 7=AirtelTigo
export const MOMO_CHANNELS = [
  { id: 1, label: "MTN Mobile Money" },
  { id: 6, label: "Telecel Cash" },
  { id: 7, label: "AirtelTigo Money" },
] as const;

// Direct collections use a different MTN channel id than transfers.
const COLLECTION_CHANNEL: Record<number, number> = { 1: 13, 6: 6, 7: 7 };

export function isValidMomoChannel(value: unknown): value is 1 | 6 | 7 {
  return value === 1 || value === 6 || value === 7;
}

interface MoolreResponse {
  status: number | string;
  code: string;
  message: unknown;
  data: unknown;
}

function keyHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-USER": readEnv("MOOLRE_API_USER") || "",
    "X-API-KEY": readEnv("MOOLRE_API_KEY") || "",
  };
}

async function moolrePost(path: string, headers: Record<string, string>, body: unknown): Promise<MoolreResponse> {
  const res = await fetch(`${MOOLRE_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return (await res.json()) as MoolreResponse;
}

export function isMoolreConfigured(): boolean {
  return Boolean(readEnv("MOOLRE_API_USER") && readEnv("MOOLRE_API_KEY") && readEnv("MOOLRE_ACCOUNT_NUMBER"));
}

export function isMoolreSmsConfigured(): boolean {
  return Boolean(readEnv("MOOLRE_API_VASKEY") && readEnv("MOOLRE_SMS_SENDER_ID"));
}

// ─── SMS ─────────────────────────────────────────────────────────────────────

export async function sendSms(
  messages: { recipient: string; message: string; ref?: string }[],
): Promise<{ ok: boolean; code: string }> {
  const data = await moolrePost(
    "/open/sms/send",
    {
      "Content-Type": "application/json",
      "X-API-USER": readEnv("MOOLRE_API_USER") || "",
      "X-API-VASKEY": readEnv("MOOLRE_API_VASKEY") || "",
    },
    {
      type: 1,
      senderid: readEnv("MOOLRE_SMS_SENDER_ID"),
      messages,
    },
  );
  return { ok: data.code === "SMS01", code: data.code };
}

// ─── Disbursements ───────────────────────────────────────────────────────────

// Confirm the registered wallet holder name before saving a payout number.
export async function validateWalletName(
  receiver: string,
  channel: number,
): Promise<{ ok: boolean; name: string | null }> {
  const data = await moolrePost("/open/transact/validate", keyHeaders(), {
    type: 1,
    receiver,
    channel: String(channel),
    currency: "GHS",
    accountnumber: readEnv("MOOLRE_ACCOUNT_NUMBER"),
  });
  if (data.code === "AVD01" && typeof data.data === "string") {
    return { ok: true, name: data.data };
  }
  return { ok: false, name: null };
}

// A successful initiation returns txstatus 0 ("Pay out in Progress",
// code APY16) — settlement is confirmed separately via transaction
// status. Verified against the Moolre sandbox; the docs' success
// example (immediate txstatus 1) is not what the API returns.
export async function initiateTransfer(params: {
  amount: string;
  receiver: string;
  channel: number;
  externalref: string;
  reference?: string;
}): Promise<{ initiated: boolean; settled: boolean; code: string }> {
  const data = await moolrePost("/open/transact/transfer", keyHeaders(), {
    type: 1,
    channel: String(params.channel),
    currency: "GHS",
    amount: params.amount,
    receiver: params.receiver,
    externalref: params.externalref,
    reference: params.reference,
    accountnumber: readEnv("MOOLRE_ACCOUNT_NUMBER"),
  });

  const payload = data.data as { txstatus?: number | string } | null;
  const initiated = Number(data.status) === 1;
  return { initiated, settled: initiated && Number(payload?.txstatus) === 1, code: data.code };
}

// ─── Direct MoMo collection (USSD approval prompt) ──────────────────────────

export async function initiateMomoPayment(params: {
  payer: string;
  channel: number; // transfer-style channel id; mapped for collections
  amount: string;
  externalref: string;
  reference?: string;
  otpcode?: string;
}): Promise<{ ok: boolean; otpRequired: boolean; code: string; message: string | null }> {
  const data = await moolrePost("/open/transact/payment", keyHeaders(), {
    type: 1,
    channel: String(COLLECTION_CHANNEL[params.channel] ?? params.channel),
    currency: "GHS",
    payer: params.payer,
    amount: params.amount,
    externalref: params.externalref,
    reference: params.reference,
    ...(params.otpcode ? { otpcode: params.otpcode } : {}),
    accountnumber: readEnv("MOOLRE_ACCOUNT_NUMBER"),
  });

  const message = typeof data.message === "string" ? data.message : null;
  if (data.code === "TP14") {
    return { ok: false, otpRequired: true, code: data.code, message };
  }
  return { ok: Number(data.status) === 1, otpRequired: false, code: data.code, message };
}

// ─── Transaction status (shared by transfers and payments) ──────────────────

export async function getTransactionStatus(
  externalref: string,
): Promise<{ txstatus: number | null }> {
  const data = await moolrePost("/open/transact/status", keyHeaders(), {
    type: 1,
    idtype: 1,
    id: externalref,
    accountnumber: readEnv("MOOLRE_ACCOUNT_NUMBER"),
  });
  const payload = data.data as { txstatus?: number | string } | null;
  const raw = payload?.txstatus;
  if (raw === undefined || raw === null) return { txstatus: null };
  const n = Number(raw);
  return { txstatus: Number.isNaN(n) ? null : n };
}

// ─── Collection verification (subscription activation) ──────────────────────

export type CollectionVerification =
  | { ok: true; amount: number | null }
  | {
      ok: false;
      // pending/failed are terminal answers from Moolre; "error" means we
      // could not get an answer (network, malformed response) and the
      // caller should retry rather than treat the payment as bad.
      reason: "pending" | "failed" | "underpaid" | "error";
      txstatus: number | null;
      amount: number | null;
    };

function readAmount(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  for (const key of ["amount", "value", "amountpaid", "amount_paid"]) {
    const raw = payload[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Server-to-server check that a collection identified by our externalref
 * actually settled. Moolre webhooks are unsigned, so this is the only
 * thing that may ever grant Premium.
 *
 * txstatus is coerced with Number() — the API has been observed returning
 * both numeric and string status values, and a strict `!== 1` would
 * silently reject every real payment if the type flipped.
 *
 * When expectedAmount is given and Moolre reports an amount, an underpaid
 * transaction is rejected. A missing amount field is tolerated: the
 * externalref was minted by us for a fixed-price link/charge, so the
 * status check alone is already authoritative.
 */
export async function verifyCollectionPayment(
  externalref: string,
  expectedAmount: number | null,
): Promise<CollectionVerification> {
  let data: MoolreResponse;
  try {
    data = await moolrePost("/open/transact/status", keyHeaders(), {
      type: 1,
      idtype: 1,
      id: externalref,
      accountnumber: readEnv("MOOLRE_ACCOUNT_NUMBER"),
    });
  } catch (err) {
    console.error("Moolre status lookup failed:", err);
    return { ok: false, reason: "error", txstatus: null, amount: null };
  }

  const payload = (data?.data && typeof data.data === "object" ? data.data : null) as Record<string, unknown> | null;
  const rawStatus = payload?.txstatus ?? (data as unknown as { txstatus?: unknown })?.txstatus;
  const txstatus = rawStatus === undefined || rawStatus === null ? null : Number(rawStatus);
  const amount = readAmount(payload);

  if (txstatus === null || Number.isNaN(txstatus)) {
    console.error("Moolre status lookup returned no txstatus", { externalref, code: data?.code });
    return { ok: false, reason: "error", txstatus: null, amount };
  }

  // txstatus: 0 = Pending, 1 = Success, 2 = Failed
  if (txstatus === 0) return { ok: false, reason: "pending", txstatus, amount };
  if (txstatus !== 1) return { ok: false, reason: "failed", txstatus, amount };

  if (expectedAmount !== null && amount !== null && amount < expectedAmount) {
    console.error(`Moolre verify: underpaid ref=${externalref} paid=${amount} expected=${expectedAmount}`);
    return { ok: false, reason: "underpaid", txstatus, amount };
  }
  if (expectedAmount !== null && amount === null) {
    console.warn(`Moolre verify: no amount in status payload for ref=${externalref}; accepting on txstatus alone`);
  }

  return { ok: true, amount };
}
