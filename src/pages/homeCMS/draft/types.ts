import type { HomeSection, SectionItem } from "../../../api/homeCms";

/**
 * The draft model behind the Home CMS.
 *
 * Editing is staged in memory and written only when the merchandiser presses
 * Publish, so arranging a page never touches the live storefront halfway
 * through. Two consequences shape these types:
 *
 *  - a row can exist before it has a database id, so ids widen to string for
 *    the not-yet-published ones (see `isUnsaved`);
 *  - status is carried as a word, not the 'Y' / 'I' / 'D' character the API
 *    reads back, because the write side of the API speaks words and mixing the
 *    two is how an INACTIVE section gets silently republished.
 */

export type SectionStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export type DraftId = number | string;

export interface DraftItem {
  itemId: DraftId;
  image: string | null;
  heading: string | null;
  subheading: string | null;
  ctaText: string | null;
  link: string | null;
  productId: number | null;
  categoryId: number | null;
  reviewId: number | null;
  position: number;
}

export interface DraftSection {
  sectionId: DraftId;
  type: string;
  title: string;
  subtitle: string;
  position: number;
  status: SectionStatus;
  gender: string;
  items: DraftItem[];
}

/** True for a row that exists only in this draft and has no database id yet. */
export const isUnsaved = (id: DraftId): id is string => typeof id === "string";

// ── Status ────────────────────────────────────────────────────────────────────

const STATUS_WORDS: Record<string, SectionStatus> = {
  Y: "ACTIVE",
  I: "INACTIVE",
  D: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DRAFT: "DRAFT",
};

/**
 * Reads whatever the API returned into a word.
 *
 * Anything unrecognised becomes DRAFT on purpose: the storefront shows only
 * 'Y', so a status we cannot account for is already invisible to customers, and
 * guessing ACTIVE would put an unknown row on the live home page.
 */
export const toStatusWord = (raw: unknown): SectionStatus =>
  STATUS_WORDS[String(raw ?? "").toUpperCase()] ?? "DRAFT";

// ── Local ids ─────────────────────────────────────────────────────────────────

let localSeq = 0;
export const nextLocalId = (kind: "section" | "item"): string =>
  `new:${kind}:${++localSeq}`;

// ── Reading the API into a draft ──────────────────────────────────────────────

export const toDraftItem = (item: SectionItem): DraftItem => ({
  itemId: item.itemId,
  image: item.image ?? null,
  heading: item.heading ?? null,
  subheading: item.subheading ?? null,
  ctaText: item.ctaText ?? null,
  link: item.link ?? null,
  productId: item.productId ?? null,
  categoryId: item.categoryId ?? null,
  reviewId: item.reviewId ?? null,
  position: item.position ?? 0,
});

export const toDraftSection = (
  section: HomeSection,
  items: SectionItem[]
): DraftSection => ({
  sectionId: section.sectionId,
  type: section.type,
  title: section.title ?? "",
  subtitle: section.subtitle ?? "",
  position: section.position ?? 0,
  status: toStatusWord(section.status),
  gender: section.gender,
  items: items.map(toDraftItem).sort((a, b) => a.position - b.position),
});

export const byPosition = <T extends { position: number }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => a.position - b.position);
