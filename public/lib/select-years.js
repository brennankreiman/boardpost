/**
 * Years the board should fetch.
 *
 * No date filter: indexed years from the current year onward.
 * With from and/or to: indexed years whose calendar year overlaps that range.
 */
export function selectYears(years, { from, to, today } = {}) {
  const sorted = [...(Array.isArray(years) ? years : [])]
    .map(Number)
    .filter((year) => Number.isInteger(year))
    .sort((a, b) => a - b);

  if (from || to) {
    return sorted.filter((year) => {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      if (from && end < from) return false;
      if (to && start > to) return false;
      return true;
    });
  }

  const current = Number(String(today ?? "").slice(0, 4));
  if (!Number.isInteger(current)) return [];
  return sorted.filter((year) => year >= current);
}
