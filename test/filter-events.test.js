import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterEvents } from "../public/lib/filter-events.js";

const sample = [
  {
    id: "past-road",
    name: "Autumn Crit",
    eventDate: "2026-10-01",
    category: "Road",
    location: "Portland, OR",
  },
  {
    id: "past-gravel",
    name: "Harvest Gravel",
    eventDate: "2026-11-01",
    category: "Gravel",
    location: "Bend, OR",
  },
  {
    id: "soon",
    name: "CrossVegas Cyclocross",
    eventDate: "2026-12-06",
    category: "Cyclocross",
    location: "Las Vegas, NV",
  },
  {
    id: "later",
    name: "Sea Otter Classic",
    eventDate: "2027-04-18",
    category: "Road",
    location: "Monterey, CA",
  },
];

const TODAY = "2026-11-23";

describe("filterEvents", () => {
  it("defaults to upcoming events only, soonest first", () => {
    const result = filterEvents(sample, { today: TODAY });
    assert.deepEqual(
      result.map((e) => e.id),
      ["soon", "later"]
    );
  });

  it("includes past events when From is set to an older date", () => {
    const result = filterEvents(sample, {
      today: TODAY,
      from: "2026-10-01",
    });
    assert.deepEqual(
      result.map((e) => e.id),
      ["past-road", "past-gravel", "soon", "later"]
    );
  });

  it("filters by From and To range including past dates", () => {
    const result = filterEvents(sample, {
      today: TODAY,
      from: "2026-10-01",
      to: "2026-11-15",
    });
    assert.deepEqual(
      result.map((e) => e.id),
      ["past-road", "past-gravel"]
    );
  });

  it("honors To alone so older windows are visible", () => {
    const result = filterEvents(sample, {
      today: TODAY,
      to: "2026-11-01",
    });
    assert.deepEqual(
      result.map((e) => e.id),
      ["past-road", "past-gravel"]
    );
  });

  it("still sorts soonest to farthest within a past-inclusive range", () => {
    const result = filterEvents(sample, {
      today: TODAY,
      from: "2026-09-01",
      to: "2027-12-31",
    });
    assert.deepEqual(
      result.map((e) => e.eventDate),
      ["2026-10-01", "2026-11-01", "2026-12-06", "2027-04-18"]
    );
  });
});
