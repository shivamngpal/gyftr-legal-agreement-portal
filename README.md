# GyFTR Legal Portal

A full-stack legal agreement management portal enabling multi-team review, clause-level analysis, digital sign-off, and workflow tracking across Legal, Finance, Business, and Compliance teams.

## Features

- **Agreement Tracking** — Centralized dashboard with search, filtering by status/type/team, and CSV export
- **Multi-Team Review Workflow** — Independent review circles for Legal, Finance, Business, and Compliance with enforced status transitions (`PENDING → UNDER_REVIEW → APPROVED/REJECTED`)
- **Draft Management** — Versioned PDF uploads to AWS S3; uploading a new draft resets status and clears prior sign-offs
- **AI Clause Extraction** — GPT-4.1-mini extracts top-level clauses with identifiers, titles, and full text from uploaded PDFs
- **Clause-Level Analysis** — Per-clause outcomes (ACCEPTED / HELD / PARTIAL / PENDING) with comments and a cross-version matrix view
- **Digital Sign-Off** — Legal and Business can sign off once their team's review status is APPROVED; sign-offs are tracked with timestamps
- **Reminder System** — Legal can send reminders to one or more teams simultaneously with an optional message
- **Remarks & History Log** — Threaded remarks per draft and a full immutable audit trail of all status changes, uploads, and actions
- **Role-Based Access Control** — JWT authentication with four roles; each team sees only actions relevant to their role

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Express.js 5, TypeScript, Zod validation |
| ORM | Prisma v7 |
| Database | PostgreSQL (Neon serverless) |
| File Storage | AWS S3 with presigned URLs |
| AI | OpenAI GPT-4.1-mini |
| Auth | JWT (RS256, 1-day expiry) |
| Deployment | Frontend → Vercel, Backend → Render |

## Project Structure

```
gyftr-legal-portal/
├── frontend/                  # Next.js app
│   └── app/
│       ├── dashboard/         # Agreement list + create modal
│       ├── agreements/[id]/   # Agreement detail + draft upload
│       └── agreements/[id]/drafts/[draftId]/  # Draft workspace (PDF, clauses, review)
└── backend/                   # Express API
    ├── src/
    │   ├── controllers/       # Request validation + service calls
    │   ├── services/          # Business logic (agreement, draft, ai, s3, signoff, reminder)
    │   ├── routes/            # Route definitions
    │   ├── middleware/        # JWT auth guard
    │   └── config/            # env, db
    └── prisma/
        └── schema.prisma      # Single source of truth for DB schema
```

## Agreement Status Flow

```
DRAFT → IN_REVIEW → PENDING_SIGNATURE → PARTIALLY_SIGNED → EXECUTED
                 ↑ (any rejection loops back here)
```

A new draft upload always resets the agreement to `DRAFT`.

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon recommended)
- AWS S3 bucket
- OpenAI API key

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=1d
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
OPENAI_API_KEY=sk-...
```

Push the schema and generate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```

Seed demo users:

```bash
npm run seed
# or: npx ts-node prisma/seed.ts
```

Start the dev server:

```bash
npm run dev   # ts-node src/index.ts — listens on :5000
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev   # listens on :3000
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Authenticate, returns JWT |
| GET | `/api/users` | List all users (for SPOC dropdowns) |
| GET | `/api/agreements` | List agreements with optional filters |
| POST | `/api/agreements` | Create agreement |
| GET | `/api/agreements/:id` | Get agreement with signed draft URLs |
| POST | `/api/agreements/:id/drafts` | Upload new PDF draft |
| PUT | `/api/agreements/:id/review-status` | Update team review status |
| GET | `/api/agreements/:id/clauses` | Get clauses for latest draft |
| PUT | `/api/agreements/:id/clauses` | Batch update clause outcomes |
| POST | `/api/agreements/:id/signoff` | Record a sign-off |
| GET | `/api/agreements/:id/remarks` | Get remarks |
| POST | `/api/agreements/:id/remarks` | Add a remark |
| GET | `/api/agreements/:id/history` | Get history log |
| POST | `/api/reminders` | Send reminder(s) to one or more teams |
| GET | `/api/reminders` | Get unread reminders for current user |
| PATCH | `/api/reminders/:id/read` | Mark reminder as read |
| GET | `/api/dashboard/stats` | Bottleneck and summary stats |

## Database Schema (key models)

- **User** — `id, email, name, role (LEGAL/FINANCE/BUSINESS/COMPLIANCE)`
- **Agreement** — `clientName, type, status, startDate, spoc refs`
- **Draft** — `version, fileUrl (S3 key), agreementId`
- **Clause** — `identifier, title, text, outcome, comments, draftId`
- **ReviewStatus** — `team, status (PENDING/UNDER_REVIEW/APPROVED/REJECTED), draftId` — one per team per draft
- **SignOff** — `signatoryId, agreementId, timestamp` — unique per signatory per agreement
- **Reminder** — `targetTeam, message, read, senderId, agreementId`
- **Remark** — `message, authorId, agreementId, draftId?`
- **HistoryLog** — `action, details, actorId, agreementId, draftId?, timestamp`

> **Schema changes**: always run `npx prisma db push && npx prisma generate` — `db push` syncs the database but does **not** regenerate the client.
