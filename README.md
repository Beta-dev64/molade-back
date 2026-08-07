# Molade Backend

Express + Prisma + PostgreSQL + Redis API for the Molade Intelligent Task Management System.

**Status:** end-to-end verified (`npm run smoke` passes against a live server).

## Stack

- **Express** (TypeScript) — `routes → controllers → services`
- **Prisma** + PostgreSQL
- **Redis** — rate limiting (100 req/IP/min), OTP cooldown, response caching
- **Brevo API** — transactional HTML email (`POST /v3/smtp/email`); Nodemailer SMTP/jsonTransport as fallback
- **Socket.IO** — JWT-authenticated real-time notifications (`notification:new` / update / remove)
- **Custom JWT auth** — no Better Auth
- **Cron jobs** — purge unverified users (24h), deadline reminders

## Folder structure

```
src/
  config/           env
  db/               Prisma client
  redis/            client + cache helpers
  responses/        SuccessResponse / ErrorResponse
  middlewares/      auth, rate limit, validate, errors
  mail/templates/   verify, reset, deadline reminder
  modules/          health, auth, users, tasks, priorities,
                    notifications, activity, analytics
  jobs/             purge unverified, deadline reminders
  lib/              jwt, otp, password, priority, serialize
scripts/
  smoke-e2e.ts      full API smoke test
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Quick start

### Prerequisites

- Node 20+
- PostgreSQL (local service **or** Docker)
- Redis (local **or** Docker)

Docker Desktop optional — use when you want isolated Postgres/Redis:

```bash
npm run db:up          # starts postgres:5433 + redis:6379 via docker-compose.yml
```

If using Docker Compose Postgres, set in `.env`:

```env
DATABASE_URL=postgresql://molade:molade@localhost:5433/molade?schema=public
REDIS_URL=redis://127.0.0.1:6379
```

### Install & run

```bash
cp .env.example .env   # then edit secrets / DATABASE_URL
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

- API: http://localhost:4000  
- Health: `GET /api/health`

### Smoke test (with server running)

```bash
npm run smoke
npm run smoke:socket   # JWT Socket.IO + live notification ping
```

Covers: health, login, tasks CRUD, priorities, register + OTP verify, **user isolation / IDOR**, forgot/reset password, real-time notifications.

## Auth flow

| Step | Endpoint |
|------|----------|
| Register | `POST /api/auth/register` |
| Verify email (OTP `XXX-XXX`) | `POST /api/auth/verify-email` |
| Resend OTP | `POST /api/auth/resend-otp` |
| Login | `POST /api/auth/login` |
| Forgot password | `POST /api/auth/forgot-password` |
| Verify reset OTP | `POST /api/auth/verify-reset-otp` |
| Reset password | `POST /api/auth/reset-password` |

- OTP lasts **10 minutes**, max **5** attempts, format like `679-T6Y`
- Unverified accounts deleted after **24 hours**
- Set `BREVO_API_KEY` (+ verified `BREVO_SENDER_EMAIL`) to send real HTML via Brevo. Without it, emails use Nodemailer `jsonTransport` (logged). In development, OTP codes also print as `[otp:dev] …`

## Authenticated resources

All require `Authorization: Bearer <token>` (or `molade_token` cookie).

| Resource | Base path |
|----------|-----------|
| Profile / prefs / export / delete | `/api/users` |
| Tasks | `/api/tasks` |
| Priorities | `/api/priorities` |
| Notifications | `/api/notifications` |
| Activity | `/api/activity` |
| Analytics | `/api/analytics/summary` |

Every query is scoped by `req.user.sub` — foreign IDs return **404**.

## Demo seed

```
email: a.molade@ulster.ac.uk
password: Password123!
```

## Response envelope

```json
{ "success": true, "message": "OK", "data": {} }
{ "success": false, "message": "…", "code": "NOT_FOUND", "requestId": "…" }
```
