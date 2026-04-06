import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { InvoiceWithLines } from "@/types/invoice";

// Register a standard font
Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1d4ed8",
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "right",
    color: "#1d4ed8",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    textAlign: "right",
    color: "#6b7280",
  },
  addressBlock: {
    marginBottom: 2,
    lineHeight: 1.4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 20,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: "6 8",
    borderRadius: 2,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#4b5563",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: "5 8",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "5 8",
    backgroundColor: "#fafafa",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  col_desc: { flex: 3 },
  col_qty: { width: 50, textAlign: "right" },
  col_unit: { width: 40, textAlign: "center" },
  col_price: { width: 70, textAlign: "right" },
  col_vat: { width: 50, textAlign: "right" },
  col_total: { width: 80, textAlign: "right" },
  totalsSection: {
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 20,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
    width: 250,
  },
  totalsLabel: {
    flex: 1,
    textAlign: "right",
    paddingRight: 10,
    color: "#6b7280",
  },
  totalsValue: {
    width: 100,
    textAlign: "right",
  },
  totalRowBold: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: "#1d4ed8",
    width: 250,
  },
  totalLabelBold: {
    flex: 1,
    textAlign: "right",
    paddingRight: 10,
    fontWeight: "bold",
    fontSize: 11,
    color: "#1d4ed8",
  },
  totalValueBold: {
    width: 100,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 11,
    color: "#1d4ed8",
  },
  vatBreakdown: {
    marginBottom: 20,
  },
  vatBreakdownTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 4,
  },
  vatBreakdownRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  vatBreakdownLabel: {
    width: 120,
    fontSize: 9,
    color: "#6b7280",
  },
  vatBreakdownValue: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerBlock: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 9,
  },
  notes: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 2,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.4,
  },
  fTaxBadge: {
    marginTop: 6,
    padding: "3 6",
    backgroundColor: "#dbeafe",
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  fTaxText: {
    fontSize: 8,
    color: "#1d4ed8",
    fontWeight: "bold",
  },
});

function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " kr";
}

function formatDate(date: Date | string): string {
  return format(new Date(date), "yyyy-MM-dd", { locale: sv });
}

interface InvoicePdfProps {
  invoice: InvoiceWithLines;
  company: {
    name: string;
    orgNumber: string;
    vatNumber?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    email?: string | null;
    phone?: string | null;
    bankgiro?: string | null;
    plusgiro?: string | null;
    fTaxCertificate: boolean;
  };
}

