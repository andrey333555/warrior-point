type YooKassaCreateResponse = {
  id: string;
  status: string;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
};

function getCredentials(): { shopId: string; secretKey: string } | null {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

export function isYooKassaConfigured(): boolean {
  return getCredentials() !== null;
}

export async function createYooKassaPayment(opts: {
  paymentId: string;
  grossRub: number;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<{ yookassaId: string; confirmationUrl: string } | null> {
  const creds = getCredentials();
  if (!creds) return null;

  const value = opts.grossRub.toFixed(2);
  const idempotenceKey = opts.paymentId;

  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.shopId}:${creds.secretKey}`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value, currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: opts.returnUrl,
      },
      description: opts.description,
      metadata: opts.metadata,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YooKassa error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as YooKassaCreateResponse;
  const confirmationUrl = data.confirmation?.confirmation_url;
  if (!confirmationUrl) {
    throw new Error("YooKassa: missing confirmation_url");
  }

  return { yookassaId: data.id, confirmationUrl };
}
