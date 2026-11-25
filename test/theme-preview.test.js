import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previewPath = path.join(root, "public/theme-preview.html");
const themesDir = path.join(root, "public/themes");

const THEMES = [
  { id: "frost", label: "2026-12 frost" },
  { id: "ink", label: "2027-01 ink" },
  { id: "clay", label: "2027-02 clay" },
  { id: "win95", label: "2027-03 win95" },
  { id: "grid", label: "2027-04 grid" },
  { id: "bubble", label: "2027-05 bubble" },
  { id: "bleach", label: "2027-06 bleach" },
  { id: "night", label: "2027-07 night" },
  { id: "fair", label: "2027-08 fair" },
  { id: "terminal", label: "2027-09 terminal" },
  { id: "newsprint", label: "2027-10 newsprint" },
  { id: "wool", label: "2027-11 wool" },
  { id: "ice", label: "2027-12 ice" },
  { id: "blueprint", label: "2028-01 blueprint" },
  { id: "riso", label: "2028-02 riso" },
  { id: "earlyweb", label: "2028-03 earlyweb" },
];

describe("monthly theme preview", () => {
  it("lists the 16 monthly looks and a stylesheet for each", async () => {
    const html = await readFile(previewPath, "utf8");
    const entries = await readdir(themesDir);
    const cssFiles = entries.filter((name) => name.endsWith(".css")).sort();

    assert.equal(THEMES.length, 16);
    assert.deepEqual(
      cssFiles,
      THEMES.map((theme) => `${theme.id}.css`).sort()
    );

    for (const theme of THEMES) {
      assert.ok(html.includes(theme.label), `${theme.label} is listed`);
      assert.equal(
        html.match(new RegExp(`data-theme="${theme.id}"`, "g"))?.length,
        2,
        `${theme.id} is shown twice`
      );
      assert.ok(
        html.includes(`themes/${theme.id}.css`),
        `${theme.id} stylesheet is linked`
      );

      const css = await readFile(path.join(themesDir, `${theme.id}.css`), "utf8");
      assert.match(css, new RegExp(`\\[data-theme="${theme.id}"\\]`));
    }
  });
});
