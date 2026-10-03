This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## AI voucher drafting

The editor can turn pasted booking confirmations into an editable voucher draft with Gemini Flash. Add the API key to `.env.local` (never expose it with a `NEXT_PUBLIC_` prefix):

```bash
GEMINI_API_KEY=your_api_key
# Optional; defaults to the stable Gemini Flash model below
GEMINI_MODEL=gemini-3.8-flash
# Optional failover used when the preferred model is busy or rate-limited
GEMINI_FALLBACK_MODEL=gemini-3.6-flash
```

Restart the development server after changing environment variables. The source text is sent to the Gemini Interactions API with storage disabled, and payment details are explicitly excluded from the generated voucher copy. If the preferred Flash model is temporarily busy or rate-limited, the server automatically retries with another Gemini Flash model.

Install the Chromium build used for server-side PDF generation once after installing dependencies:

```bash
npm run browser:install
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## PDF deployment

Voucher PDFs are rendered by Playwright and Chromium on the server. Vercel, Netlify, and AWS Lambda use the bundled `@sparticuz/chromium` runtime. The included `Dockerfile` uses the matching Playwright image. For local development outside Docker, install Chromium with `npm run browser:install`.
"# gift-vocuher" 
