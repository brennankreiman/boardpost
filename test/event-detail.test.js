import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  eventIdFromSearch,
  optionalDetailFields,
  optionalDetailIssues,
  searchWithEventId,
  usesDesktopDetail,
} from "../public/lib/event-detail.js";
import { eventIssues } from "../public/lib/validate-event.js";
import { submissionIssues, submissionRecord } from "../public/lib/validate-submission.js";

const event = {
  id: "evt-1",
  name: "Local Gravel Fondo",
  eventDate: "2027-09-12",
  registrationDeadline: "2027-09-01",
  cost: "$75",
  category: "Gravel",
};

const submission = {
  name: "Local Gravel Fondo",
  eventDate: "2027-09-12",
  registrationDeadline: "2027-09-01",
  cost: "$75",
  category: "Gravel",
};

describe("optionalDetailIssues", () => {
  it("allows a missing, empty, or blank description and more info URL", () => {
    assert.deepEqual(optionalDetailIssues({}), []);
    assert.deepEqual(optionalDetailIssues(null), []);
    assert.deepEqual(optionalDetailIssues(undefined), []);
    assert.deepEqual(optionalDetailIssues({ description: "", moreInfoUrl: "" }), []);
    assert.deepEqual(optionalDetailIssues({ description: "   ", moreInfoUrl: "   " }), []);
    assert.deepEqual(optionalDetailIssues({ description: null, moreInfoUrl: null }), []);
  });

  it("allows a description of 600 characters and http(s) more info URLs", () => {
    assert.deepEqual(
      optionalDetailIssues({
        description: "a".repeat(600),
        moreInfoUrl: "https://example.com/info",
      }),
      []
    );
    assert.deepEqual(optionalDetailIssues({ moreInfoUrl: "http://example.com" }), []);
    assert.deepEqual(optionalDetailIssues({ moreInfoUrl: "  HTTPS://example.com/a  " }), []);
    assert.deepEqual(
      optionalDetailIssues({ description: ` ${"a".repeat(600)} ` }),
      []
    );
  });

  it("rejects a description longer than 600 characters", () => {
    assert.deepEqual(optionalDetailIssues({ description: "a".repeat(601) }), [
      "description must be 600 characters or fewer",
    ]);
    assert.deepEqual(optionalDetailIssues({ description: 601 }), [
      "description must be 600 characters or fewer",
    ]);
  });

  it("rejects a more info URL that does not start with http:// or https://", () => {
    assert.deepEqual(optionalDetailIssues({ moreInfoUrl: "ftp://example.com" }), [
      "moreInfoUrl must start with http:// or https://",
    ]);
    assert.deepEqual(optionalDetailIssues({ moreInfoUrl: "example.com" }), [
      "moreInfoUrl must start with http:// or https://",
    ]);
    assert.deepEqual(optionalDetailIssues({ moreInfoUrl: 12 }), [
      "moreInfoUrl must start with http:// or https://",
    ]);
  });

  it("reports both problems together", () => {
    assert.deepEqual(
      optionalDetailIssues({ description: "a".repeat(601), moreInfoUrl: "notaurl" }),
      [
        "description must be 600 characters or fewer",
        "moreInfoUrl must start with http:// or https://",
      ]
    );
  });
});

describe("optionalDetailFields", () => {
  it("returns only trimmed non-empty description and moreInfoUrl", () => {
    assert.deepEqual(optionalDetailFields(null), {});
    assert.deepEqual(optionalDetailFields({ description: "  ", moreInfoUrl: "" }), {});
    assert.deepEqual(
      optionalDetailFields({
        name: "Keep me out",
        description: "  Night race  ",
        moreInfoUrl: "  https://example.com/info  ",
      }),
      {
        description: "Night race",
        moreInfoUrl: "https://example.com/info",
      }
    );
    assert.deepEqual(optionalDetailFields({ description: "Only this" }), {
      description: "Only this",
    });
    assert.deepEqual(optionalDetailFields({ moreInfoUrl: "http://example.com" }), {
      moreInfoUrl: "http://example.com",
    });
  });
});

