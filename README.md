This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and enhanced with Netlify Functions for backend operations.

## Getting Started

For local development, start the Netlify dev server:

```bash
npm run dev:netlify
```

This command runs your Next.js app with Netlify Functions locally.

If you prefer the plain Next.js server, you can still use:

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Copy `.env.example` to `.env` and update each value for your environment.

```bash
cp .env.example .env
# then edit .env and provide real values
```

The example file declares the following keys:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:8888
MONGODB_URI=mongodb://...
MONGODB_DB=cv
UPLOAD_SECRET_KEY=your-secret
```

## Static Asset Caching

`netlify.toml` configures cache headers so that files under `/_next/static/*` and
`/public/*` are served with a long `Cache-Control` policy. This allows browsers
to cache these assets for up to one year.
## Page and API Caching

Pages export `revalidate = 60` so Next.js serves cached HTML for a minute. Netlify function responses also include `Cache-Control: public, max-age=60`, enabling browser caching and back/forward cache support.


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
