This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Testing the Build github action.

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

## Environment Variables

This Next.js application uses environment variables for configuration. Create a `.env.local` file in the root directory with the following variables:

```
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Authentication
NEXT_PUBLIC_AUTH_ENABLED=true

# Feature Flags
NEXT_PUBLIC_FEATURE_ANALYTICS=true

# External Services
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

A `.env.example` file is provided as a template. Copy it to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
# Edit the .env.local file with your actual values
```

### Environment Variables in Next.js

Next.js has built-in support for environment variables:

- `.env.local`: Local environment variables, not committed to git
- `.env.development`: Development environment variables
- `.env.production`: Production environment variables
- `.env`: Default environment variables

Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

### Using Environment Variables

Environment variables can be accessed in your code using the utilities in `app/lib/env.ts`:

```tsx
import { API_URL, FEATURE_FLAGS } from '../lib/env';

// Use API_URL in fetch calls
fetch(`${API_URL}/endpoint`);

// Conditionally render based on feature flags
{FEATURE_FLAGS.analytics && <AnalyticsComponent />}
```
