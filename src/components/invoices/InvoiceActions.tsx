"use client";

import { useState } from "react";
import { Download, Send, CheckCircle } from "lucide-react";
import type { InvoiceStatus } from "@/types/invoice";
import { PaymentModal } from "./PaymentModal";

interface InvoiceActionsProps {
  invoice: {
    id: string;
    status: InvoiceStatus;
    invoiceNumber: string;
    totalSek: number;
    paidAmountSek: number;
    customer: { email: string };
  };
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  async function downloadPdf() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faktura-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Kunde inte generera PDF");
    } finally {
      setLoading(false);
    }
  }

  async function sendInvoice() {
    if (!invoice.customer.email) {
      setMessage("Kunden saknar e-postadress");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      const data = await res.json() as { error?: string; message?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Kunde inte skicka faktura");
      } else {
        setMessage("Faktura skickad!");
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch {
      setMessage("Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }

  const canPay =
    invoice.status === "SENT" ||
    invoice.status === "PARTIALLY_PAID" ||
    invoice.status === "OVERDUE";

  return (
    <>
      {showPaymentModal && (
        <PaymentModal
          invoice={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalSek: invoice.totalSek,
            paidAmountSek: invoice.paidAmountSek,
          }}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            window.location.reload();
          }}
        />
      )}

      <div className="flex items-center gap-2">
        {message && <span className="text-sm text-gray-600">{message}</span>}

        <button
          onClick={downloadPdf}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <Download size={14} />
          PDF
        </button>

        {invoice.status === "DRAFT" && (
          <button
            onClick={sendInvoice}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={14} />
            Skicka
          </button>
        )}

        {canPay && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <CheckCircle size={14} />
            Registrera betalning
          </button>
        )}
      </div>
    </>
  );
}
