/** Local event categories. Always keep alphabetically sorted (A→Z). */
export const LOCAL_CATEGORIES = Object.freeze(
  ["Bike Swap", "Group Ride", "Social Gathering"].slice().sort((a, b) => a.localeCompare(b))
);

export function listLocalCategories() {
  return [...LOCAL_CATEGORIES];
}
