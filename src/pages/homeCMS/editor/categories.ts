/**
 * Category lookups for the editors.
 *
 * Separate from pickers.tsx so that file exports components only — a module
 * that mixes the two loses fast refresh.
 */
import { useEffect, useState } from "react";
import { getCategories, type Category } from "../../../api/adminCategory";


// ─── Category names ──────────────────────────────────────────────────────────

/**
 * Category names for ids already stored on items, so a tile can say "Kurtas"
 * instead of "#3".
 *
 * Cached for the life of the page: the editors mount one of these per section
 * drawer, and the list barely changes while someone arranges a home page.
 */
let cachedCategories: Category[] | null = null;

export const useCategoryNames = (enabled: boolean) => {
  const [names, setNames] = useState<Map<number, string>>(() =>
    new Map((cachedCategories ?? []).map((c) => [c.categoryId as number, c.name]))
  );

  useEffect(() => {
    if (!enabled || cachedCategories) return;

    let cancelled = false;
    getCategories()
      .then((res) => {
        cachedCategories = res.data ?? [];
        if (cancelled) return;
        setNames(new Map(cachedCategories.map((c) => [c.categoryId as number, c.name])));
      })
      .catch(() => {
        // A missing name is cosmetic — the row falls back to the raw id.
      });
    return () => { cancelled = true; };
  }, [enabled]);

  return names;
};
