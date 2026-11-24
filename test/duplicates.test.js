import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findDuplicates, normalizeName, normalizeUrl } from "../public/lib/duplicates.js";

function event(overrides) {
  return {
    id: "evt",
    name: "Sea Otter Classic",
    eventDate: "2027-04-18",
    registrationUrl: "https://www.seaotterclassic.com/",
    ...overrides,
  };
}

describe("normalizeName", () => {
  it("trims, collapses whitespace, and lowercases", () => {
    assert.equal(normalizeName("  Sea   Otter "), "sea otter");
  });
});

describe("normalizeUrl", () => {
  it("lowercases the host, drops a trailing slash, the fragment, and tracking params", () => {
    assert.equal(
      normalizeUrl("HTTPS://WWW.SeaOtterClassic.com/race/?utm_source=board&gclid=abc&fbclid=1#top"),
      "www.seaotterclassic.com/race"
    );
  });

  it("keeps a non-tracking query and treats http and https as the same event", () => {
    assert.equal(
      normalizeUrl("http://example.com/ride?id=9"),
      normalizeUrl("https://example.com/ride?id=9")
    );
  });

  it("returns null for an empty value", () => {
    assert.equal(normalizeUrl(""), null);
    assert.equal(normalizeUrl(undefined), null);
  });
});

describe("findDuplicates", () => {
  it("matches the same name and date after case and whitespace changes", () => {
    const found = findDuplicates([
      event({ id: "a", name: "Sea Otter" }),
      event({ id: "b", name: "  sea   otter ", registrationUrl: "" }),
    ]);
    assert.deepEqual(found, [{ match: "name", id: "b", otherId: "a" }]);
  });

  it("allows the same name on a different day", () => {
    const found = findDuplicates([
      event({ id: "a", name: "Sea Otter", eventDate: "2027-04-18" }),
      event({ id: "b", name: "Sea Otter", eventDate: "2028-04-18", registrationUrl: "https://example.com/other" }),
    ]);
    assert.deepEqual(found, []);
  });

  it("matches the same registration URL and date after normalization", () => {
    const found = findDuplicates([
      event({ id: "a", name: "One", registrationUrl: "https://www.seaotterclassic.com/" }),
      event({
        id: "b",
        name: "Two",
        registrationUrl: "https://www.seaotterclassic.com/?utm_medium=email",
      }),
    ]);
    assert.deepEqual(found, [{ match: "url", id: "b", otherId: "a" }]);
  });

  it("allows the same URL on a different day", () => {
    const found = findDuplicates([
      event({ id: "a", eventDate: "2026-10-12", registrationUrl: "https://www.usacycling.org/" }),
      event({ id: "b", name: "Other", eventDate: "2027-06-12", registrationUrl: "https://www.usacycling.org/" }),
    ]);
    assert.deepEqual(found, []);
  });

  it("does not treat two events without a URL as a URL match", () => {
    const found = findDuplicates([
      event({ id: "a", name: "Morning", registrationUrl: undefined }),
      event({ id: "b", name: "Evening", registrationUrl: "" }),
    ]);
    assert.deepEqual(found, []);
  });
});
