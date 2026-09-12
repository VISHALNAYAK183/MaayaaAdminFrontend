import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useStorefrontPreview,
  type PreviewSection,
} from "./preview/useStorefrontPreview";

/**
 * Dev-only rig for the CMS live-preview channel.
 *
 * It stands in for the studio that Phase 3 will build: hand-written payloads,
 * one button each, so the storefront half of the protocol can be exercised
 * before there is a draft store to feed it. The route is registered only under
 * import.meta.env.DEV and this file goes away once the studio lands.
 *
 * Point it at a storefront that is running the preview bridge — locally that is
 * `npm run dev` in maayaaFrontend on :5173.
 */

// Images are the storefront's own bundled assets, so they resolve against the
// previewed origin and the rig works with no network.
const MEN = "/assets/men_Tshirt.png";
const WOMEN = "/assets/Women_kurthi.png";
const OG = "/assets/og-image.png";

const item = (over: Partial<PreviewSection["items"][number]>): PreviewSection["items"][number] => ({
  itemId: 0,
  image: null,
  heading: null,
  subheading: null,
  ctaText: null,
  link: null,
  productId: null,
  categoryId: null,
  reviewId: null,
  position: 1,
  ...over,
});

const PAYLOAD_A: PreviewSection[] = [
  {
    sectionId: 1,
    type: "HERO",
    title: null,
    subtitle: null,
    position: 1,
    gender: "MALE",
    items: [
      item({ itemId: 11, image: MEN, heading: "NEW ARRIVALS", subheading: "Cotton, cut for the heat", link: "/search?gender=MALE", position: 1 }),
      item({ itemId: 12, image: WOMEN, heading: "FESTIVE EDIT", subheading: "Kurtas that travel well", link: "/search?gender=FEMALE", position: 2 }),
    ],
  },
  {
    sectionId: 2,
    type: "FEATURED_PRODUCTS",
    title: "Featured Products",
    subtitle: "Picked for you",
    position: 2,
    gender: "MALE",
    items: [1, 2, 3, 4].map((n) =>
      item({
        itemId: 20 + n,
        position: n,
        productId: 100 + n,
        product: {
          productId: 100 + n,
          name: `Sample Product ${n}`,
          basePrice: 1499,
          discountedPrice: n % 2 === 0 ? 1199 : 1499,
          primaryImage: n % 2 === 0 ? WOMEN : MEN,
        },
      })
    ),
  },
  {
    sectionId: 3,
    type: "PROMO",
    title: null,
    subtitle: null,
    position: 3,
    gender: "MALE",
    items: [item({ itemId: 31, image: OG, heading: "Free shipping over ₹999", link: "/search", position: 1 })],
  },
  {
    sectionId: 4,
    type: "CATEGORIES",
    title: "Shop by Category",
    subtitle: null,
    position: 4,
    gender: "MALE",
    items: [1, 2, 3, 4, 5].map((n) =>
      item({
        itemId: 40 + n,
        position: n,
        image: n % 2 === 0 ? WOMEN : MEN,
        heading: `Category ${n}`,
        link: "/search",
        categoryId: n,
      })
    ),
  },
  {
    sectionId: 5,
    type: "REVIEWS",
    title: "What customers say",
    subtitle: "Real reviews, real people",
    position: 5,
    gender: "MALE",
    items: [item({ itemId: 51, image: OG, heading: "Reviews", position: 1 })],
  },
];

/**
 * The same draft after three edits — a heading rewritten, the promo dragged
 * above the product row, the categories section deleted. Toggling A/B is the
 * test that the preview repaints from an unsaved change.
 */
const PAYLOAD_B: PreviewSection[] = [
  {
    ...PAYLOAD_A[0],
    items: [
      { ...PAYLOAD_A[0].items[0], heading: "EDITED LIVE — NO SAVE" },
      PAYLOAD_A[0].items[1],
    ],
  },
  { ...PAYLOAD_A[2], position: 2 },
  { ...PAYLOAD_A[1], position: 3 },
  { ...PAYLOAD_A[4], position: 4 },
];

