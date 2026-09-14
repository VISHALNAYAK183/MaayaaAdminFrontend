import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Mode = "light" | "dark";
export type Look = "atelier" | "zari";

export const LOOKS: { id: Look; name: string; description: string }[] = [
  { id: "atelier", name: "Atelier", description: "The storefront's cream and gold" },
  { id: "zari", name: "Zari Night", description: "Near-black with a gold thread" },
];

type ThemeContextType = {
  /** Day or night. Named `theme` because that is what existing screens read. */
  theme: Mode;
  look: Look;
  toggleTheme: () => void;
  setLook: (look: Look) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOOK_KEY = "maayaa.look";
const MODE_KEY = "theme";

// index.html has already stamped both attributes before first paint; start from
// them so React's first render agrees with what is on screen.
const initialMode = (): Mode =>
  document.documentElement.getAttribute("data-mode") === "dark" ? "dark" : "light";
const initialLook = (): Look =>
  document.documentElement.getAttribute("data-look") === "zari" ? "zari" : "atelier";

const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage: the choice lasts for this visit.
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Mode>(initialMode);
  const [look, setLookState] = useState<Look>(initialLook);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-mode") === theme && root.getAttribute("data-look") === look) return;

    // Ease the change rather than snap it; the class scopes the transition to
    // this moment so ordinary hovers stay instant.
    root.classList.add("theme-switching");
    root.setAttribute("data-mode", theme);
    root.setAttribute("data-look", look);
    const done = window.setTimeout(() => root.classList.remove("theme-switching"), 320);
    return () => window.clearTimeout(done);
  }, [theme, look]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      store(MODE_KEY, next);
      return next;
    });
  }, []);

  const setLook = useCallback((next: Look) => {
    store(LOOK_KEY, next);
    setLookState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, look, toggleTheme, setLook }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
