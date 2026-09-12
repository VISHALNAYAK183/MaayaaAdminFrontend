/**
 * Storefront URLs written by the editors.
 *
 * Deliberately free of imports: these are checked by the node script in
 * draft/__checks__, which cannot pull in the API layer (and should not have
 * to, to verify a query string).
 */

/**
 * The storefront filters by numeric category id: /search?categories=3. It reads
 * `categories` and nothing else — a link written as ?category=jeans lands on an
 * unfiltered search page and looks like it worked. So the picker writes the id
 * and builds the link itself rather than letting anyone type one.
 */
export const categoryLink = (categoryId: number): string =>
  `/search?categories=${categoryId}`;
