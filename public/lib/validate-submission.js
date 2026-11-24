import { CATEGORIES } from "./categories.js";
import { isISODate } from "./validate-event.js";

const LIMITS = {
  name: 120,
  cost: 40,
  location: 80,
};

function requiredText(value, key, max) {
  if (typeof value !== "string" || !value.trim()) return `${key} is required`;
  if (value.trim().length > max) return `${key} must be ${max} characters or fewer`;
  return null;
}

/** Problems with a visitor submission. An id is assigned later, so it is not required. */
export function submissionIssues(body) {
  if (!body || typeof body !== "object") return ["Submission must be an object"];

  const issues = [];
  for (const key of ["name", "cost"]) {
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
  } else if (!CATEGORIES.includes(body.category)) {
    issues.push(`category must be one of: ${CATEGORIES.join(", ")}`);
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

  return issues;
}

/** Trimmed event fields from a valid submission, omitting empty optional values. */
export function submissionRecord(body) {
  const record = {
    name: body.name.trim(),
    eventDate: body.eventDate.trim(),
    registrationDeadline: body.registrationDeadline.trim(),
    cost: body.cost.trim(),
    category: body.category.trim(),
  };
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const registrationUrl = typeof body.registrationUrl === "string" ? body.registrationUrl.trim() : "";
  if (location) record.location = location;
  if (registrationUrl) record.registrationUrl = registrationUrl;
  return record;
}
