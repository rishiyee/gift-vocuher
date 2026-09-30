import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/voucher/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/playwright-core/browsers.json",
    ],
  },
};

export default nextConfig;