describe("event query string", () => {
  it("reads the event parameter", () => {
    assert.equal(eventIdFromSearch(""), null);
    assert.equal(eventIdFromSearch("?"), null);
    assert.equal(eventIdFromSearch("?event="), null);
    assert.equal(eventIdFromSearch("?event=%20"), null);
    assert.equal(eventIdFromSearch("?foo=1"), null);
    assert.equal(eventIdFromSearch("?event=evt-004"), "evt-004");
    assert.equal(eventIdFromSearch("event=evt-004"), "evt-004");
    assert.equal(eventIdFromSearch("?foo=1&event=evt-004"), "evt-004");
    assert.equal(eventIdFromSearch("?event=evt-004&foo=1"), "evt-004");
    assert.equal(eventIdFromSearch("https://example.com/board?event=evt-012#row"), "evt-012");
  });

  it("sets and removes event without dropping other parameters", () => {
    assert.equal(searchWithEventId("", "evt-004"), "?event=evt-004");
    assert.equal(searchWithEventId("?", "evt-004"), "?event=evt-004");
    assert.equal(searchWithEventId("?foo=1", "evt-004"), "?foo=1&event=evt-004");
    assert.equal(searchWithEventId("?event=old&foo=1", "evt-004"), "?event=evt-004&foo=1");
    assert.equal(searchWithEventId("?event=evt-004", null), "");
    assert.equal(searchWithEventId("?foo=1&event=evt-004", null), "?foo=1");
    assert.equal(searchWithEventId("?foo=1", null), "?foo=1");
    assert.equal(searchWithEventId("", null), "");
    assert.equal(searchWithEventId("?event=evt-004", ""), "");

    const next = searchWithEventId("?q=gravel", "evt-012");
    assert.equal(eventIdFromSearch(next), "evt-012");
    assert.equal(eventIdFromSearch(searchWithEventId(next, null)), null);
  });
});

describe("usesDesktopDetail", () => {
  it("is true only for numeric widths of 768 and up", () => {
    assert.equal(usesDesktopDetail(768), true);
    assert.equal(usesDesktopDetail(1024), true);
    assert.equal(usesDesktopDetail(767), false);
    assert.equal(usesDesktopDetail(767.9), false);
    assert.equal(usesDesktopDetail(0), false);
    assert.equal(usesDesktopDetail(-1), false);
    assert.equal(usesDesktopDetail("768"), false);
    assert.equal(usesDesktopDetail(null), false);
    assert.equal(usesDesktopDetail(undefined), false);
    assert.equal(usesDesktopDetail(Number.NaN), false);
  });
});

describe("optional detail validation", () => {
  it("accepts the new fields on an event and a submission", () => {
    assert.deepEqual(
      eventIssues({
        ...event,
        description: "A fondo on fire roads.",
        moreInfoUrl: "https://example.com/info",
      }),
      []
    );
    assert.deepEqual(
      submissionIssues({
        ...submission,
        description: "",
        moreInfoUrl: "http://example.com/info",
      }),
      []
    );
  });

  it("rejects a long description and a more info URL without http(s)", () => {
    const issues = eventIssues({
      ...event,
      description: "x".repeat(601),
      moreInfoUrl: "ftp://example.com/info",
    });
    assert.ok(issues.includes("description must be 600 characters or fewer"));
    assert.ok(issues.includes("moreInfoUrl must start with http:// or https://"));

    const submitted = submissionIssues({
      ...submission,
      description: "x".repeat(601),
      moreInfoUrl: "example.com",
    });
    assert.ok(submitted.includes("description must be 600 characters or fewer"));
    assert.ok(submitted.includes("moreInfoUrl must start with http:// or https://"));
  });

  it("keeps the existing required fields", () => {
    assert.ok(submissionIssues({ ...submission, name: "", description: "Short" }).includes("name is required"));
    assert.ok(
      submissionIssues({ ...submission, eventDate: "2027-02-31", moreInfoUrl: "https://example.com" }).some((issue) =>
        issue.includes("eventDate")
      )
    );
    assert.ok(eventIssues({ ...event, category: "road", description: "Short" }).some((issue) => issue.includes("category")));
  });

  it("copies description and moreInfoUrl only when they are non-empty", () => {
    const withDetail = submissionRecord({
      ...submission,
      location: "   ",
      description: "  A fondo  ",
      moreInfoUrl: " https://example.com/a ",
    });
    assert.equal(withDetail.description, "A fondo");
    assert.equal(withDetail.moreInfoUrl, "https://example.com/a");
    assert.equal("location" in withDetail, false);

    const plain = submissionRecord({ ...submission, description: "  ", moreInfoUrl: "" });
    assert.equal("description" in plain, false);
    assert.equal("moreInfoUrl" in plain, false);
    assert.equal(plain.name, submission.name);
    assert.equal(plain.category, "Gravel");
  });
});
