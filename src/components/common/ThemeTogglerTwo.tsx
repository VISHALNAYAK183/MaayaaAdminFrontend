import { useTheme } from "../../context/ThemeContext";
import { MoonIcon, SunIcon } from "../../layout/shellIcons";

/** Day/night switch for the signed-out screens, which have no top bar. */
export default function ThemeTogglerTwo() {
  const { theme, toggleTheme } = useTheme();
  const night = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      aria-label={night ? "Switch to day" : "Switch to night"}
      className="shell-press inline-flex size-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:border-brand-400"
    >
      {night ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
