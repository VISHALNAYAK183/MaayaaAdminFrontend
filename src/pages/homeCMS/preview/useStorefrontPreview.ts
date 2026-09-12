import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * The studio half of the CMS live-preview channel.
 *
 * The storefront is embedded as-is in an iframe and told what to draw over
 * postMessage, so the preview is rendered by the real site's own components
 * rather than by a second set of them living here. The storefront half of this
 * protocol is maayaaFrontend/src/pages/dashboard/previewBridge.js — change one
 * and you change the other.
 *
 * Wire shape below is exactly what GET /api/dashboard/home returns, products
 * already resolved, because that is what the storefront renderers expect. Ids
 * widen to string so a section that has been added but not published yet can
 * carry a local id.
 */

export interface PreviewProduct {
  productId: number;
  name: string | null;
  categoryId?: number | null;
  collectionId?: number | null;
  gender?: string | null;
  basePrice?: number | null;
  discountedPrice?: number | null;
  primaryImage?: string | null;
}

export interface PreviewItem {
  itemId: number | string;
  image: string | null;
  heading: string | null;
  subheading: string | null;
  ctaText: string | null;
  link: string | null;
  productId: number | null;
  categoryId: number | null;
  reviewId: number | null;
  position: number;
  product?: PreviewProduct | null;
}

export interface PreviewSection {
  sectionId: number | string;
  type: string;
  title: string | null;
  subtitle: string | null;
  position: number;
  gender: string | null;
  items: PreviewItem[];
}

const STUDIO_SOURCE = "maayaa-cms-studio";
const PREVIEW_SOURCE = "maayaa-storefront-preview";

export const STOREFRONT_BASE: string =
  import.meta.env.VITE_STOREFRONT_BASE ?? "https://maayaawear.com";

/** Home page of `base`, flagged for preview mode. */
export const previewUrl = (base: string): string => {
  const url = new URL(base);
  url.pathname = "/";
  url.searchParams.set("cmsPreview", "1");
  return url.toString();
};

interface Options {
  /** Storefront origin to embed, e.g. http://localhost:5173 */
  base?: string;
  /** Fired when a section is clicked inside the preview. */
  onSectionClick?: (sectionId: string) => void;
}

export const useStorefrontPreview = ({ base = STOREFRONT_BASE, onSectionClick }: Options = {}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  // Reload remounts the iframe by changing its key, so a fresh frame can be
  // handed the draft again after a storefront-side error.
  const [frameKey, setFrameKey] = useState(0);

  const origin = useMemo(() => {
    try {
      return new URL(base).origin;
    } catch {
      return "";
    }
  }, [base]);

  const src = useMemo(() => {
    try {
      return previewUrl(base);
    } catch {
      return "";
    }
  }, [base]);

  /**
   * The last payload sent, kept so a frame that reloads — or one that finished
   * loading before the draft was ready — can be caught up the moment it
   * announces itself, rather than sitting on a skeleton until the next edit.
   */
  const latest = useRef<{ sections: PreviewSection[]; gender: string | null } | null>(null);

  const post = useCallback(
    (message: Record<string, unknown>) => {
      const frame = iframeRef.current?.contentWindow;
      if (!frame || !origin) return;
      frame.postMessage({ source: STUDIO_SOURCE, ...message }, origin);
    },
    [origin]
  );

  const clickRef = useRef(onSectionClick);
  clickRef.current = onSectionClick;

  useEffect(() => {
    if (!origin) return undefined;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { source?: string; type?: string; sectionId?: string };
      if (!data || data.source !== PREVIEW_SOURCE) return;

      if (data.type === "ready") {
        setReady(true);
        // Answer the handshake with whatever the draft looks like right now.
        if (latest.current) {
          post({ type: "render", ...latest.current });
        }
        return;
      }

      if (data.type === "click" && data.sectionId != null) {
        clickRef.current?.(String(data.sectionId));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, post]);

  /** Draw these sections. Safe to call before the frame is ready. */
  const render = useCallback(
    (sections: PreviewSection[], gender: string | null = null) => {
      latest.current = { sections, gender };
      if (ready) post({ type: "render", sections, gender });
    },
    [post, ready]
  );

  /** Highlight a section in the preview and scroll it into view. */
  const select = useCallback(
    (sectionId: number | string | null) => post({ type: "select", sectionId }),
    [post]
  );

  const reload = useCallback(() => {
    setReady(false);
    setFrameKey((k) => k + 1);
  }, []);

  return { iframeRef, src, origin, ready, frameKey, render, select, reload };
};
