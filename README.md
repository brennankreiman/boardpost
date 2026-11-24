# boardpost

Prototype cycling events post board. One place to browse upcoming rides and races with the details that matter for signing up.

> **Status:** early prototype (hobby). Seeded event data + local Node server. Auth, moderation, and web scanning are not built yet.

## What this prototype tests

Cyclists will use a single board if **event date**, **register-by date**, **cost**, **category**, and **registration link** (when available) are easy to scan and filter.

## What's working today

- Public board of upcoming events (past events hidden by default), sorted soonest → farthest
- Filters: search, category (A→Z), date From / To (explicit dates can include past events)
- Clear filters returns to the default upcoming view
- Post an event form (prototype-only; posts go live immediately — moderation comes later)
- Register button only when a real registration URL exists
- Categories include Road, Gravel, MTB, Cyclocross, Alleycat, Cycle Messenger, Track, Charity, Other
- Seed data includes sample events plus NACCC 2026 (Guadalajara) and NACCC 2027 (Toronto)

## Stack

- Node.js + Express
- Static HTML / CSS / JS front end
- JSON file store for events (`data/events.json`)
- Unit tests via `node:test` (`npm test`)

## Run locally

Requires Node 18+.

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run dev   # auto-reload server
npm test      # filter + category tests
```

## API (prototype)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/events` | Query: `category`, `q`, `from`, `to`. Default = upcoming only. |
| `POST` | `/api/events` | Creates an event immediately (no auth/moderation yet). |
| `GET` | `/api/categories` | Alphabetical category list. |
| `GET` | `/api/health` | Health check. |

## Not in this prototype (planned)

- OAuth login (Google / GitHub / etc.) — no local passwords
- Logged-in submissions only
- Duplicate checks (name / URL)
- Admin / moderator approval before public listing
- Submission limits (5 unverified / 200 verified)
- Scanning the web for public events

## Project notes

- Keep event categories alphabetically sorted — see `.cursor/rules/event-categories.mdc` and `lib/categories.js`.
