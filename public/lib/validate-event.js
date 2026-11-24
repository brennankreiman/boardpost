import { CATEGORIES } from "./categories.js";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value) {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Field problems for one event object. Empty array means the event is valid. */
export function eventIssues(event) {
  const issues = [];

  if (!event || typeof event !== "object") {
    return ["event must be an object"];
  }

  for (const key of ["id", "name", "eventDate", "registrationDeadline", "cost", "category"]) {
    if (typeof event[key] !== "string" || !event[key].trim()) {
      issues.push(`${key} is required`);
    }
  }

  if (typeof event.eventDate === "string" && event.eventDate && !isISODate(event.eventDate)) {
    issues.push("eventDate must be YYYY-MM-DD");
  }

  if (
    typeof event.registrationDeadline === "string" &&
    event.registrationDeadline &&
    !isISODate(event.registrationDeadline)
  ) {
    issues.push("registrationDeadline must be YYYY-MM-DD");
  }

  if (typeof event.category === "string" && event.category && !CATEGORIES.includes(event.category)) {
    issues.push(`category must be one of: ${CATEGORIES.join(", ")}`);
  }

  if (event.registrationUrl != null && event.registrationUrl !== "") {
    if (typeof event.registrationUrl !== "string" || !/^https?:\/\//i.test(event.registrationUrl.trim())) {
      issues.push("registrationUrl must start with http:// or https://");
    }
  }

  return issues;
}
