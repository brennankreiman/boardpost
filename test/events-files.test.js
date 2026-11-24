import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findDuplicates } from "../public/lib/duplicates.js";
import { eventIssues } from "../public/lib/validate-event.js";

const eventsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/data/events");

async function loadEvents() {
  const names = (await readdir(eventsDir)).filter((name) => /^\d{4}\.json$/.test(name)).sort();
  const fileYears = names.map((name) => Number(name.slice(0, 4)));
  const events = [];

  for (const name of names) {
    const year = Number(name.slice(0, 4));
    const rows = JSON.parse(await readFile(path.join(eventsDir, name), "utf8"));
    assert.ok(Array.isArray(rows), `${name} must be an array`);
    for (const event of rows) {
      events.push({ year, event });
    }
  }

  const index = JSON.parse(await readFile(path.join(eventsDir, "index.json"), "utf8"));
  return { fileYears, events, index };
}

describe("event year files", () => {
  it("lists the same years as the files on disk, in ascending order", async () => {
    const { fileYears, index } = await loadEvents();
    assert.deepEqual(index, { years: fileYears });
    assert.deepEqual(index.years, [...index.years].sort((a, b) => a - b));
  });

  it("keeps each event in the year of its event date, with valid fields", async () => {
    const { events } = await loadEvents();
    assert.ok(events.length > 0);

    for (const { year, event } of events) {
      assert.deepEqual(eventIssues(event), [], `${event.id}: ${eventIssues(event).join("; ")}`);
      assert.equal(Number(event.eventDate.slice(0, 4)), year, event.id);
    }
  });

  it("has no duplicate name+date or url+date across files", async () => {
    const { events } = await loadEvents();
    assert.deepEqual(
      findDuplicates(events.map((row) => row.event)),
      []
    );
  });
});
