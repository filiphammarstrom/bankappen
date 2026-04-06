import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveCompany } from "@/lib/company-context";
import { ReceiptUploader } from "@/components/expenses/ReceiptUploader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ExpenseUploadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getActiveCompany(session.user.id);
  if (!company) redirect("/companies/new");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/expenses" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ladda upp kvitto</h1>
          <p className="text-gray-500">OCR-tolkning via Google Cloud Vision</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ReceiptUploader />
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Hur det fungerar</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Ladda upp ett foto av ditt kvitto eller en PDF-faktura</li>
          <li>OCR-systemet läser av leverantör, belopp och moms automatiskt</li>
          <li>Granska och godkänn uppgifterna</li>
          <li>Bokföring skapas automatiskt</li>
        </ol>
      </div>
    </div>
  );
}
