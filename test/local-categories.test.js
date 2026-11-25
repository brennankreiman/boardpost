import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LOCAL_CATEGORIES, listLocalCategories } from "../public/lib/local-categories.js";

describe("LOCAL_CATEGORIES", () => {
  it("is Bike Swap, Group Ride, and Social Gathering, sorted A→Z", () => {
    assert.deepEqual([...LOCAL_CATEGORIES], ["Bike Swap", "Group Ride", "Social Gathering"]);
    const sorted = [...LOCAL_CATEGORIES].sort((a, b) => a.localeCompare(b));
    assert.deepEqual([...LOCAL_CATEGORIES], sorted);
  });

  it("listLocalCategories returns a sorted copy", () => {
    const listed = listLocalCategories();
    assert.deepEqual(
      listed,
      [...listed].sort((a, b) => a.localeCompare(b))
    );
    listed.push("Other");
    assert.equal(LOCAL_CATEGORIES.includes("Other"), false);
  });
});
