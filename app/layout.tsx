import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gift Voucher Canvas",
  description: "Two-page gift voucher design canvas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full min-w-80 flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">{children}</body>
    </html>
  );
}
