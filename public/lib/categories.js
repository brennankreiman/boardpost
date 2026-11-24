/** Event type categories. Always keep alphabetically sorted (A→Z). */
export const CATEGORIES = Object.freeze(
  [
    "Alleycat",
    "Charity",
    "Cycle Messenger",
    "Cyclocross",
    "Gravel",
    "MTB",
    "Other",
    "Road",
    "Track",
  ].slice().sort((a, b) => a.localeCompare(b))
);

export function listCategories() {
  return [...CATEGORIES];
}
