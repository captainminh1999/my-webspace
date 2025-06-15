This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and enhanced with Netlify Functions for backend operations.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then run the development server:

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

## Local Development with Netlify

Serverless functions live in the `netlify/functions` directory. When developing locally you need the Netlify CLI so these functions are served on port `8888`.

Install the CLI if you have not already:

```bash
npm install -g netlify-cli
```

Then run the project with the required environment variables. The important variables are:

- `NEXT_PUBLIC_BASE_URL` – base URL that the frontend uses to call the functions. In development this should be `http://localhost:8888`.
- `MONGODB_URI` – connection string for your MongoDB database.
- `MONGODB_DB` – name of the database (defaults to `cv`).
- Other optional variables like `NETLIFY_API_PAT` and `UPLOAD_SECRET_KEY` are required if you plan to use those particular functions.

Example development command:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:8888 \
MONGODB_URI=mongodb://localhost:27017 \
MONGODB_DB=cv \
netlify dev
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