export function InvoicePdf({ invoice, company }: InvoicePdfProps) {
  // Group VAT by rate
  const vatByRate = new Map<number, { base: number; vat: number }>();
  for (const line of invoice.lines) {
    const rate = typeof line.vatRate === "number" ? line.vatRate : Number(line.vatRate);
    const lineTotal = typeof line.lineTotal === "number" ? line.lineTotal : Number(line.lineTotal);
    const vatAmount = typeof line.vatAmount === "number" ? line.vatAmount : Number(line.vatAmount);
    const exVat = lineTotal - vatAmount;
    const existing = vatByRate.get(rate) ?? { base: 0, vat: 0 };
    vatByRate.set(rate, {
      base: existing.base + exVat,
      vat: existing.vat + vatAmount,
    });
  }

  const subtotal = typeof invoice.subtotalSek === "number" ? invoice.subtotalSek : Number(invoice.subtotalSek);
  const vatTotal = typeof invoice.vatAmountSek === "number" ? invoice.vatAmountSek : Number(invoice.vatAmountSek);
  const total = typeof invoice.totalSek === "number" ? invoice.totalSek : Number(invoice.totalSek);

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.companyName }, company.name),
          company.address && React.createElement(Text, { style: styles.addressBlock }, company.address),
          (company.postalCode || company.city) && React.createElement(
            Text,
            { style: styles.addressBlock },
            [company.postalCode, company.city].filter(Boolean).join(" ")
          ),
          company.email && React.createElement(Text, { style: styles.addressBlock }, company.email),
          company.phone && React.createElement(Text, { style: styles.addressBlock }, company.phone)
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.invoiceTitle }, "FAKTURA"),
          React.createElement(Text, { style: styles.invoiceNumber }, `Nr: ${invoice.invoiceNumber}`)
        )
      ),
      // Info row - dates and customer
      React.createElement(
        View,
        { style: styles.infoRow },
        React.createElement(
          View,
          { style: styles.infoBlock },
          React.createElement(Text, { style: styles.sectionTitle }, "Kund"),
          React.createElement(Text, null, invoice.customer.name),
          invoice.customer.address && React.createElement(Text, null, invoice.customer.address),
          (invoice.customer.postalCode || invoice.customer.city) &&
            React.createElement(
              Text,
              null,
              [invoice.customer.postalCode, invoice.customer.city].filter(Boolean).join(" ")
            ),
          invoice.customer.vatNumber && React.createElement(Text, null, `VAT: ${invoice.customer.vatNumber}`),
          invoice.customer.orgNumber && React.createElement(Text, null, `Org nr: ${invoice.customer.orgNumber}`)
        ),
        React.createElement(
          View,
          { style: styles.infoBlock },
          React.createElement(Text, { style: styles.infoLabel }, "Fakturadatum"),
          React.createElement(Text, { style: styles.infoValue }, formatDate(invoice.issueDate)),
          React.createElement(View, { style: { height: 8 } }),
          React.createElement(Text, { style: styles.infoLabel }, "Förfallodatum"),
          React.createElement(Text, { style: styles.infoValue }, formatDate(invoice.dueDate)),
          invoice.deliveryDate &&
            React.createElement(
              View,
              null,
              React.createElement(View, { style: { height: 8 } }),
              React.createElement(Text, { style: styles.infoLabel }, "Leveransdatum"),
              React.createElement(Text, { style: styles.infoValue }, formatDate(invoice.deliveryDate))
            )
        ),
        React.createElement(
          View,
          { style: styles.infoBlock },
          invoice.ourReference &&
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: styles.infoLabel }, "Vår referens"),
              React.createElement(Text, { style: styles.infoValue }, invoice.ourReference),
              React.createElement(View, { style: { height: 8 } })
            ),
          invoice.yourReference &&
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: styles.infoLabel }, "Er referens"),
              React.createElement(Text, { style: styles.infoValue }, invoice.yourReference)
            ),
          React.createElement(View, { style: { height: 8 } }),
          React.createElement(Text, { style: styles.infoLabel }, "Valuta"),
          React.createElement(Text, { style: styles.infoValue }, invoice.currency)
        )
      ),
      // Table header
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col_desc] }, "Beskrivning"),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col_qty] }, "Antal"),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col_unit] }, "Enhet"),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col_price] }, "Á-pris"),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col_vat] }, "Moms %"),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col_total] }, "Belopp")
        ),
        ...invoice.lines.map((line, index) => {
          const qty = typeof line.quantity === "number" ? line.quantity : Number(line.quantity);
          const price = typeof line.unitPrice === "number" ? line.unitPrice : Number(line.unitPrice);
          const rate = typeof line.vatRate === "number" ? line.vatRate : Number(line.vatRate);
          const lineTotal = typeof line.lineTotal === "number" ? line.lineTotal : Number(line.lineTotal);

          return React.createElement(
            View,
            { key: line.id, style: index % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
            React.createElement(Text, { style: styles.col_desc }, line.description),
            React.createElement(
              Text,
              { style: styles.col_qty },
              new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(qty)
            ),
            React.createElement(Text, { style: styles.col_unit }, line.unit ?? "st"),
            React.createElement(
              Text,
              { style: styles.col_price },
              new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(price)
            ),
            React.createElement(Text, { style: styles.col_vat }, `${rate}%`),
            React.createElement(
              Text,
              { style: styles.col_total },
              new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(lineTotal)
            )
          );
        })
      ),
      // Totals
      React.createElement(
        View,
        { style: styles.totalsSection },
        React.createElement(
          View,
          { style: styles.totalsRow },
          React.createElement(Text, { style: styles.totalsLabel }, "Netto (exkl. moms)"),
          React.createElement(Text, { style: styles.totalsValue }, formatSEK(subtotal))
        ),
        // VAT breakdown
        ...Array.from(vatByRate.entries()).map(([rate, { vat }]) =>
          React.createElement(
            View,
            { key: rate, style: styles.totalsRow },
            React.createElement(Text, { style: styles.totalsLabel }, `Moms ${rate}%`),
            React.createElement(Text, { style: styles.totalsValue }, formatSEK(vat))
          )
        ),
        React.createElement(
          View,
          { style: styles.totalRowBold },
          React.createElement(Text, { style: styles.totalLabelBold }, "ATT BETALA"),
          React.createElement(Text, { style: styles.totalValueBold }, formatSEK(total))
        )
      ),
      // Notes
      invoice.notes &&
        React.createElement(
          View,
          { style: styles.notes },
          React.createElement(Text, { style: styles.notesTitle }, "Meddelande"),
          React.createElement(Text, { style: styles.notesText }, invoice.notes)
        ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          View,
          { style: styles.footerBlock },
          React.createElement(Text, { style: styles.footerLabel }, "Org.nr"),
          React.createElement(Text, { style: styles.footerValue }, company.orgNumber),
          company.vatNumber &&
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: [styles.footerLabel, { marginTop: 4 }] }, "VAT-nr"),
              React.createElement(Text, { style: styles.footerValue }, company.vatNumber)
            ),
          company.fTaxCertificate &&
            React.createElement(
              View,
              { style: styles.fTaxBadge },
              React.createElement(Text, { style: styles.fTaxText }, "Innehar F-skattsedel")
            )
        ),
        (company.bankgiro || company.plusgiro) &&
          React.createElement(
            View,
            { style: styles.footerBlock },
            company.bankgiro &&
              React.createElement(
                View,
                null,
                React.createElement(Text, { style: styles.footerLabel }, "Bankgiro"),
                React.createElement(Text, { style: styles.footerValue }, company.bankgiro)
              ),
            company.plusgiro &&
              React.createElement(
                View,
                { style: { marginTop: 4 } },
                React.createElement(Text, { style: styles.footerLabel }, "Plusgiro"),
                React.createElement(Text, { style: styles.footerValue }, company.plusgiro)
              )
          ),
        React.createElement(
          View,
          { style: styles.footerBlock },
          React.createElement(Text, { style: styles.footerLabel }, "OCR / Referens"),
          React.createElement(Text, { style: styles.footerValue }, invoice.invoiceNumber),
          React.createElement(Text, { style: [styles.footerLabel, { marginTop: 4 }] }, "Förfallodatum"),
          React.createElement(Text, { style: styles.footerValue }, formatDate(invoice.dueDate))
        )
      )
    )
  );
}
