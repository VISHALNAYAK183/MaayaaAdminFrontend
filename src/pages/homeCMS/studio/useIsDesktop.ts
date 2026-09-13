import { useEffect, useState } from "react";

/**
 * True on screens wide enough for the studio.
 *
 * A media query rather than a CSS `hidden` class, because the thing being
 * withheld is an iframe that loads the whole storefront. Hiding it would still
 * download it — over a phone connection, to show nobody anything.
 */
const DESKTOP = "(min-width: 1024px)";

export const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === "undefined" || window.matchMedia(DESKTOP).matches
  );

  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
};
