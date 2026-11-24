# boardpost

Hobby cycling events post board. Browse public-style event listings with date, registration deadline, cost, category, and signup link in one place.

## MVP scope

This prototype tests whether a single board with those fields is useful. Events are seeded (plus manual posts). Full web scanning comes later.

## Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For auto-reload while editing the server:

```bash
npm run dev
```

## API

- `GET /api/events` — list/filter (`category`, `q`, `from`, `to`)
- `POST /api/events` — post a new event
- `GET /api/categories` — category list