const DEVICES = [
  { label: "Desktop", width: 1280 },
  { label: "Tablet", width: 768 },
  { label: "Mobile", width: 375 },
];

const DEFAULT_BASE = import.meta.env.VITE_STOREFRONT_BASE ?? "http://localhost:5173";

const FRAME_HEIGHT = 760;

/**
 * Measures the space the preview has and returns the factor that fits a frame
 * of `width` into it — never above 1, because blowing a 375px phone up to fill
 * a desktop pane would misreport every line length on the page.
 *
 * The frame itself always renders at the true device width and is scaled with a
 * transform, so the page inside still lays out as a real 1280 / 768 / 375
 * viewport: shrinking the iframe element instead would just trip a different
 * set of breakpoints.
 */
const useFitScale = (width: number) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const available = boxRef.current?.clientWidth ?? width;
      setScale(Math.min(1, available / width));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [width]);

  return { boxRef, scale };
};

const PreviewHarness = () => {
  const [base, setBase] = useState(DEFAULT_BASE);
  const [live, setLive] = useState(base);
  const [width, setWidth] = useState(DEVICES[0].width);
  const [log, setLog] = useState<string[]>([]);

  const note = useCallback((line: string) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [`${stamp}  ${line}`, ...prev].slice(0, 40));
  }, []);

  const onSectionClick = useCallback(
    (sectionId: string) => note(`click  → section ${sectionId}`),
    [note]
  );

  const { iframeRef, src, ready, frameKey, render, select, reload } =
    useStorefrontPreview({ base: live, onSectionClick });

  const { boxRef, scale } = useFitScale(width);

  useEffect(() => {
    note(ready ? "ready  ← storefront handshake" : "waiting for storefront…");
  }, [ready, note]);

  const send = (payload: PreviewSection[], name: string) => {
    render(payload, "MALE");
    note(`render → payload ${name} (${payload.length} sections)`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Dev harness.</strong> Exercises the CMS preview channel before the
        studio exists. Not registered in production builds.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="w-72 rounded border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="http://localhost:5173"
        />
        <button
          onClick={() => { setLive(base); note(`target → ${base}`); }}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
        >
          Load
        </button>

        <span className={`ml-2 rounded-full px-2.5 py-1 text-xs font-medium ${
          ready ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
        }`}>
          {ready ? "connected" : "waiting"}
        </span>

        <span className="ml-auto flex gap-1">
          {DEVICES.map((d) => (
            <button
              key={d.label}
              onClick={() => setWidth(d.width)}
              className={`rounded px-3 py-1.5 text-sm ${
                width === d.width ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => send(PAYLOAD_A, "A")} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
          Render A
        </button>
        <button onClick={() => send(PAYLOAD_B, "B (edited + reordered)")} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
          Render B
        </button>
        <button onClick={() => { select(3); note("select → section 3 (promo)"); }} className="rounded bg-gray-200 px-3 py-1.5 text-sm">
          Select promo
        </button>
        <button onClick={() => { select(5); note("select → section 5 (reviews)"); }} className="rounded bg-gray-200 px-3 py-1.5 text-sm">
          Select reviews
        </button>
        <button onClick={() => { reload(); note("reload iframe"); }} className="rounded bg-gray-200 px-3 py-1.5 text-sm">
          Reload
        </button>
      </div>

      <div className="flex gap-4">
        <div
          ref={boxRef}
          className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3"
        >
          <div style={{ height: FRAME_HEIGHT * scale }}>
            <iframe
              key={frameKey}
              ref={iframeRef}
              src={src}
              title="Storefront preview"
              style={{
                width,
                height: FRAME_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              className="block border-0 bg-white shadow-sm"
            />
          </div>
        </div>
        <pre className="h-[760px] w-72 shrink-0 overflow-auto rounded-lg bg-gray-900 p-3 text-xs leading-5 text-gray-100">
          {log.join("\n") || "no events yet"}
        </pre>
      </div>
    </div>
  );
};

export default PreviewHarness;
