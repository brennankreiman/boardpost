import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { citiesForRegion, filterByPlace, regionsFromEvents } from "../public/lib/filter-local.js";

const events = [
  {
    id: "sf",
    name: "Fort Mason Bike Swap",
    city: "San Francisco, CA",
    region: "Bay Area",
    eventDate: "2026-12-05",
  },
  {
    id: "oak",
    name: "Oakland Waterfront Group Ride",
    city: "Oakland, CA",
    region: "bay area",
    eventDate: "2026-12-19",
  },
  {
    id: "pdx",
    name: "Alberta Street Social",
    city: "Portland, OR",
    region: "Pacific Northwest",
    eventDate: "2027-02-06",
  },
  {
    id: "den",
    name: "RiNo Shop Night",
    city: "Denver, CO",
    eventDate: "2027-04-09",
  },
];

describe("local region and city filters", () => {
  it("shows one spelling for a region regardless of capitalization", () => {
    assert.deepEqual(regionsFromEvents(events), ["Bay Area", "Pacific Northwest"]);
  });

  it("shows both Bay Area cities and hides a city with no region", () => {
    assert.deepEqual(
      filterByPlace(events, { region: "Bay Area" })
        .map((event) => event.id)
        .sort(),
      ["oak", "sf"]
    );
    assert.deepEqual(
      filterByPlace(events, { region: "BAY AREA" }).map((event) => event.city).sort(),
      ["Oakland, CA", "San Francisco, CA"]
    );

    const selected = filterByPlace(events, { region: "Pacific Northwest" });
    assert.deepEqual(
      selected.map((event) => event.id),
      ["pdx"]
    );
    assert.equal(
      selected.some((event) => event.id === "den"),
      false
    );
  });

  it("keeps a city with no region visible for All and for that city", () => {
    assert.equal(
      filterByPlace(events, { region: "All" }).some((event) => event.id === "den"),
      true
    );
    assert.deepEqual(
      filterByPlace(events, { city: "Denver, CO" }).map((event) => event.id),
      ["den"]
    );
    assert.deepEqual(
      filterByPlace(events, { city: "san francisco, ca" }).map((event) => event.id),
      ["sf"]
    );
  });

  it("narrows the city list to the selected region", () => {
    assert.deepEqual(citiesForRegion(events, "Bay Area"), ["Oakland, CA", "San Francisco, CA"]);
    assert.equal(citiesForRegion(events, "Pacific Northwest").includes("Denver, CO"), false);
    assert.equal(citiesForRegion(events, "All").includes("Denver, CO"), true);
  });
});
