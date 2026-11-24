import express from "express";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { filterEvents, todayISODate } from "./lib/filter-events.js";
import { CATEGORIES, listCategories } from "./lib/categories.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "data", "events.json");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function loadEvents() {
  const raw = await readFile(DATA_PATH, "utf8");
  return JSON.parse(raw);
}

async function saveEvents(events) {
  await writeFile(DATA_PATH, JSON.stringify(events, null, 2) + "\n", "utf8");
}

function isValidEvent(body) {
  const required = ["name", "eventDate", "registrationDeadline", "cost", "category"];
  for (const key of required) {
    if (!body[key] || typeof body[key] !== "string" || !body[key].trim()) {
      return `${key} is required`;
    }
  }
  if (!CATEGORIES.includes(body.category)) {
    return `category must be one of: ${CATEGORIES.join(", ")}`;
  }
  const url = typeof body.registrationUrl === "string" ? body.registrationUrl.trim() : "";
  if (url && !/^https?:\/\//i.test(url)) {
    return "registrationUrl must start with http:// or https://";
  }
  return null;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "boardpost" });
});

app.get("/api/categories", (_req, res) => {
  res.json(listCategories());
});

app.get("/api/events", async (req, res) => {
  try {
    const events = await loadEvents();
    const { category, q, from, to } = req.query;
    res.json(
      filterEvents(events, {
        category,
        q,
        from,
        to,
        today: todayISODate(),
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    const error = isValidEvent(req.body || {});
    if (error) {
      return res.status(400).json({ error });
    }

    const events = await loadEvents();
    const event = {
      id: `evt-${randomUUID().slice(0, 8)}`,
      name: req.body.name.trim(),
      eventDate: req.body.eventDate.trim(),
      registrationDeadline: req.body.registrationDeadline.trim(),
      cost: req.body.cost.trim(),
      category: req.body.category.trim(),
      location: (req.body.location || "").trim() || undefined,
      source: "manual",
    };
    const registrationUrl = (req.body.registrationUrl || "").trim();
    if (registrationUrl) {
      event.registrationUrl = registrationUrl;
    }

    events.push(event);
    await saveEvents(events);
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save event" });
  }
});

app.listen(PORT, () => {
  console.log(`boardpost running at http://localhost:${PORT}`);
});
