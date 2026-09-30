"use client";

import { useSyncExternalStore } from "react";
import { VoucherPages } from "@/components/voucher/voucher-pages";
import type { VoucherContent, VoucherPageIndex } from "@/lib/voucher";

type VoucherPrintData = {
  content: VoucherContent;
  indices: VoucherPageIndex[];
};

declare global {
  interface Window {
    __VOUCHER_PRINT_DATA__?: VoucherPrintData;
  }
}

export function VoucherPrintClient() {
  const data = useSyncExternalStore(
    () => () => undefined,
    () => window.__VOUCHER_PRINT_DATA__ ?? null,
    () => null,
  );

  if (!data) return null;

  return (
    <main className="voucher-studio-layout" data-pdf-ready="true">
      <section className="voucher-print-area" aria-label="Voucher pages">
        <VoucherPages content={data.content} indices={data.indices} />
      </section>
    </main>
  );
}
