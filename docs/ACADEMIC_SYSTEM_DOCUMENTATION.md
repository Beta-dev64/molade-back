# Molade — Intelligent Task Management System  
## Academic System Documentation

**Module:** COM814 Project (2025–2026)  
**School:** School of Computing, Engineering & Intelligent Systems  
**Institution:** Ulster University  
**Student:** Medinat Oyelaja (B01036652)  
**Supervisor:** Dr. Aqib Javed  
**Second marker:** George Martin  

---

## 1. Introduction

Molade is a web-based intelligent task management system designed for university students who must balance coursework, examinations, dissertations and personal commitments. Unlike conventional to-do applications that leave prioritisation entirely to the user, Molade applies an **explainable, rule-based ranking engine** so that students can see *what* to do next and *why*.

The system combines:

- a React (TanStack Start) single-page application;
- a Node.js / Express REST API with PostgreSQL persistence;
- Redis for rate limiting and short-lived caching;
- Brevo transactional email for OTP and deadline reminders;
- Socket.IO for real-time in-app notifications.

This document describes the problem context, design rationale, architecture, algorithms, security model, evaluation considerations and limitations — suitable for inclusion or adaptation into a COM814 dissertation.

---

## 2. Problem statement

University students frequently manage multiple concurrent deadlines. Existing tools (e.g. Trello, Notion, generic reminder apps) support capture and organisation but rarely provide transparent, workload-aware prioritisation. Students therefore spend cognitive effort deciding what matters most, and may miss deadlines or experience avoidable stress.

Molade addresses this by:

1. capturing academic tasks with deadline, effort and status metadata;
2. scoring open tasks with a deterministic priority model;
3. explaining each ranking decision in human-readable reasons;
4. delivering deadline reminders by email and real-time in-app alerts.

---

## 3. Aims and objectives

| ID | Objective | Status in implementation |
|----|-----------|--------------------------|
| O1 | Secure student registration and authentication | Implemented (JWT + email OTP) |
| O2 | CRUD for coursework tasks scoped per user | Implemented |
| O3 | Rule-based priority ranking with explanations | Implemented (client + server) |
| O4 | Deadline reminders (email + in-app) | Implemented (cron + Brevo + Socket.IO) |
| O5 | Analytics of completion / on-time behaviour | Implemented |
| O6 | UK GDPR-aligned data handling (export / delete) | Implemented |
| O7 | Usable responsive web UI for students | Implemented |

---

## 4. Related work and design choices

Productivity platforms such as Todoist and Microsoft To Do provide labels, due dates and some smart suggestions, but often treat prioritisation as opaque or manual. Academic literature associates time-management skill with better learning outcomes; Molade therefore emphasises **transparency**: every ranked task exposes weighted reasons (deadline proximity, effort vs time remaining, status, overdue risk, optional personal preference, snooze).

**Why rule-based rather than machine learning?**  
For a dissertation prototype serving a small cohort, a rule-based engine is:

- explainable by construction;
- free of training-data and cold-start problems;
- auditable for academic assessment;
- cheap to operate.

---

## 5. System architecture

```
┌─────────────────────┐         HTTPS / REST          ┌──────────────────────┐
│  React frontend     │ ────────────────────────────► │  Express API         │
│  (TanStack Start)   │                               │  routes→controllers  │
│  Vite / localhost   │ ◄──── Socket.IO (JWT) ───────►│  → services          │
│  or Vercel          │                               │  ┌──── cron jobs ──┐ │
└─────────────────────┘                               │  │ reminders       │ │
                                                      │  │ purge unverified│ │
                                                      │  └────────┬────────┘ │
                                                      └───────────┼──────────┘
                                        ┌─────────────┬───────────┼──────────┐
                                        ▼             ▼           ▼          ▼
                                   PostgreSQL      Redis       Brevo     Socket.IO
                                   (Prisma)     (cache/RL)    (email)   (realtime)
```

### 5.1 Frontend

- **Stack:** React, TanStack Router/Start, Tailwind CSS, Recharts, Motion, Sonner toasts.
- **State:** `MoladeProvider` loads user, tasks, notifications and activity from the API; connects Socket.IO after authentication.
- **Priority display:** ranking computed with the same rule weights as the server for consistent UX.

### 5.2 Backend

Layered Express TypeScript application:

`HTTP → middlewares (helmet, CORS, rate limit, auth, validate) → controllers → services → Prisma / Redis / mail / socket`

Key modules: `auth`, `users`, `tasks`, `priorities`, `notifications`, `activity`, `analytics`, `health`.

### 5.3 Data model (summary)

- **User** — profile, password hash, email verification timestamp  
- **UserPreferences** — email/push toggles, reminder lead time  
- **Task** — deadline, effort (S/M/L), status, preference, snooze  
- **Notification** — type, title, body, read/snooze, leadBucket (dedupe)  
- **Activity** — audit-style feed entries  
- **Otp** — hashed one-time codes for verify / password reset  

All task and notification queries are constrained by `userId` to prevent IDOR.

---

## 6. Priority algorithm

The ranking function assigns a numeric score from factors including:

