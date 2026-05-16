# Grantly Frontend

The Next.js frontend for **Grantly**, a community grant application portal for Australian organisations.

This app has two main surfaces in one Next.js project: `/apply` (the applicant portal) and `/admin` (the admin dashboard). Public grant browsing lives at `/grants` and `/grants/[id]` and works without an account.

## Tech Stack

- **Next.js 16** (App Router, TypeScript strict mode)
- **Tailwind CSS 4** for styling
- **Preline UI** for Tailwind-based components (used as copy-paste markup, not as a React component library)
- **Supabase** for auth (JWT)
- **Laravel API** at `/api/v1` for everything else (data, file uploads, AI chat)
- **lucide-react** for icons

## Commands

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build
npm run start
npm run lint
```

## Environment

Create a `.env.local` file in this directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

This is the only required env var. The frontend talks to the Laravel backend at this URL.

## Auth Model

- Supabase handles login, registration, and email verification.
- On successful login, the frontend stores two keys in `localStorage`:
  - `grantly_token`, the JWT, attached as `Bearer` on every authenticated API request.
  - `grantly_user`, JSON-stringified `{ id, email, full_name, role }`.
- The `role` field decides which dashboard to redirect to (`admin` or `applicant`).
- `/admin/*` routes redirect to `/apply` if `role !== 'admin'`.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing page |
| `/login` | public | Login form |
| `/register` | public | Sign-up form |
| `/auth/confirm` | public | Email verification callback |
| `/grants` | public | Browse open grant rounds |
| `/grants/[id]` | public | Grant round detail page (with Apply CTA) |
| `/apply/[id]` | applicant | Fill out and submit an application |
| `/dashboard` | applicant | View own applications and statuses |
| `/profile` | any | Edit own profile |
| `/admin` | admin | Admin landing with queue stats |
| `/admin/applications` | admin | List + filter all applications |
| `/admin/applications/[id]` | admin | Review a single application, change status, leave notes |
| `/admin/grant-rounds` | admin | List all grant rounds |
| `/admin/grant-rounds/new` | admin | Create a new round |
| `/admin/grant-rounds/[id]/edit` | admin | Edit an existing round |

## Grantly Assistant (AI Chatbot)

Every authenticated page has a floating "Ask Grantly Assistant" button in the bottom-right corner. The component lives at `app/components/Chatbot.tsx` and is configured by a single `contextType` prop. It streams responses from the Laravel `/api/v1/ai/chat` endpoint, which proxies to OpenRouter under the hood.

Each surface uses its own context so the bot's answers are grounded in real DB data:

| Page | Context |
|---|---|
| `/apply/[id]` | `apply` (round + the user's draft) |
| `/grants` | `browse` (list of open rounds) |
| `/grants/[id]` | `browse` (that specific round) |
| `/dashboard` | `dashboard` (the user's own applications) |
| `/admin`, `/admin/applications` | `admin_overview` (queue stats) |
| `/admin/applications/[id]` | `admin_review` (full application + applicant) |
| `/admin/grant-rounds/new` and `[id]/edit` | `admin_round_compose` (round copy helper) |

The bot self-hides for logged-out users (no JWT means no launcher button).

## File Structure

```
frontend/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (fonts, providers, Preline script)
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Tailwind base + global styles
│   ├── favicon.ico
│   │
│   ├── components/                   # Shared UI components used across pages
│   │   ├── ApplicantNav.tsx          # Nav for logged-in applicants
│   │   ├── PublicNav.tsx             # Nav for anonymous visitors
│   │   ├── Footer.tsx
│   │   ├── FormRenderer.tsx          # Renders dynamic form fields from a schema
│   │   └── Chatbot.tsx               # Grantly Assistant, floating chatbot
│   │
│   ├── login/                        # /login
│   │   └── page.tsx
│   ├── register/                     # /register
│   │   └── page.tsx
│   ├── auth/
│   │   └── confirm/                  # /auth/confirm, Supabase email verification callback
│   │       └── page.tsx
│   │
│   ├── grants/                       # Public browse pages
│   │   ├── page.tsx                  # /grants, list of open rounds
│   │   └── [id]/
│   │       └── page.tsx              # /grants/[id], round detail + Apply CTA
│   │
│   ├── apply/                        # Applicant portal
│   │   └── [id]/
│   │       └── page.tsx              # /apply/[id], fill/submit application
│   │
│   ├── dashboard/                    # /dashboard, applicant's applications
│   │   └── page.tsx
│   │
│   ├── profile/                      # /profile, edit own profile
│   │   └── page.tsx
│   │
│   └── admin/                        # Admin dashboard
│       ├── layout.tsx                # Admin shell + role-guard redirect
│       ├── page.tsx                  # /admin, landing with queue stats
│       ├── applications/
│       │   ├── page.tsx              # /admin/applications, list + filters
│       │   └── [id]/
│       │       └── page.tsx          # /admin/applications/[id], review one app
│       └── grant-rounds/
│           ├── page.tsx              # /admin/grant-rounds, list all rounds
│           ├── new/
│           │   └── page.tsx          # /admin/grant-rounds/new
│           └── [id]/
│               └── edit/
│                   └── page.tsx      # /admin/grant-rounds/[id]/edit
│
├── components/                       # Admin-specific composite components
│   └── admin/
│       └── FormSchemaBuilder.tsx     # UI for building dynamic application form schemas
│
├── contexts/                         # React context providers
│   └── ToastContext.tsx              # App-wide toast notifications
│
├── email-templates/                  # HTML templates for Supabase auth emails
├── public/                           # Static assets served at /
│
├── CLAUDE.md                         # Frontend-specific guidance for AI coding tools
├── README.md                         # You are here
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
└── next-env.d.ts
```

## Conventions

- **Navigation:** Use Next.js `<Link>` from `next/link` for all internal routes. Plain `<a href="/...">` causes full-page reloads and breaks the router cache.
- **Images:** Use `<Image>` from `next/image`. The only exception is `URL.createObjectURL()` blob previews where Next's optimisation doesn't apply.
- **Component style:** Default to server components; add `"use client"` only when you need state, hooks, or browser APIs (most of our interactive pages are client components).
- **Comments:** Comment at a high level. Explain the *why* of non-obvious patterns. Don't comment things that are clear from the code.
- **Writing style:** No em dashes anywhere (comments, copy, commits). Use commas, colons, or parentheses instead.

For more detail, see `CLAUDE.md` in this directory and the root `CLAUDE.md`.
