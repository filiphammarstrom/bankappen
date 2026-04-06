import { type InvoiceStatus, INVOICE_STATUS_LABELS } from "@/types/invoice";
import { cn } from "@/lib/utils";

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CREDITED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        statusColors[status]
      )}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
