export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";

const BankImportClient = dynamicImport(
  () => import("@/components/bank/BankImportClient"),
  { ssr: false }
);

export default function BankImportPage() {
  return <BankImportClient />;
}
