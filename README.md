# boardpost

Cycling events board. Upcoming rides and races, with the date, register-by date, cost, category, and registration link in one place.

> **Status:** MVP. The board is static files on GitHub Pages. New events are submitted from the site and reviewed as GitHub issues before they are added to the year files.

Live site, once Pages is enabled on the public repository: [https://brennankreiman.github.io/boardpost/](https://brennankreiman.github.io/boardpost/)

## What's on the board

- Upcoming events only, soonest first. Past events stay hidden until a From or To date includes them.
- Filters for search, category (A→Z), and a date range. Clear filters returns to the upcoming view.
- The page loads `public/data/events/index.json`, then only the year files that range needs.
- A Register link appears when the event has a registration URL. A More info link appears when the event has its own page. Either link can be present without the other.
- Click an event for the full listing. A wide window opens it in a dialog over the board. A narrow window expands that row.
- Categories: Alleycat, Charity, Cycle Messenger, Cyclocross, Gravel, MTB, Other, Road, Track.
- Seed events include NACCC 2026 (Guadalajara) and NACCC 2027 (Toronto).

## Open an event

Click an event to read the listing: name, category, location, event date, register-by date, cost, and description. More info opens the event's own page when that link is set. Register opens signup when a registration link is set. The two links are separate, and either one can be missing.

On a wide screen the listing opens in a dialog over the board. The list underneath stays where it is. Escape or the close button dismisses the dialog. On a narrow screen the same listing expands inside that row, and the rest of the page stays usable. Opening another event collapses the one that was open.

While a listing is open, the page address includes `?event=` and that event's id. A shared or reloaded link opens the listing again when the board has loaded that event.

## Add an event

**Add an event** on the board asks for the name, event date, register-by date, cost, category, and optional location, description, registration URL, and more info URL. A description can be up to 600 characters. A more info URL has to start with http:// or https://. The visitor stays on the board. The form posts to the Cloudflare Worker at `https://boardpost-submissions.brennankreiman.workers.dev`.

The worker checks the fields, then rejects the submission when an event in that year's file already has the same name and date, or the same registration URL and date. A different day is allowed. Accepted submissions become a GitHub issue labeled `submission`, with the JSON object to add. The issue is the review queue. The event shows on the board only after that object is merged into the year file.

`GITHUB_TOKEN` is a Worker secret, not a file in this repository. It is a fine-grained token for `brennankreiman/boardpost` with Contents read and Issues read and write. To rotate it:

```bash
npx wrangler secret put GITHUB_TOKEN
```

`.dev.vars` is for a local `npm run worker:dev` only. Copy [`.dev.vars.example`](.dev.vars.example) and do not commit the filled-in file.

## Publish an approved event

1. Copy the JSON from the `submission` issue into `public/data/events/YYYY.json`, using the year of `eventDate`.
2. If that year file does not exist, create it and add the year to `public/data/events/index.json` in ascending order.
3. Open a pull request. `npm test` checks dates, categories, that the index matches the files, and that no two events share a name and date or a registration URL and date.
4. Merge into `cursor/cycling-events-board-mvp`. GitHub Pages publishes the `public/` folder. The duplicate check reads that branch, so the new event blocks a repeat only after the merge.

## Address

GitHub Pages serves this repository at [https://brennankreiman.github.io/boardpost/](https://brennankreiman.github.io/boardpost/). The free plan requires a **public** repository. In the repository settings, set Pages to deploy from **GitHub Actions**. [`.github/workflows/pages.yml`](.github/workflows/pages.yml) uploads `public/` on every push to the default branch. [`.github/workflows/test.yml`](.github/workflows/test.yml) runs `npm test` on pull requests.

Asset links are relative (`styles.css`, `data/events/2026.json`), so the same files work at the project URL, on a custom domain, and at [http://localhost:3000](http://localhost:3000).

A name such as `boardpost.com` is a custom domain on top of Pages. No `boardpost` domain is attached yet. When you have one:

1. Put the hostname alone in `public/CNAME`, for example `boardpost.com`.
2. Set that same host as the Pages custom domain.
3. Point DNS at GitHub: a `CNAME` of `brennankreiman.github.io` for a subdomain such as `www`, or GitHub's apex `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`.
4. Add `https://` plus that hostname to `ALLOWED_ORIGINS` in [`wrangler.jsonc`](wrangler.jsonc), then `npm run worker:deploy`, so the form can post from the new address.

## Stack

- Static HTML, CSS, and JS in `public/`
- One JSON file per year in `public/data/events/`
- Cloudflare Worker in [`worker/index.js`](worker/index.js) for form submissions
- GitHub Pages and GitHub issues for publishing and review
- Local preview: `npm start` serves `public/`
- Tests: `node:test` (`npm test`)

## Run locally

Requires Node 18+.

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run worker:dev
```

## Data files

- `public/data/events/index.json` lists the years in ascending order
- `public/data/events/YYYY.json` holds events whose `eventDate` is in that year

## Project notes

- Keep categories alphabetical. The source of truth is [`public/lib/categories.js`](public/lib/categories.js). See [`.cursor/rules/event-categories.mdc`](.cursor/rules/event-categories.mdc).
- There are no accounts and no database. Visitors use the form. Approved events are commits to the year files.
