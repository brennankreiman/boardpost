import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectYears } from "../public/lib/select-years.js";

const YEARS = [2027, 2025, 2026];

describe("selectYears", () => {
  it("loads the current year and later when no date filter is set", () => {
    assert.deepEqual(selectYears(YEARS, { today: "2026-11-23" }), [2026, 2027]);
  });

  it("loads only years that overlap a from/to range", () => {
    assert.deepEqual(
      selectYears(YEARS, { from: "2026-10-01", to: "2026-11-15", today: "2026-11-23" }),
      [2026]
    );
  });

  it("includes every year a range crosses", () => {
    assert.deepEqual(
      selectYears(YEARS, { from: "2026-09-01", to: "2027-12-31", today: "2026-11-23" }),
      [2026, 2027]
    );
  });

  it("includes earlier years when To reaches into the past", () => {
    assert.deepEqual(selectYears(YEARS, { to: "2026-11-01", today: "2026-11-23" }), [2025, 2026]);
  });

  it("returns nothing when the range misses every indexed year", () => {
    assert.deepEqual(selectYears(YEARS, { from: "2028-01-01", today: "2026-11-23" }), []);
  });
});
