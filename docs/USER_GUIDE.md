# Molade User Guide

**Molade** helps university students know what coursework to do next. It ranks your tasks by deadline, workload and status, explains the ranking, and reminds you before things are due.

---

## 1. Getting started

### 1.1 Create an account

1. Open the Molade website (e.g. `http://localhost:8080` in development).  
2. Choose **Create an account**.  
3. Enter your full name, university email and a password (at least 8 characters).  
4. Submit the form.

### 1.2 Verify your email

1. Check your inbox for a message from **Molade Planner** (also check Spam).  
2. Enter the 6-character code (shown as two groups of three, e.g. `9GK-A4W`).  
3. After verification you are signed in automatically.

Codes expire in **10 minutes**. Use **Resend** if needed (there is a short cooldown).

### 1.3 Sign in later

Use **Sign in** with your email and password. If your email is not verified yet, Molade will send you back to the verification screen.

---

## 2. Dashboard

After sign-in you land on the **Dashboard**.

- Greeting uses **your first name**.  
- **Next up** is your highest-ranked open task.  
- Quick-add creates a task with sensible defaults (medium effort, about three days out).  
- Activity shows recent changes.

---

## 3. Tasks

### 3.1 Create a task

Use **+ New task** (top bar) or the Tasks page.

Fill in:

| Field | Meaning |
|-------|---------|
| Title | Clear name of the work |
| Module / course code | e.g. COM814 |
| Deadline | Date and time — required for ranking |
| Effort | S (small), M (medium), L (large) |
| Status | Not started, In progress, Blocked, Completed |
| Preference | Optional nudge (Low / Normal / High) |

### 3.2 Edit, complete, delete

Open a task from the list. You can edit details, mark complete/incomplete, or delete. Completing a task records whether you finished on time when possible.

### 3.3 Snooze

Snoozing a reminder or task temporarily lowers its ranking until the snooze ends.

---

## 4. Priorities

The **Priorities** page shows the full ranked list with levels such as Critical, High, Medium and Low.

- Tap **Why** / expand reasons to see how Molade scored the task.  
- Use **Recalculate** after big changes if you want an explicit refresh (ranking also updates as you edit tasks).

Molade does **not** use a black-box AI model for ranking. Scores come from fixed, readable rules.

---

## 5. Notifications (live)

### 5.1 In-app alerts

Deadline and overdue reminders appear:

- in the **bell** menu;  
- on the **Notifications** page;  
- as a toast when a new alert arrives while you are online.

A green **Live updates connected** label means Socket.IO is active. New reminders appear without refreshing the page.

### 5.2 Test live delivery

On **Notifications**, click **Test live alert**. You should see a system notification arrive immediately if you are connected.

### 5.3 Actions

| Action | Effect |
|--------|--------|
| Mark read | Clears unread state |
| Mark all read | Clears all unread |
| Dismiss | Removes the reminder |
| Snooze | Hides it for a few hours and can snooze the linked task |

### 5.4 Email reminders

If email reminders are enabled in preferences, Molade also emails you when a deadline enters your lead window (24h, 12h or 3h) or becomes overdue. Delivery depends on your mail provider; check Spam if nothing arrives.

### 5.5 Browser notifications

On Notifications / Settings you can enable **Browser notifications**. Your browser will ask for permission. This shows a desktop/OS notification when a live alert arrives (while the site may be in another tab). This is not a full mobile push service.

---

## 6. Analytics

**Analytics** summarises:

- completion / on-time behaviour;  
- weekly completion trend;  
- workload by module for open tasks.

Charts fill in as you complete real work.

---

## 7. Settings

| Section | What you can do |
|---------|-----------------|
| Profile | Update name, email, programme |
| Password | Change password (current password required) |
| Preferences | Email on/off, lead time, browser notifications |
| Appearance / accessibility | Density, reduced motion, replay tour |
| Privacy | Export your data (JSON) or delete your account |
| Sign out | Ends the session |

Deleting your account permanently removes your tasks, notifications and activity.

---

## 8. Forgot password

1. On the sign-in page, open **Forgot password?**  
2. Enter your email.  
3. Enter the OTP from the email.  
4. Choose a new password and sign in.

---

## 9. Tips for students

1. Always set a **real deadline** — ranking depends on it.  
2. Use **effort** honestly so large work near a deadline surfaces earlier.  
3. Prefer **In progress** when you have started something; Molade factors status into urgency.  
4. Keep **email reminders** on during assessment weeks.  
5. Use **snooze** sparingly — it is for temporary deferral, not ignoring overdue work.

---

## 10. Troubleshooting

| Problem | What to try |
|---------|-------------|
| No verification email | Check Spam; confirm Brevo sender is verified; resend OTP |
| “Live updates” never connects | Ensure the API is running; sign out and back in |
| Ranking looks wrong | Check deadline timezone, effort and status; open reasons |
| Can’t sign in | Verify email first; use Forgot password if needed |
| Empty analytics | Complete a few tasks over time |

---

## 11. Privacy (plain language)

Molade stores your account and coursework details only to rank tasks and send reminders you asked for. Data is not sold. You can export or delete your account from Settings.

---

## 12. Demo account (local development)

If the database has been seeded:

- **Email:** `a.molade@ulster.ac.uk`  
- **Password:** `Password123!`

---

*User guide version 1.0 — Molade COM814 project.*
