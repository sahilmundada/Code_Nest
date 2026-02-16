# Code Nest

Code Nest is a Next.js learning platform focused on coding education, guided roadmaps, AI-assisted learning, and quest-based coding practice.

The app source lives in `Code/`.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Clerk authentication
- MongoDB + Mongoose
- Groq SDK (AI features)
- YouTube Data API (learning content)
- Vercel Analytics + Speed Insights

## Features

- Landing page and learner dashboard
- Learning videos and topic-based learning pages
- Roadmaps generated with AI + YouTube resources
- Quests/challenges with attempt tracking and result pages
- AI code review and quest support actions
- Admin area for quest management

## Project Structure

- `Code/app/` Next.js routes, pages, and API routes
- `Code/components/` shared UI components
- `Code/lib/actions/` server actions and AI logic
- `Code/lib/models/` Mongoose models
- `Code/lib/mongodb/` MongoDB connection helper

## Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- npm
- MongoDB database
- Clerk app credentials
- Groq API key
- YouTube Data API key

## Setup

1. Install dependencies:

```bash
cd Code
npm install
```

2. Create `Code/.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
WEBHOOK_SECRET=

# Database
MONGODB_URI=

# APIs
GROQ_API_KEY=
NEXT_PUBLIC_YOUTUBE_API_KEY=
```

3. Start development server:

```bash
cd Code
npm run dev
```

4. Open `http://localhost:3000`.

## Available Scripts

Run these from `Code/`:

- `npm run dev` Start dev server
- `npm run build` Build for production
- `npm run start` Start production server
- `npm run lint` Run linting

## Webhooks

Clerk webhook endpoint:

- `POST /api/webhooks/clerk`

Set the Clerk webhook signing secret in `WEBHOOK_SECRET`.

## Admin Authentication (Current Implementation)

Admin credentials are currently hardcoded in:

- `Code/app/api/admin/auth/route.js`
- `Code/middleware.js`

Current values:

- username: `admin`
- password: `admin123`

For production, replace this with env-based credentials or role-based auth.

## Notes

- Root contains a minimal `package-lock.json`, but the runnable app is under `Code/`.
- MongoDB connects using database name `Inherit` (see `Code/lib/mongodb/mongoose.js`).
