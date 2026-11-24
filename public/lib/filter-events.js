/**
 * Filter and sort cycling events for the board.
 *
 * Default (no from/to): upcoming only (eventDate >= today), soonest first.
 * With from and/or to: honor that range, including past dates.
 */
export function filterEvents(events, { category, q, from, to, today } = {}) {
  let result = Array.isArray(events) ? [...events] : [];
  const hasDateFilter = Boolean(from || to);

  if (!hasDateFilter) {
    if (today) {
      result = result.filter((e) => e.eventDate >= today);
    }
  } else {
    if (from) {
      result = result.filter((e) => e.eventDate >= from);
    }
    if (to) {
      result = result.filter((e) => e.eventDate <= to);
    }
  }

  if (category && category !== "All") {
    result = result.filter((e) => e.category === category);
  }

  if (q) {
    const needle = String(q).toLowerCase();
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        (e.location || "").toLowerCase().includes(needle)
    );
  }

  result.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return result;
}

export function todayISODate(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
