# boardpost agent context

Cycling events board. Static files on GitHub Pages. Visitors submit events through a form. A Cloudflare Worker opens a GitHub issue. A person copies the approved JSON into a year file and merges it. There is no database, no account system, and no OAuth.

Read this before changing the board, the year files, or the submission Worker. The short version is `.cursor/rules/boardpost-flow.mdc`.

## Decisions already made

Do not reintroduce these unless the task says to:

- No local passwords, sessions, Google/GitHub/Apple/Strava login, roles, or per-user submission quotas.
- No SQLite, Postgres, or other database. The event store is JSON in git.
- The review queue is GitHub issues labeled `submission`, not an in-app admin screen.
- An event is public only after its object is merged into `public/data/events/YYYY.json`.
- The visitor never sees GitHub. The form stays on the board and the Worker response is `{ "ok": true }` with no issue URL.
- Asset URLs stay relative (`styles.css`, `data/events/2026.json`) so the same files work on localhost, `https://brennankreiman.github.io/boardpost/`, and a future custom domain.
- Validation and duplicate detection live in `public/lib` and are imported by the browser, the Worker, and the tests. Do not copy that logic into a second implementation.

## Browse flow

1. `public/index.html` loads `public/app.js` as a module.
2. `app.js` fetches `data/events/index.json`, whose `years` array is ascending (`2026`, `2027` today).
3. `selectYears` in `public/lib/select-years.js` picks files:
   - No From/To: indexed years from the current calendar year onward.
   - From and/or To: indexed years whose calendar year overlaps that range.
4. The browser fetches only those `data/events/YYYY.json` files and concatenates them.
5. `filterEvents` in `public/lib/filter-events.js` runs in the browser:
   - No From/To: `eventDate >= today`, soonest first. Past events stay hidden.
   - From and/or To: that inclusive range, including past dates, still soonest first.
   - Category must match exactly, except `All`.
   - Search matches name or location, case-insensitive.
6. A Register link renders only when `registrationUrl` is set.

`npm start` (`server.js`) serves `public/` on port 3000. GitHub Pages publishes that same folder. There is no bundler.

## Submit flow

1. **Add an event** opens `<dialog id="event-dialog">`. Fields: name, event date, register-by date, cost, category, optional location, optional registration URL.
2. `public/app.js` posts JSON to `SUBMISSION_URL`, currently `https://boardpost-submissions.brennankreiman.workers.dev`.
3. `worker/index.js` (`handleRequest`):
   - Allows only origins in `ALLOWED_ORIGINS` (`wrangler.jsonc`). Anything else is 403. Preflight from an allowed origin is 204.
   - Rejects a body over 8000 bytes (413) and non-JSON (400).
   - `submissionIssues` (`public/lib/validate-submission.js`) checks required fields, real `YYYY-MM-DD` dates, a known category, name ≤ 120, cost ≤ 40, location ≤ 80, and an http(s) registration URL when present.
   - Reads `public/data/events/<year>.json` from GitHub Contents on the default branch. A missing year file is an empty list, not an error.
   - `findDuplicates` rejects the pending event with 409 when that year already has the same normalized name and date, or the same normalized registration URL and date.
   - Assigns `id` `evt-` plus 8 hex characters and `source: "submission"`, then opens an issue titled `Event: <name> (<eventDate>)` with label `submission`. The body contains the JSON object and which file to edit.
   - If GitHub returns 422 on the label, it retries once without labels.
   - Missing `GITHUB_TOKEN` is 503. GitHub read or write failures are 502. The visitor sees a short error either way.
4. On 201 the form says the event was submitted for review. It does not appear on the board until the year file changes.

`GITHUB_TOKEN` is a Worker secret (fine-grained PAT for `brennankreiman/boardpost`, Contents read, Issues read and write). It is not in the repo. `.dev.vars` is local only; `.dev.vars.example` is the committed template.

## Review and publish

1. Copy the JSON from the issue into `public/data/events/YYYY.json`, using the year of `eventDate`.
2. If that file is new, create it and add the year to `index.json` in ascending order.
3. Open a pull request. `.github/workflows/test.yml` runs `npm test`.
4. Merge to `cursor/cycling-events-board-mvp`. `.github/workflows/pages.yml` deploys `public/` to GitHub Pages. The Worker’s duplicate check reads that branch, so the new event blocks a repeat only after the merge.