1. **Deadline proximity** — higher score as the deadline approaches; strong boost when overdue.  
2. **Effort vs remaining time** — larger tasks with little time remaining escalate.  
3. **Status** — in-progress / blocked influence urgency.  
4. **Personal preference** — optional soft nudge (never overrides hard deadline risk alone).  
5. **Snooze** — temporarily de-prioritises until `snoozedUntil`.

Each factor contributes labelled **reasons** with weights and kinds (`deadline`, `effort`, `status`, `risk`, `preference`) so the UI can explain the ordering. The same logic exists in `backend/src/lib/priority.ts` and `frontend/src/lib/molade/priority.ts`.

---

## 7. Authentication and security

| Concern | Approach |
|---------|----------|
| Authentication | Email + password; bcrypt hashing; JWT access tokens |
| Email verification | 6-character OTP (`XXX-XXX`), 10-minute TTL, attempt limits |
| Password reset | OTP then short-lived reset JWT |
| Authorisation | Middleware attaches `req.user`; services always filter by `userId` |
| Transport | HTTPS in production; CORS restricted to configured origins |
| Abuse | Redis rate limit (default 100 req/IP/min) |
| Realtime auth | Socket.IO handshake requires Bearer/JWT in `auth.token` |
| Privacy | Export-my-data and delete-account endpoints; UK GDPR-oriented copy |

Unverified accounts are purged after 24 hours by a scheduled job.

---

## 8. Notification subsystem

### 8.1 Channels

1. **In-app (persisted)** — rows in `notifications`, listed via REST.  
2. **Real-time** — Socket.IO events: `notification:new`, `notification:updated`, `notification:removed`, `notifications:sync`.  
3. **Email** — Brevo transactional API (`htmlContent` + `textContent`) when preferences allow.  
4. **Browser Notification API** — optional when the user enables the push preference (requires permission).

### 8.2 Deadline job

A cron task runs every 10 minutes (`deadlineReminders.job.ts`):

- selects verified users;
- for each open task in the lead window (24h / 12h / 3h) or newly overdue;
- deduplicates via `leadBucket`;
- creates a notification;
- emits `notification:new` to room `user:{userId}`;
- optionally sends email and records `emailSentAt`.

### 8.3 Live delivery

Authenticated sockets join a private room. Emits never broadcast globally. Multi-tab clients stay consistent through update/remove/sync events.

---

## 9. Email subsystem (Brevo)

Outbound mail uses Brevo’s REST endpoint `POST /v3/smtp/email` when `BREVO_API_KEY` is set. Sender identity must match a **verified** Brevo sender (freemail domains are supported but not ideal for production deliverability). Templates cover verification, password reset and deadline reminders.

---

## 10. Deployment considerations

| Component | Suggested hosting |
|-----------|-------------------|
| Frontend | Vercel (static / TanStack Start) — Socket.IO **client** only |
| API + Socket.IO server + cron | Always-on Node host (Railway, Render, Fly.io, VPS) |
| PostgreSQL / Redis | Managed instances or Docker Compose locally |

Long-lived Socket.IO servers are a poor fit for classic serverless-only free tiers; the browser client on Vercel connecting to an external API is the intended pattern.

---

## 11. Testing strategy

| Test | Purpose |
|------|---------|
| `npm run smoke` | REST health, login, tasks, priorities, register/OTP, IDOR, reset |
| `npm run smoke:socket` | JWT Socket.IO connect + live `notification:new` via `/api/notifications/ping` |
| `npm run mail:test` | Brevo HTML send using configured sender |
| Manual UI | Auth flows, ranking explanations, notifications page “Test live alert” |

---

## 12. Ethical and legal considerations

- Data minimisation: store only what is needed for ranking and reminders.  
- Purpose limitation: no advertising / profiling.  
- User rights: export and account deletion.  
- Transparency: priority reasons are visible.  
- Academic integrity: the system assists organisation; it does not automate assessed submission.

---

## 13. Limitations and future work

1. Priority rules are heuristic, not personalised via learning.  
2. Browser push is not a full Web Push / service-worker implementation.  
3. Freemail Brevo senders may hit spam filters; a custom domain with SPF/DKIM/DMARC is preferred for production.  
4. Reminder cron granularity is 10 minutes.  
5. No native mobile applications.  
6. Socket.IO requires a persistently running API process.

---

## 14. Conclusion

Molade demonstrates a complete, student-focused task management pipeline: secure identity, explainable prioritisation, analytics, email reminders and real-time notifications. The architecture is intentionally boring and inspectable — appropriate for an academic project that must be secure, evaluable and operable by a single developer — while still reflecting practices used in production web systems (layered APIs, JWT auth, Redis caching, transactional email and WebSocket fan-out).

---

## References (indicative)

Wilson, R., Joiner, K. and Abbasi, A. (2021) ‘Improving students’ performance with time management skills’, *Journal of University Teaching & Learning Practice*, 18(4).  

UK GDPR / Data Protection Act 2018 — principles of lawful processing, transparency and data subject rights.

---

*Document version: 1.0 — aligned with the Molade codebase including Socket.IO notifications and Brevo mail.*
