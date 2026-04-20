export const dynamic = "force-dynamic";

import dynamic from "next/dynamic";

const BankImportClient = dynamic(
  () => import("@/components/bank/BankImportClient"),
  { ssr: false }
);

export default function BankImportPage() {
  return <BankImportClient />;
}
