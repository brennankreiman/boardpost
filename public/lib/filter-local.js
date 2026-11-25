/** Trim, collapse whitespace, and lowercase a city or region tag. */
export function normalizePlace(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** One display spelling per tag, in locale order. The first spelling wins. */
export function canonicalPlaces(values) {
  const first = new Map();
  for (const value of values) {
    const display = String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const key = display.toLowerCase();
    if (!key) continue;
    if (!first.has(key)) first.set(key, display);
  }
  return [...first.values()].sort((a, b) => a.localeCompare(b));
}

export function regionsFromEvents(events) {
  const list = Array.isArray(events) ? events : [];
  return canonicalPlaces(list.map((event) => event?.region));
}

/** Cities on the loaded events. A chosen region keeps only cities in that region. */
export function citiesForRegion(events, region) {
  const list = Array.isArray(events) ? events : [];
  const regionKey = normalizePlace(region);
  const scoped =
    !regionKey || regionKey === "all"
      ? list
      : list.filter((event) => normalizePlace(event?.region) === regionKey);
  return canonicalPlaces(scoped.map((event) => event?.city));
}

/**
 * City and region filters. "All" or blank skips that filter.
 * A specific region hides events that have no region.
 * A city matches that city, including when the event has no region.
 */
export function filterByPlace(events, { region, city } = {}) {
  let result = Array.isArray(events) ? [...events] : [];
  const regionKey = normalizePlace(region);
  const cityKey = normalizePlace(city);

  if (regionKey && regionKey !== "all") {
    result = result.filter((event) => normalizePlace(event?.region) === regionKey);
  }
  if (cityKey && cityKey !== "all") {
    result = result.filter((event) => normalizePlace(event?.city) === cityKey);
  }
  return result;
}

/** Search name, venue, city, and region. */
export function matchesLocalQuery(event, q) {
  const needle = String(q ?? "")
    .trim()
    .toLowerCase();
  if (!needle) return true;
  return [event?.name, event?.location, event?.city, event?.region].some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(needle)
  );
}
