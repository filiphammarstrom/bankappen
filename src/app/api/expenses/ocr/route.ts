export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompany } from "@/lib/company-context";
import { extractReceiptData } from "@/lib/ocr/google-vision";
import { uploadFileToDrive } from "@/lib/drive/google-drive";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const company = await getActiveCompany(session.user.id);
  if (!company) return NextResponse.json({ error: "Inget aktivt företag" }, { status: 400 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ogiltig multipart-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Ingen fil bifogad" }, { status: 400 });
  }

  const mimeType = file.type || "image/jpeg";
  const filename = (file as File).name ?? `kvitto-${Date.now()}.jpg`;

  if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
    return NextResponse.json({ error: "Endast bilder och PDF stöds" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Filen är för stor (max 10 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Run OCR
  let ocrData = {};
  let supplierName: string | null = null;
  let invoiceNumber: string | null = null;
  let issueDate: Date | null = null;
  let dueDate: Date | null = null;
  let totalSek: number | null = null;
  let vatAmountSek: number | null = null;

  try {
    const ocr = await extractReceiptData(buffer, mimeType);
    ocrData = ocr;
    supplierName = ocr.supplierName ?? null;
    invoiceNumber = ocr.invoiceNumber ?? null;
    issueDate = ocr.issueDate ? new Date(ocr.issueDate) : null;
    dueDate = ocr.dueDate ? new Date(ocr.dueDate) : null;
    totalSek = ocr.totalAmount ?? null;
    vatAmountSek = ocr.vatAmount ?? null;
  } catch (err) {
    console.warn("OCR misslyckades:", err instanceof Error ? err.message : err);
    // Continue without OCR data — user can fill in manually
  }

  // Upload to Google Drive
  let driveFileId: string | null = null;
  let driveUrl: string | null = null;
  try {
    const driveResult = await uploadFileToDrive(filename, mimeType, buffer);
    if (driveResult) {
      driveFileId = driveResult.fileId;
      driveUrl = driveResult.webViewLink;
    }
  } catch (err) {
    console.warn("Drive-uppladdning misslyckades:", err instanceof Error ? err.message : err);
  }

  const expense = await prisma.expense.create({
    data: {
      companyId: company.id,
      source: "PHOTO_OCR",
      status: "PENDING_REVIEW",
      rawImageUrl: driveUrl,
      ocrData,
      supplierName,
      invoiceNumber,
      issueDate,
      dueDate,
      totalSek,
      vatAmountSek,
      driveFileId,
      driveUrl,
    },
  });

  return NextResponse.json({ expense: { id: expense.id } }, { status: 201 });
}
