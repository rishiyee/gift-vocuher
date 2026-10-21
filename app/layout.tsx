import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gift Voucher Studio",
  description: "Create, edit, and share guest gift vouchers.",
  appleWebApp: { capable: true, title: "Gift Voucher", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090d0b" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full min-w-80 flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">{children}</body>
    </html>
  );
}
