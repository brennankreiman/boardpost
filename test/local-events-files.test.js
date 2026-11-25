import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findDuplicates } from "../public/lib/duplicates.js";
import { localSubmissionIssues } from "../public/lib/validate-local-submission.js";

const localDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/data/local");

async function loadLocalEvents() {
  const names = (await readdir(localDir)).filter((name) => /^\d{4}\.json$/.test(name)).sort();
  const fileYears = names.map((name) => Number(name.slice(0, 4)));
  const events = [];

  for (const name of names) {
    const year = Number(name.slice(0, 4));
    const rows = JSON.parse(await readFile(path.join(localDir, name), "utf8"));
    assert.ok(Array.isArray(rows), `${name} must be an array`);
    for (const event of rows) {
      events.push({ year, event });
    }
  }

  const index = JSON.parse(await readFile(path.join(localDir, "index.json"), "utf8"));
  return { fileYears, events, index };
}

describe("local event year files", () => {
  it("lists the same years as the files on disk, in ascending order", async () => {
    const { fileYears, index } = await loadLocalEvents();
    assert.deepEqual(index, { years: fileYears });
    assert.deepEqual(index.years, [...index.years].sort((a, b) => a - b));
  });

  it("keeps each local event valid, in the year of its date, with a city", async () => {
    const { events } = await loadLocalEvents();
    assert.ok(events.length > 0);

    for (const { year, event } of events) {
      assert.equal(typeof event.id, "string");
      assert.equal(event.board, undefined);
      assert.deepEqual(localSubmissionIssues(event), [], `${event.id}: ${localSubmissionIssues(event).join("; ")}`);
      assert.equal(Number(event.eventDate.slice(0, 4)), year, event.id);
      if ("region" in event) {
        assert.equal(typeof event.region, "string");
        assert.ok(event.region.trim().length > 0);
      }
    }
  });

  it("has no duplicate name+date or url+date", async () => {
    const { events } = await loadLocalEvents();
    assert.deepEqual(
      findDuplicates(events.map((row) => row.event)),
      []
    );
  });

  it("seeds two cities in one region, another region, and a city with no region", async () => {
    const { events } = await loadLocalEvents();
    const rows = events.map((row) => row.event);
    const bay = rows.filter((event) => event.region && event.region.toLowerCase() === "bay area");
    assert.ok(new Set(bay.map((event) => event.city.toLowerCase())).size >= 2);
    const regions = new Set(rows.filter((event) => event.region).map((event) => event.region.toLowerCase()));
    assert.ok(regions.size >= 2);
    assert.ok(rows.some((event) => event.city && event.region == null));
  });
});
