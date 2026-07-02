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

export async function initiateTransfer(params: {
  amount: string;
  receiver: string;
  channel: number;
  externalref: string;
  reference?: string;
}): Promise<{ ok: boolean; code: string; transactionId: string | null }> {
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

  const payload = data.data as { txstatus?: number; transactionid?: string } | null;
  const ok = Number(data.status) === 1 && payload?.txstatus === 1;
  return { ok, code: data.code, transactionId: payload?.transactionid ?? null };
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
  const payload = data.data as { txstatus?: number } | null;
  return { txstatus: payload?.txstatus ?? null };
}
