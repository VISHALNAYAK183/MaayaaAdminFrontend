/**
 * Shared constants and helpers for the Home CMS editors.
 *
 * Separate from SectionEditor.tsx so that file exports components only — a
 * module that mixes the two loses fast refresh, and these are imported by the
 * studio shell as well as by the editors themselves.
 */
import { CLIENT_API_BASE } from "../../../api/client";

// Resolves a stored image reference for display in the admin. New uploads are
// host-relative "/uploads/<file>" on the customer backend; older rows hold
// absolute URLs or storefront-bundled /assets/ paths and pass through as-is.
export const resolveCmsImage = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${CLIENT_API_BASE}${url}`;
  return url;
};

export const SECTION_TYPES = [
  "HERO", "RECOMMENDED", "FEATURED_PRODUCTS",
  "PROMO", "CATEGORIES", "TRENDING",
  "REVIEWS", "WHY_MAAYAA", "WHY_SHOPWITH_MAAYAA",
];

export const SECTION_LABEL: Record<string, string> = {
  HERO: "Hero Section",
  RECOMMENDED: "Recommended",
  FEATURED_PRODUCTS: "Featured Products",
  PROMO: "Promo",
  CATEGORIES: "Categories",
  TRENDING: "Trending Now",
  REVIEWS: "Reviews",
  WHY_MAAYAA: "Why Maayaa",
  WHY_SHOPWITH_MAAYAA: "Why Shop With Maayaa",
};

export const GENDER_TABS: { key: string; label: string }[] = [
  { key: "MALE", label: "Men" },
  { key: "FEMALE", label: "Women" },
  { key: "OTHER", label: "Unisex" },
];