`npm test` covers categories, date validation, year index vs files on disk, duplicates inside the files, filtering, year selection, and the Worker with a fake GitHub client.

## Event object

```json
{
  "id": "evt-009",
  "name": "Autumn Crit Series Finale",
  "eventDate": "2026-10-12",
  "registrationDeadline": "2026-10-05",
  "cost": "$35",
  "registrationUrl": "https://www.usacycling.org/",
  "category": "Road",
  "location": "Portland, OR",
  "source": "seed"
}
```

Required: `id`, `name`, `eventDate`, `registrationDeadline`, `cost`, `category`. Optional: `location`, `registrationUrl`. `source` is `seed` for the sample data and `submission` for the form. Dates are `YYYY-MM-DD`.

## Duplicates

`public/lib/duplicates.js`:

- Name match: trim, collapse whitespace, lowercase, plus the same `eventDate`.
- URL match: lowercase host, drop the trailing slash, fragment, `utm_*`, `gclid`, and `fbclid`, treat `http` and `https` as the same, plus the same `eventDate`.
- The same name or URL on a different day is allowed.
- Two events with no registration URL are not a URL match.

The Worker compares the submission only with the published file for that year. Open issues are not part of the check, so two pending submissions of the same event can both become issues.

## Categories

Source of truth: `public/lib/categories.js`. Keep `CATEGORIES` alphabetical with `localeCompare`. The filter and the form both call `listCategories()`. Leave `All` as the first filter option. See `.cursor/rules/event-categories.mdc`.

Current list: Alleycat, Charity, Cycle Messenger, Cyclocross, Gravel, MTB, Other, Road, Track.

## File map

| Path | Role |
| --- | --- |
| `public/index.html`, `public/app.js`, `public/styles.css` | The board and the form |
| `public/lib/categories.js` | Category list |
| `public/lib/filter-events.js` | Browser filter and sort |
| `public/lib/select-years.js` | Which year files to fetch |
| `public/lib/duplicates.js` | Name and URL duplicate keys |
| `public/lib/validate-event.js` | Checks for objects already in the year files |
| `public/lib/validate-submission.js` | Checks for a form payload, before an id exists |
| `public/data/events/index.json` | Year index |
| `public/data/events/YYYY.json` | Events for that year |
| `worker/index.js` | Submission Worker |
| `wrangler.jsonc` | Worker name, repo, and allowed origins |
| `server.js` | Local static server |
| `test/*.test.js` | `node:test` suites |
| `.github/workflows/pages.yml` | Pages deploy on push to the default branch |
| `.github/workflows/test.yml` | `npm test` on pull requests |

## Commands

```bash
npm install
npm start          # http://localhost:3000
npm test
npm run worker:dev # needs .dev.vars
npm run worker:deploy
```

Node 18+. Wrangler 4. The Worker uses `nodejs_compat` because it imports the shared modules.

## What is live

- Repo: `brennankreiman/boardpost`, public, default branch `cursor/cycling-events-board-mvp`.
- Site: `https://brennankreiman.github.io/boardpost/`. Pages builds from GitHub Actions.
- Worker: `boardpost-submissions` at `https://boardpost-submissions.brennankreiman.workers.dev`.
- Allowed form origins: `http://localhost:3000`, `http://127.0.0.1:3000`, `https://brennankreiman.github.io`.
- No custom `boardpost.*` domain yet. Adding one takes `public/CNAME`, the Pages custom-domain setting, DNS to `brennankreiman.github.io`, and that `https://` origin added to `ALLOWED_ORIGINS` followed by `npm run worker:deploy`.

## When changing this

- Keep the form posting to the Worker. Do not send visitors to GitHub to file an issue.
- Keep new public events in the year of `eventDate`, and keep `index.json` in sync.
- Add a regression test next to the suite that already covers the behavior.
- Run `npm test` before handing work back.
- Redeploy the Worker when `worker/index.js`, `wrangler.jsonc`, or a shared module the Worker imports changes. A Pages deploy does not update the Worker.
