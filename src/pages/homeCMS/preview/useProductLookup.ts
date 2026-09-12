import { useEffect, useRef, useState } from "react";
import { ADMIN_BASE, http } from "../../../api/client";
import type { PreviewProduct } from "./useStorefrontPreview";

/**
 * Resolves the products a draft refers to, for the preview.
 *
 * A product section stores nothing but a productId; the storefront's card wants
 * a name, a price and an image, and on the live page the customer backend joins
 * those in. The studio has to do the same join itself, or every product row
 * previews as an empty carousel.
 *
 * Fetched one id at a time against /products/{id} rather than pulling the
 * catalog: a home page references a handful of products, and the list endpoint
 * is paged, so "fetch everything and filter" would be both heavier and wrong
 * past the first page.
 */

interface RawProduct {
  productId?: number;
  name?: string;
  categoryId?: number | null;
  collectionId?: number | null;
  gender?: string | null;
  basePrice?: number | null;
  discountedPrice?: number | null;
  images?: { url: string; postOrder: number }[];
}

const toPreviewProduct = (raw: RawProduct, id: number): PreviewProduct => {
  const images = [...(raw.images ?? [])].sort((a, b) => a.postOrder - b.postOrder);

  return {
    productId: raw.productId ?? id,
    name: raw.name ?? null,
    categoryId: raw.categoryId ?? null,
    collectionId: raw.collectionId ?? null,
    gender: raw.gender ?? null,
    basePrice: raw.basePrice ?? null,
    discountedPrice: raw.discountedPrice ?? null,
    primaryImage: images[0]?.url ?? null,
  };
};

export const useProductLookup = (ids: number[]) => {
  const [products, setProducts] = useState<Map<number, PreviewProduct>>(new Map());

  /**
   * Ids already fetched or in flight — including ones that failed. A product
   * that 404s (deleted, or a stale id left on an item) must not be re-requested
   * on every keystroke; the reload button is the way back from a transient
   * failure.
   */
  const seen = useRef<Set<number>>(new Set());
  const [pending, setPending] = useState(0);

  const key = ids.join(",");

  useEffect(() => {
    const missing = ids.filter((id) => !seen.current.has(id));
    if (!missing.length) return;

    missing.forEach((id) => seen.current.add(id));
    setPending((n) => n + missing.length);

    let cancelled = false;

    Promise.all(
      missing.map(async (id) => {
        try {
          const raw = await http.get<RawProduct>(
            `${ADMIN_BASE}/products/${id}`,
            "load product"
          );
          return toPreviewProduct(raw ?? {}, id);
        } catch {
          return null;
        }
      })
    ).then((resolved) => {
      if (cancelled) return;
      setPending((n) => Math.max(0, n - missing.length));

      const found = resolved.filter((p): p is PreviewProduct => p !== null);
      if (!found.length) return;

      setProducts((prev) => {
        const next = new Map(prev);
        found.forEach((p) => next.set(p.productId, p));
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // `key` stands in for the array, which is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { products, loading: pending > 0 };
};
