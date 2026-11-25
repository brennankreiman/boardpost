import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { localSubmissionIssues, localSubmissionRecord } from "../public/lib/validate-local-submission.js";

const valid = {
  name: "RiNo Shop Night",
  eventDate: "2027-04-09",
  registrationDeadline: "2027-04-07",
  cost: "Free",
  category: "Social Gathering",
  city: "Denver, CO",
};

describe("local submission validation", () => {
  it("accepts a city with no region and omits a blank region", () => {
    assert.deepEqual(localSubmissionIssues({ ...valid, region: "   ", board: "local" }), []);
    const record = localSubmissionRecord({
      ...valid,
      region: "   ",
      board: "local",
      description: "  Bring a lock.  ",
      moreInfoUrl: "",
    });
    assert.equal(record.city, "Denver, CO");
    assert.equal("region" in record, false);
    assert.equal("board" in record, false);
    assert.equal("moreInfoUrl" in record, false);
    assert.equal(record.description, "Bring a lock.");
  });

  it("keeps a region and rejects one longer than 80 characters", () => {
    const kept = localSubmissionRecord({ ...valid, region: "  Bay Area  " });
    assert.equal(kept.region, "Bay Area");

    assert.deepEqual(localSubmissionIssues({ ...valid, region: "r".repeat(80) }), []);
    const issues = localSubmissionIssues({ ...valid, region: "r".repeat(81) });
    assert.ok(issues.some((issue) => issue.includes("region")));
  });

  it("requires a city of 80 characters or fewer", () => {
    const missing = localSubmissionIssues({ ...valid, city: "  " });
    assert.ok(missing.some((issue) => issue.includes("city")));

    const tooLong = localSubmissionIssues({ ...valid, city: "c".repeat(81) });
    assert.ok(tooLong.some((issue) => issue.includes("city")));
    assert.deepEqual(localSubmissionIssues({ ...valid, city: "c".repeat(80) }), []);
  });

  it("rejects an unknown local category and a bad detail field", () => {
    const issues = localSubmissionIssues({
      ...valid,
      category: "Gravel",
      description: "d".repeat(601),
      moreInfoUrl: "notaurl",
    });
    assert.ok(issues.some((issue) => issue.includes("category")));
    assert.ok(issues.some((issue) => issue.includes("description")));
    assert.ok(issues.some((issue) => issue.includes("moreInfoUrl")));
  });
});
