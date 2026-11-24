import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, listCategories } from "../lib/categories.js";

describe("CATEGORIES", () => {
  it("is sorted alphabetically A→Z", () => {
    const sorted = [...CATEGORIES].sort((a, b) => a.localeCompare(b));
    assert.deepEqual([...CATEGORIES], sorted);
  });

  it("listCategories returns a sorted copy", () => {
    const listed = listCategories();
    assert.deepEqual(
      listed,
      [...listed].sort((a, b) => a.localeCompare(b))
    );
  });
});
