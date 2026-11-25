/** Problems with optional description and more-info URL. Empty values are allowed. */
export function optionalDetailIssues(body) {
  if (!body || typeof body !== "object") return [];

  const issues = [];
  if (body.description != null && body.description !== "") {
    const description = typeof body.description === "string" ? body.description.trim() : null;
    if (description == null || description.length > 600) {
      issues.push("description must be 600 characters or fewer");
    }
  }

  if (body.moreInfoUrl != null && body.moreInfoUrl !== "") {
    const moreInfoUrl = typeof body.moreInfoUrl === "string" ? body.moreInfoUrl.trim() : null;
    if (moreInfoUrl == null || (moreInfoUrl && !/^https?:\/\//i.test(moreInfoUrl))) {
      issues.push("moreInfoUrl must start with http:// or https://");
    }
  }

  return issues;
}

/** Trimmed description and moreInfoUrl, omitting values that are blank. */
export function optionalDetailFields(body) {
  const fields = {};
  if (!body || typeof body !== "object") return fields;

  if (typeof body.description === "string") {
    const description = body.description.trim();
    if (description) fields.description = description;
  }
  if (typeof body.moreInfoUrl === "string") {
    const moreInfoUrl = body.moreInfoUrl.trim();
    if (moreInfoUrl) fields.moreInfoUrl = moreInfoUrl;
  }
  return fields;
}

function paramsFrom(search) {
  if (typeof search !== "string" || search.length === 0) return new URLSearchParams();
  const withoutHash = search.split("#", 1)[0];
  const queryIndex = withoutHash.indexOf("?");
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : withoutHash;
  return new URLSearchParams(query);
}

/** The `event` query parameter, or null when it is missing or blank. */
export function eventIdFromSearch(search) {
  const id = paramsFrom(search).get("event");
  if (id == null) return null;
  const trimmed = id.trim();
  return trimmed || null;
}

/** Search string with `event` set or removed. Keeps every other parameter. */
export function searchWithEventId(search, id) {
  const params = paramsFrom(search);
  if (id == null || String(id).trim() === "") params.delete("event");
  else params.set("event", String(id).trim());
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Desktop detail is a modal. Narrower viewports expand the row. */
export function usesDesktopDetail(viewportWidth) {
  return typeof viewportWidth === "number" && viewportWidth >= 768;
}
