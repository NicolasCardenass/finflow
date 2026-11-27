type QueryValue = string | number | boolean | null | undefined;

/** Build "?a=1&b=2" from an object, skipping empty values. Returns "" when nothing is left. */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Page numbers to show in a paginator, with `null` for gaps:
 * page 6 of 12 → [1, null, 5, 6, 7, null, 12].
 */
export function pageWindow(page: number, totalPages: number, radius = 1): (number | null)[] {
  const pages: (number | null)[] = [];
  for (let n = 1; n <= totalPages; n++) {
    const edge = n === 1 || n === totalPages;
    if (edge || Math.abs(n - page) <= radius) pages.push(n);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}
