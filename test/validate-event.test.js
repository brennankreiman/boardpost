import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { eventIssues } from "../public/lib/validate-event.js";

const valid = {
  id: "evt-1",
  name: "Local Gravel Fondo",
  eventDate: "2027-09-12",
  registrationDeadline: "2027-09-01",
  cost: "$75",
  category: "Gravel",
};

describe("eventIssues", () => {
  it("accepts a complete event", () => {
    assert.deepEqual(eventIssues(valid), []);
  });

  it("rejects an unknown category and an impossible date", () => {
    const issues = eventIssues({
      ...valid,
      category: "road",
      eventDate: "2026-02-31",
    });
    assert.ok(issues.some((issue) => issue.includes("category")));
    assert.ok(issues.some((issue) => issue.includes("eventDate")));
  });
});