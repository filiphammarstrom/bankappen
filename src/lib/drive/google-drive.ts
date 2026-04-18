/**
 * Google Drive REST API client using service account credentials.
 *
 * Prerequisites:
 *  1. Enable Google Drive API on your GCP project.
 *  2. Share a Drive folder with the service account email found in GOOGLE_CLOUD_CREDENTIALS.
 *  3. Set GOOGLE_DRIVE_FOLDER_ID to that folder's ID.
 */

async function getDriveAccessToken(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (!credentialsJson) throw new Error("GOOGLE_CLOUD_CREDENTIALS saknas");

  const credentials = JSON.parse(credentialsJson) as {
    client_email: string;
    private_key: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(credentials.private_key, "base64url");
  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Kunde inte hämta Google Drive access token");
  return data.access_token;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Upload a file to Google Drive. Returns the file ID and a web view link.
 * Falls back gracefully if GOOGLE_DRIVE_FOLDER_ID or credentials are missing.
 */
export async function uploadFileToDrive(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<DriveUploadResult | null> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId || !process.env.GOOGLE_CLOUD_CREDENTIALS) {
    console.warn("Google Drive ej konfigurerat (GOOGLE_DRIVE_FOLDER_ID eller GOOGLE_CLOUD_CREDENTIALS saknas)");
    return null;
  }

  try {
    const token = await getDriveAccessToken();

    const metadata = JSON.stringify({
      name: filename,
      parents: [folderId],
    });

    const boundary = "boundary_bankappen_drive";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
      ),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": String(body.length),
        },
        body,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive upload misslyckades: ${err}`);
    }

    const data = await res.json() as { id?: string; webViewLink?: string };
    if (!data.id) throw new Error("Drive returnerade inget fil-ID");

    return {
      fileId: data.id,
      webViewLink: data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`,
    };
  } catch (err) {
    console.error("Google Drive upload error:", err instanceof Error ? err.message : err);
    return null;
  }
}
