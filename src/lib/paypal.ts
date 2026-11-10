// Minimal, explicit PayPal REST client for the sandbox.
// Every money-moving call carries a PayPal-Request-Id so a retry can never double-charge or double-refund.

const API_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
const WEB_BASE = process.env.PAYPAL_WEB_BASE ?? "https://www.sandbox.paypal.com";

function creds() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set");
  return { id, secret, basic: Buffer.from(`${id}:${secret}`).toString("base64") };
}

let cached: { token: string; expiresAt: number } | null = null;

async function appToken(force = false): Promise<string> {
  if (!force && cached && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds().basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new PayPalError("token", res.status, await res.text());
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

export class PayPalError extends Error {
  constructor(public step: string, public status: number, public body: string) {
    super(`PayPal ${step} failed (${status}): ${body.slice(0, 500)}`);
  }
}

type CallOpts = { method?: string; body?: unknown; requestId?: string };

/** Calls the PayPal REST API with the app token, refreshing it once on a 401. */
export async function pp<T = unknown>(path: string, opts: CallOpts = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await appToken(retried)}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (opts.requestId) headers["PayPal-Request-Id"] = opts.requestId;
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  if (res.status === 401 && !retried) return pp<T>(path, opts, true);
  const text = await res.text();
  if (!res.ok) throw new PayPalError(`${opts.method ?? "GET"} ${path}`, res.status, text);
  return (text ? JSON.parse(text) : {}) as T;
}

// ---------- Orders v2 ----------

export type Order = {
  id: string;
  status: string;
  payer?: { payer_id?: string; email_address?: string; name?: { given_name?: string; surname?: string } };
  links?: { href: string; rel: string; method?: string }[];
  purchase_units?: {
    reference_id?: string;
    payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[] };
  }[];
};

export function createOrder(args: {
  amount: string;
  description: string;
  referenceId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  return pp<Order>("/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${args.referenceId}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: args.referenceId,
          description: args.description,
          amount: { currency_code: "USD", value: args.amount },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: args.returnUrl,
            cancel_url: args.cancelUrl,
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            brand_name: "Quiet Hour Audio (demo)",
          },
        },
      },
    },
  });
}

export function captureOrder(orderId: string) {
  return pp<Order>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    requestId: `capture-${orderId}`,
    body: {},
  });
}

export function getOrder(orderId: string) {
  return pp<Order>(`/v2/checkout/orders/${orderId}`);
}

// ---------- Payments v2 ----------

export type Capture = { id: string; status: string; amount: { value: string; currency_code: string } };

export function getCapture(captureId: string) {
  return pp<Capture>(`/v2/payments/captures/${captureId}`);
}

export function refundCapture(captureId: string) {
  return pp<{ id: string; status: string }>(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    requestId: `refund-${captureId}`,
    body: {},
  });
}

// ---------- Log in with PayPal (OpenID Connect) ----------

// Scopes must match the attributes ticked in the app's Log in with PayPal settings, or PayPal answers
// "invalid scope". Override with PAYPAL_LOGIN_SCOPES (space-separated) without touching code.
export const LOGIN_SCOPES =
  process.env.PAYPAL_LOGIN_SCOPES?.trim() || "openid https://uri.paypal.com/services/paypalattributes";

export function loginUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    flowEntry: "static",
    client_id: creds().id,
    response_type: "code",
    scope: LOGIN_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${WEB_BASE}/connect?${q.toString()}`;
}

export type UserInfo = {
  user_id?: string;
  payer_id?: string;
  verified_account?: boolean | string;
  sub?: string;
  email?: string;
  emails?: { value?: string; primary?: boolean; confirmed?: boolean }[];
};

/** The reviewer's primary email, if the email scope was granted. */
export function emailOf(u: UserInfo): string | undefined {
  const e = u.emails?.find((x) => x.primary)?.value ?? u.emails?.[0]?.value ?? u.email;
  return e?.trim().toLowerCase() || undefined;
}

/** Exchanges a Log in with PayPal authorization code and returns the signed-in account's identity. */
export async function identityFromCode(code: string): Promise<UserInfo> {
  const tokenRes = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds().basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code }).toString(),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new PayPalError("login token", tokenRes.status, await tokenRes.text());
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const infoRes = await fetch(`${API_BASE}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!infoRes.ok) throw new PayPalError("userinfo", infoRes.status, await infoRes.text());
  return (await infoRes.json()) as UserInfo;
}

// ---------- Webhooks ----------

export type WebhookEvent = {
  id: string;
  event_type: string;
  resource: { id?: string; status?: string; links?: { href: string; rel: string }[] } & Record<string, unknown>;
};

/** Asks PayPal to confirm a webhook delivery is genuine. Never act on an unverified event. */
export async function verifyWebhook(headers: Headers, event: WebhookEvent): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const result = await pp<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return result.verification_status === "SUCCESS";
}

/** A refund resource links "up" to the capture it refunds; this returns that capture's id. */
export function captureIdFromRefund(event: WebhookEvent): string | undefined {
  const up = event.resource.links?.find((l) => l.rel === "up")?.href;
  return up?.split("/captures/")[1]?.split(/[/?]/)[0];
}
