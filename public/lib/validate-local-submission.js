import { optionalDetailFields, optionalDetailIssues } from "./event-detail.js";
import { LOCAL_CATEGORIES } from "./local-categories.js";
import { isISODate } from "./validate-event.js";

const LIMITS = {
  name: 120,
  cost: 40,
  city: 80,
  region: 80,
  location: 80,
};

function requiredText(value, key, max) {
  if (typeof value !== "string" || !value.trim()) return `${key} is required`;
  if (value.trim().length > max) return `${key} must be ${max} characters or fewer`;
  return null;
}

/** Problems with a local-board submission. An id is assigned later, so it is not required. */
export function localSubmissionIssues(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return ["Submission must be an object"];

  const issues = [];
  for (const key of ["name", "cost", "city"]) {
    const issue = requiredText(body[key], key, LIMITS[key]);
    if (issue) issues.push(issue);
  }

  if (typeof body.eventDate !== "string" || !isISODate(body.eventDate)) {
    issues.push("eventDate must be YYYY-MM-DD");
  }
  if (typeof body.registrationDeadline !== "string" || !isISODate(body.registrationDeadline)) {
    issues.push("registrationDeadline must be YYYY-MM-DD");
  }

  if (typeof body.category !== "string" || !body.category.trim()) {
    issues.push("category is required");
  } else if (!LOCAL_CATEGORIES.includes(body.category)) {
    issues.push(`category must be one of: ${LOCAL_CATEGORIES.join(", ")}`);
  }

  if (body.region != null && body.region !== "") {
    if (typeof body.region !== "string" || body.region.trim().length > LIMITS.region) {
      issues.push(`region must be ${LIMITS.region} characters or fewer`);
    }
  }

  if (body.location != null && body.location !== "") {
    if (typeof body.location !== "string" || body.location.trim().length > LIMITS.location) {
      issues.push(`location must be ${LIMITS.location} characters or fewer`);
    }
  }

  if (body.registrationUrl != null && body.registrationUrl !== "") {
    if (typeof body.registrationUrl !== "string" || !/^https?:\/\//i.test(body.registrationUrl.trim())) {
      issues.push("registrationUrl must start with http:// or https://");
    }
  }

  issues.push(...optionalDetailIssues(body));
  return issues;
}

/** Trimmed local event fields, omitting a blank region and other empty optional values. */
export function localSubmissionRecord(body) {
  const record = {
    name: body.name.trim(),
    eventDate: body.eventDate.trim(),
    registrationDeadline: body.registrationDeadline.trim(),
    cost: body.cost.trim(),
    category: body.category.trim(),
    city: body.city.trim(),
  };

  const region = typeof body.region === "string" ? body.region.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const registrationUrl = typeof body.registrationUrl === "string" ? body.registrationUrl.trim() : "";
  if (region) record.region = region;
  if (location) record.location = location;
  if (registrationUrl) record.registrationUrl = registrationUrl;
  Object.assign(record, optionalDetailFields(body));
  return record;
}
