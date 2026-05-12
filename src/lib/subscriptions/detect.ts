import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface SubscriptionDetectionResult {
  isSubscription: boolean;
  interval: "MONTHLY" | "ANNUAL" | "QUARTERLY" | "WEEKLY" | null;
  confidence: "high" | "low";
}

// Known subscription vendors — fast path before calling Claude
const KNOWN_SUBSCRIPTIONS: Record<string, "MONTHLY" | "ANNUAL" | "QUARTERLY"> = {
  spotify: "MONTHLY", netflix: "MONTHLY", adobe: "MONTHLY",
  "adobe creative": "MONTHLY", figma: "MONTHLY", github: "MONTHLY",
  slack: "MONTHLY", notion: "MONTHLY", dropbox: "MONTHLY",
  "google workspace": "MONTHLY", "google one": "MONTHLY",
  microsoft: "MONTHLY", "office 365": "MONTHLY", "microsoft 365": "MONTHLY",
  aws: "MONTHLY", "amazon web services": "MONTHLY",
  digitalocean: "MONTHLY", vercel: "MONTHLY", heroku: "MONTHLY",
  cloudflare: "MONTHLY", mailchimp: "MONTHLY", hubspot: "MONTHLY",
  zoom: "MONTHLY", "apple one": "MONTHLY", icloud: "MONTHLY",
  openai: "MONTHLY", anthropic: "MONTHLY", linear: "MONTHLY",
  intercom: "MONTHLY", zendesk: "MONTHLY", freshdesk: "MONTHLY",
  canva: "MONTHLY", loom: "MONTHLY", miro: "MONTHLY",
  "1password": "MONTHLY", lastpass: "MONTHLY",
};

function knownVendorMatch(supplierName: string): "MONTHLY" | "ANNUAL" | "QUARTERLY" | null {
  const lower = supplierName.toLowerCase();
  for (const [vendor, interval] of Object.entries(KNOWN_SUBSCRIPTIONS)) {
    if (lower.includes(vendor)) return interval;
  }
  return null;
}

export async function detectSubscription(
  supplierName: string,
  description: string | null,
  totalSek: number | null,
  subject?: string
): Promise<SubscriptionDetectionResult> {
  // Fast path — known vendor
  const knownInterval = knownVendorMatch(supplierName);
  if (knownInterval) {
    return { isSubscription: true, interval: knownInterval, confidence: "high" };
  }

  // AI classification for unknown vendors
  if (!process.env.ANTHROPIC_API_KEY) {
    return { isSubscription: false, interval: null, confidence: "low" };
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Analysera denna faktura och avgör om det är en prenumeration/abonnemang.

Leverantör: ${supplierName}
Belopp: ${totalSek ?? "okänt"} SEK
Beskrivning: ${description ?? "—"}
Ämne: ${subject ?? "—"}

Svara BARA med JSON på en rad:
{"isSubscription": true/false, "interval": "MONTHLY"/"ANNUAL"/"QUARTERLY"/"WEEKLY"/null}

Sätt isSubscription=true om det är ett återkommande abonnemang, SaaS, streaming, molntjänst eller liknande.`,
      },
    ],
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim()) as { isSubscription: boolean; interval: string | null };
    return {
      isSubscription: parsed.isSubscription,
      interval: (parsed.interval as SubscriptionDetectionResult["interval"]) ?? null,
      confidence: "high",
    };
  } catch {
    return { isSubscription: false, interval: null, confidence: "low" };
  }
}
