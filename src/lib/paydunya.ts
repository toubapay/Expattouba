/**
 * Paydunya Checkout Invoice API v1 client, for vendors paying for a
 * listing pass by card/mobile money instead of an admin assigning one
 * manually.
 *
 * IMPORTANT — unverified against a live account: this sandbox has no
 * network egress to paydunya.com (same restriction the sister app
 * documents for its own third-party integrations), so the endpoint paths,
 * header names, and payload/response shapes below are best-effort from
 * Paydunya's documented API and have not been exercised against a real
 * request. Before relying on this in production, run one real checkout
 * with test-mode keys and fix whatever doesn't match — start with
 * confirmInvoice's response parsing, since that's the one place a wrong
 * field name would fail closed (see the reasoning below) rather than loud.
 *
 * The one thing that does NOT depend on getting the exact shape right:
 * an IPN's own body is never trusted for the payment status. It's only
 * ever used to find which order to re-check, and confirmInvoke's answer —
 * fetched here with our own secret keys, not read off whatever a POST
 * body claims — is the only thing that can mark an order paid. That's
 * Paydunya's own documented recommendation, and it also means a mistaken
 * field name in the IPN parsing can misroute a status check, but can
 * never fabricate a payment that didn't happen.
 */

const BASE_URL = 'https://app.paydunya.com/api/v1';

interface PaydunyaConfig {
  masterKey: string;
  privateKey: string;
  publicKey: string;
  token: string;
}

function getConfig(): PaydunyaConfig | null {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY;
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY;
  const publicKey = process.env.PAYDUNYA_PUBLIC_KEY;
  const token = process.env.PAYDUNYA_TOKEN;
  if (!masterKey || !privateKey || !publicKey || !token) return null;
  return { masterKey, privateKey, publicKey, token };
}

/** False until all four PAYDUNYA_* env vars are set — the frontend uses
 * this (via a public endpoint) to hide the Paydunya option honestly
 * instead of showing a button that would fail every time. */
export function isPaydunyaConfigured(): boolean {
  return getConfig() !== null;
}

export class PaydunyaNotConfiguredError extends Error {
  constructor() {
    super("Le paiement en ligne n'est pas configuré sur ce serveur");
  }
}

function authHeaders(config: PaydunyaConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': config.masterKey,
    'PAYDUNYA-PRIVATE-KEY': config.privateKey,
    'PAYDUNYA-PUBLIC-KEY': config.publicKey,
    'PAYDUNYA-TOKEN': config.token,
  };
}

export interface CreateInvoiceParams {
  amountFcfa: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  customData?: Record<string, string>;
}

export interface CreatedInvoice {
  token: string;
  checkoutUrl: string;
}

export async function createInvoice(params: CreateInvoiceParams): Promise<CreatedInvoice> {
  const config = getConfig();
  if (!config) throw new PaydunyaNotConfiguredError();

  const res = await fetch(`${BASE_URL}/checkout-invoice/create`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify({
      invoice: {
        total_amount: params.amountFcfa,
        description: params.description,
      },
      store: {
        name: 'SeneMarket',
      },
      actions: {
        cancel_url: params.cancelUrl,
        return_url: params.returnUrl,
        callback_url: params.callbackUrl,
      },
      custom_data: params.customData || {},
    }),
  });

  const data: any = await res.json().catch(() => ({}));
  if (data.response_code !== '00' || !data.token) {
    throw new Error(data.response_text || `Échec de création de la facture Paydunya (HTTP ${res.status})`);
  }
  return { token: data.token, checkoutUrl: `https://paydunya.com/checkout/invoice/${data.token}` };
}

export type InvoiceStatus = 'completed' | 'pending' | 'cancelled' | 'unknown';

export interface ConfirmedInvoice {
  status: InvoiceStatus;
  customData: Record<string, unknown>;
}

/** The only source of truth for "was this actually paid" — see the file
 * header. Always call this before activating anything, whether triggered
 * by an IPN or by the app polling after the checkout redirect returns. */
export async function confirmInvoice(token: string): Promise<ConfirmedInvoice> {
  const config = getConfig();
  if (!config) throw new PaydunyaNotConfiguredError();

  const res = await fetch(`${BASE_URL}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: authHeaders(config),
  });

  const data: any = await res.json().catch(() => ({}));
  const rawStatus = data.status;
  const status: InvoiceStatus =
    rawStatus === 'completed' || rawStatus === 'pending' || rawStatus === 'cancelled' ? rawStatus : 'unknown';
  return { status, customData: data.custom_data || {} };
}

/** Best-effort extraction of the invoice token from an IPN POST body —
 * deliberately permissive about the shape (see file header) since a
 * wrong guess here only means confirmInvoice gets called with the wrong
 * token (which then fails to match any of our pending orders and is
 * ignored), never a false positive. */
export function extractTokenFromIpnBody(body: any): string | null {
  return body?.data?.invoice?.token || body?.data?.token || body?.token || null;
}
