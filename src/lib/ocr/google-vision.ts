import type { OcrData } from "@/types/expense";

/**
 * Extract text and structured data from a receipt/invoice image using Google Cloud Vision API.
 * Requires GOOGLE_CLOUD_CREDENTIALS env var (JSON service account) or GOOGLE_CLOUD_VISION_API_KEY.
 */
export async function extractReceiptData(imageBuffer: Buffer, mimeType: string): Promise<OcrData> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;

  if (!apiKey && !credentialsJson) {
    console.warn("Google Cloud Vision not configured - returning empty OCR data");
    return { rawText: "", confidence: 0 };
  }

  const base64Image = imageBuffer.toString("base64");

  let authHeader: string;

  if (apiKey) {
    // Simple API key approach
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [
              { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      responses?: {
        fullTextAnnotation?: { text?: string };
        error?: { message?: string };
      }[];
    };

    const fullText = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
    return parseOcrText(fullText);
  } else if (credentialsJson) {
    // Service account approach - get bearer token
    // In production, use google-auth-library or @google-cloud/vision
    // For MVP, using the REST API with service account JWT
    const credentials = JSON.parse(credentialsJson) as {
      client_email: string;
      private_key: string;
    };

    const token = await getGoogleAccessToken(credentials.client_email, credentials.private_key);

    const response = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      responses?: { fullTextAnnotation?: { text?: string } }[];
    };

    const fullText = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
    return parseOcrText(fullText);
  }

  return { rawText: "", confidence: 0 };
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  // Build JWT for Google OAuth2 service account
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-vision",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json() as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Kunde inte hämta Google access token");
  }
  return data.access_token;
}

function parseOcrText(text: string): OcrData {
  const result: OcrData = {
    rawText: text,
    confidence: 0.8,
  };

  if (!text) return result;

  // Extract supplier name (usually first line)
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length > 0) {
    result.supplierName = lines[0].trim();
  }

  // Extract invoice number
  const invoiceMatch = text.match(/(?:faktura(?:nummer)?|invoice(?:\s+no)?|nr|no)[.:\s]*([A-Z0-9-]{3,20})/i);
  if (invoiceMatch) {
    result.invoiceNumber = invoiceMatch[1].trim();
  }

  // Extract dates
  const isoDateMatch = text.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoDateMatch) {
    result.issueDate = isoDateMatch[0];
    if (isoDateMatch.length > 1) result.dueDate = isoDateMatch[1];
  }

  // Extract total amount
  const totalMatch = text.match(
    /(?:totalt?|att\s+betala|total\s+amount|summa\s+att\s+betala)[\s:]*([0-9\s]+[,.]?[0-9]*)\s*(?:kr|SEK)/i
  );
  if (totalMatch) {
    const cleaned = totalMatch[1].replace(/\s/g, "").replace(",", ".");
    result.totalAmount = parseFloat(cleaned);
    result.currency = "SEK";
  }

  // Extract VAT
  const vatMatch = text.match(
    /(?:moms|vat|mervärdesskatt)[\s:]*([0-9\s]+[,.]?[0-9]*)\s*(?:kr|SEK|%)?/i
  );
  if (vatMatch) {
    const cleaned = vatMatch[1].replace(/\s/g, "").replace(",", ".");
    const val = parseFloat(cleaned);
    if (val < 100) {
      // Looks like a percentage
    } else {
      result.vatAmount = val;
    }
  }

  return result;
}
