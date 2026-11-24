const TRACKING_PARAMS = new Set(["gclid", "fbclid"]);

/** Trim, collapse whitespace, and lowercase. */
export function normalizeName(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Host (lowercase) + path without a trailing slash + remaining query.
 * Drops the fragment and tracking params. http and https match.
 * Returns null when the value is empty or not an http(s) URL.
 */
export function normalizeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  const params = [];

  for (const [key, paramValue] of url.searchParams.entries()) {
    const lower = key.toLowerCase();
    if (lower.startsWith("utm_") || TRACKING_PARAMS.has(lower)) continue;
    params.push([key, paramValue]);
  }

  params.sort((a, b) => a[0].localeCompare(b[0]) || String(a[1]).localeCompare(String(b[1])));

  const query = params
    .map(([key, paramValue]) => `${encodeURIComponent(key)}=${encodeURIComponent(paramValue)}`)
    .join("&");

  return `${host}${path}${query ? `?${query}` : ""}`;
}

/**
 * Pairs that share a normalized name and event date, or a normalized
 * registration URL and event date. A different day is not a duplicate.
 */
export function findDuplicates(events) {
  const byName = new Map();
  const byUrl = new Map();
  const found = [];

  for (const event of Array.isArray(events) ? events : []) {
    const nameKey = `${normalizeName(event.name)}\0${event.eventDate}`;
    if (byName.has(nameKey)) {
      found.push({ match: "name", id: event.id, otherId: byName.get(nameKey) });
    } else {
      byName.set(nameKey, event.id);
    }

    const urlKey = normalizeUrl(event.registrationUrl);
    if (!urlKey) continue;

    const urlDate = `${urlKey}\0${event.eventDate}`;
    if (byUrl.has(urlDate)) {
      found.push({ match: "url", id: event.id, otherId: byUrl.get(urlDate) });
    } else {
      byUrl.set(urlDate, event.id);
    }
  }

  return found;
}
