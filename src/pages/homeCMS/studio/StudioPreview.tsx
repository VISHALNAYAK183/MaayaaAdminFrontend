import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * The preview pane: a real storefront in a frame, sized like a real device.
 *
 * The frame always renders at the true device width and is scaled down with a
 * transform to fit the pane. Shrinking the iframe element instead would be
 * simpler and would also be wrong — the page inside would trip a narrower set
 * of breakpoints and report a layout no customer will ever see.
 */

import type { Device } from "./devices";

const useFitScale = (width: number) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    const measure = () => setScale(Math.min(1, box.clientWidth / width));
    measure();

    // The pane resizes without the window doing anything — the admin sidebar
    // collapses, the rail scrollbar appears — so watch the element itself.
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [width]);

  return { boxRef, scale };
};

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  src: string;
  frameKey: number;
  device: Device;
  ready: boolean;
  /** Something is wrong with the storefront URL itself. */
  invalidBase: boolean;
}

const StudioPreview = ({ iframeRef, src, frameKey, device, ready, invalidBase }: Props) => {
  const { boxRef, scale } = useFitScale(device.width);

  if (invalidBase) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        VITE_STOREFRONT_BASE is not a valid URL, so there is nothing to preview.
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="relative h-full overflow-auto rounded-xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      <div
        className="mx-auto"
        style={{ width: device.width * scale, height: device.height * scale }}
      >
        <iframe
          key={frameKey}
          ref={iframeRef}
          src={src}
          title="Storefront preview"
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="block border-0 bg-white shadow-lg"
        />
      </div>

      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-gray-900/80 px-4 py-2 text-xs font-medium text-white">
            Connecting to the storefront…
          </span>
        </div>
      )}
    </div>
  );
};

export default StudioPreview;
