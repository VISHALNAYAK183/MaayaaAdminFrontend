import type { DraftSection } from "../draft/types";
import type { PreviewProduct, PreviewSection } from "./useStorefrontPreview";

/**
 * Turns the draft into the payload the storefront expects.
 *
 * This mirrors DashboardService.getHomeDashboard on the customer backend, and
 * the mirroring is the point: if the studio filtered or ordered differently
 * from the live page, the preview would be a confident lie. Where the two must
 * differ — drafts are visible here and not there — it is a deliberate, labelled
 * choice rather than a drift.
 */

export interface PayloadOptions {
  /** The gender tab being edited. */
  gender: string;
  /** Include DRAFT sections. Off = exactly what a customer sees today. */
  includeDrafts: boolean;
  /** Resolved products for items that reference one. */
  products: Map<number, PreviewProduct>;
}

/**
 * An OTHER viewer is served the Men's curation by the backend, so previewing
 * the Unisex tab shows Men + Unisex. Unisex sections have no page of their own
 * to preview — they appear inside the other two.
 */
export const viewerGenderFor = (tab: string): string => (tab === "OTHER" ? "MALE" : tab);

export const toPreviewPayload = (
  sections: DraftSection[],
  { gender, includeDrafts, products }: PayloadOptions
): PreviewSection[] => {
  const viewer = viewerGenderFor(gender);

  return sections
    .filter((s) => s.status === "ACTIVE" || (includeDrafts && s.status === "DRAFT"))
    // Same rule as the backend: the viewer's own curation plus everything
    // marked unisex, merged into one position-ordered page.
    .filter((s) => s.gender === viewer || s.gender === "OTHER")
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      sectionId: section.sectionId,
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      position: section.position,
      gender: section.gender,
      items: [...section.items]
        .sort((a, b) => a.position - b.position)
        .map((item) => {
          const product = item.productId != null ? products.get(item.productId) ?? null : null;

          return {
            itemId: item.itemId,
            // The backend prefers the product's own first image over whatever
            // the item stored, so a product card never shows a stale banner.
            image: product?.primaryImage ?? item.image,
            heading: item.heading,
            subheading: item.subheading,
            ctaText: item.ctaText,
            link: item.link,
            productId: item.productId,
            categoryId: item.categoryId,
            reviewId: item.reviewId,
            position: item.position,
            product,
          };
        }),
    }));
};

/** Every product id the draft refers to, deduplicated. */
export const referencedProductIds = (sections: DraftSection[]): number[] => {
  const ids = new Set<number>();
  for (const section of sections) {
    for (const item of section.items) {
      if (item.productId != null) ids.add(item.productId);
    }
  }
  return [...ids].sort((a, b) => a - b);
};
