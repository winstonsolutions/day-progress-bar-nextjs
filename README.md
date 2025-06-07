# Day Progress Bar - Next.js Application

This is the web application for the Day Progress Bar Chrome extension, built with Next.js and Clerk authentication.

## Features

- User authentication with Clerk
- Dashboard for extension users
- Seamless integration with the Chrome extension

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Clerk account for authentication

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/day-progress-bar-nextjs.git
cd day-progress-bar-nextjs
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with the following variables:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Optional: For production
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Flow

The authentication flow for the Day Progress Bar system works as follows:

1. User clicks "Login" in the Chrome extension
2. User is redirected to the Next.js application sign-in page
3. After successful authentication with Clerk, user lands on the dashboard
4. The dashboard page sends authentication data back to the extension via postMessage or direct Chrome messaging

## Deployment

This application can be deployed to Vercel with minimal configuration:

```bash
npm run build
# or
yarn build
```

## Integration with Chrome Extension

The dashboard automatically sends authentication data to the Chrome extension when a user successfully logs in. The extension ID can be passed as a query parameter for direct communication.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
