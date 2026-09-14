import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { LOOKS, useTheme } from "../context/ThemeContext";
import { usePopover } from "../hooks/usePopover";
import { useReadOnly } from "../hooks/useReadOnly";
import { ROLE_LABELS, isRole } from "../config/roles";
import { InboxRow, badgeCount, byUrgency } from "./InboxRow";
import SearchPalette from "./SearchPalette";
import { BellIcon, CheckIcon, LogoutIcon, MoonIcon, SearchIcon, SunIcon } from "./shellIcons";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The only chrome in the panel: wordmark, search, day/night, the bell and the
 * account menu. It floats over the page as a translucent layer rather than
 * taking a strip of its own, and every page is reached from search or from the
 * landing page instead of a sidebar.
 */
export default function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K anywhere, and "/" when not typing into something.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="shell-bar sticky top-0 z-40">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[auto_auto] items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 md:grid-cols-[auto_minmax(0,560px)_auto] md:gap-6 md:px-6">
        <Link to="/" className="flex items-baseline gap-2.5 whitespace-nowrap text-gray-900" aria-label="Maayaa Admin, dashboard">
          <span className="maayaa-mark text-[17.5px] leading-none">MAAYAA</span>
          <span className="hidden text-[11.2px] tracking-wide text-gray-500 sm:inline">Admin</span>
        </Link>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-haspopup="dialog"
          className="shell-press col-span-2 row-start-2 flex h-10 w-full items-center gap-2.5 rounded-full border border-gray-200 bg-white pl-3 pr-2 text-left text-gray-500 hover:border-brand-400 hover:text-gray-700 md:col-span-1 md:row-start-auto"
        >
          <SearchIcon />
          <span className="min-w-0 flex-1 truncate text-sm">Search pages, orders, products, customers</span>
          <kbd className="shell-num hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-500 sm:inline">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>

        <div className="flex items-center justify-end gap-1.5">
          <ModeButton />
          <Bell />
          <ProfileMenu />
        </div>
      </div>

      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

function ModeButton() {
  const { theme, toggleTheme } = useTheme();
  const night = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={night ? "Switch to day" : "Switch to night"}
      title={night ? "Switch to day" : "Switch to night"}
      className="shell-press grid size-10 place-items-center rounded-full text-gray-700 hover:bg-brand-50 hover:text-gray-900"
    >
      {night ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function Bell() {
  const { items, loading, failed, refresh, markRead } = useInbox();
  const readOnly = useReadOnly();
  const pop = usePopover();
  const [markFailed, setMarkFailed] = useState(false);

  const sorted = byUrgency(items);
  const work = sorted.filter((i) => i.kind === "WORK");
  const alerts = sorted.filter((i) => i.kind === "ALERT");
  const total = badgeCount(items);

  const read = async (list: typeof items) => {
    setMarkFailed(false);
    const ok = await markRead(list);
    if (!ok) setMarkFailed(true);
  };

  return (
    <div className="relative">
      <button
        ref={pop.buttonRef}
        type="button"
        onClick={() => {
          if (!pop.open) refresh();
          pop.toggle();
        }}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        aria-label={total > 0 ? `Needs you: ${total} waiting` : "Needs you: nothing waiting"}
        className={`shell-press relative grid size-10 place-items-center rounded-full text-gray-700 hover:bg-brand-50 hover:text-gray-900 ${pop.open ? "bg-brand-50 text-gray-900" : ""}`}
      >
        <BellIcon />
        {total > 0 && (
          <span className="shell-num absolute right-0 top-0.5 min-w-[18px] rounded-full bg-brand-500 px-1 text-center text-[11px] font-semibold leading-[18px] text-white shadow-[0_0_0_2px_var(--color-gray-50)]">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {pop.open && (
        <div
          ref={pop.panelRef}
          role="dialog"
          aria-label="Needs you"
          className="shell-pop absolute right-[-52px] top-[calc(100%+10px)] z-50 flex max-h-[min(640px,calc(100vh-90px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden sm:right-0"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-gray-200 px-4 pb-3 pt-4">
            <div>
              <h2 className="text-[17.5px] font-semibold leading-tight tracking-tight text-gray-900">Needs you</h2>
              <p className="mt-0.5 text-xs text-gray-500">Work leaves this list once it's done.</p>
            </div>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={() => read(alerts)}
                className="shell-press rounded px-1.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
              >
                Mark alerts read
              </button>
            )}
          </div>

          <div className="grid gap-0.5 overflow-y-auto overscroll-contain p-2">
            {markFailed && (
              <p className="mx-2 my-1 rounded-lg bg-error-50 px-3 py-2 text-xs text-error-700">
                That couldn't be marked read. Try again.
              </p>
            )}
            {loading && items.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">Checking what's waiting…</p>}
            {!loading && failed && items.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-gray-500">
                What's waiting could not be loaded.{" "}
                <button type="button" onClick={refresh} className="font-semibold text-brand-600 underline-offset-2 hover:underline">
                  Try again
                </button>
              </p>
            )}
            {!loading && !failed && items.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-gray-500">Nothing is waiting on you.</p>
            )}

            {alerts.length > 0 && <GroupLabel label="Alerts" count={alerts.length} />}
            {alerts.map((item) => (
              <InboxRow key={item.key} item={item} readOnly={readOnly} onNavigate={() => pop.close(false)} onMarkRead={(i) => read([i])} />
            ))}
            {work.length > 0 && <GroupLabel label="To do" count={work.reduce((n, i) => n + i.count, 0)} />}
            {work.map((item) => (
              <InboxRow key={item.key} item={item} readOnly={readOnly} onNavigate={() => pop.close(false)} onMarkRead={(i) => read([i])} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-3">
      <span className="shell-label">{label}</span>
      <span className="shell-label shell-num">{count}</span>
    </div>
  );
}

function ProfileMenu() {
  const { username, role, signOut } = useAuth();
  const { look, setLook } = useTheme();
  const navigate = useNavigate();
  const pop = usePopover();
  const initial = username?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="relative">
      <button
        ref={pop.buttonRef}
        type="button"
        onClick={pop.toggle}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        aria-label="Account"
        className="shell-press rounded-full border border-gray-200 bg-white p-[3px] hover:border-brand-400"
      >
        <span className="maayaa-mark grid size-[34px] place-items-center rounded-full bg-gray-900 text-sm tracking-[0.04em] text-gray-50">
          {initial}
        </span>
      </button>

      {pop.open && (
        <div ref={pop.panelRef} role="menu" className="shell-pop absolute right-0 top-[calc(100%+10px)] z-50 w-64 p-2">
          <div className="mb-1 border-b border-gray-200 px-2 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-gray-900">{username ?? "Admin"}</p>
            <p className="text-xs text-gray-500">{isRole(role) ? ROLE_LABELS[role] : "Admin"}</p>
          </div>

          <p className="shell-label px-2 pb-1 pt-2">Look</p>
          {LOOKS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={look === option.id}
              onClick={() => setLook(option.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-brand-50"
            >
              <LookSwatch id={option.id} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-900">{option.name}</span>
                <span className="block text-xs text-gray-500">{option.description}</span>
              </span>
              {look === option.id && <CheckIcon className="size-4 text-brand-600" />}
            </button>
          ))}

          <div className="mt-1 border-t border-gray-200 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                pop.close(false);
                // Local only: the backend is stateless with no logout endpoint,
                // so this ends the session in this browser and nowhere else.
                signOut();
                navigate("/signin", { replace: true });
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-error-700 hover:bg-error-50"
            >
              <LogoutIcon className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A thumbnail of each look, drawn in its own fixed colours so the two can be compared. */
function LookSwatch({ id }: { id: "atelier" | "zari" }) {
  const atelier = id === "atelier";
  return (
    <span
      aria-hidden="true"
      className="relative grid size-9 shrink-0 place-items-center overflow-hidden"
      style={{
        background: atelier ? "#F5F0E8" : "#0C0B0A",
        borderRadius: atelier ? 10 : 4,
        border: `1px solid ${atelier ? "#E9E5DC" : "#2A2622"}`,
      }}
    >
      <span className="block h-1 w-5 rounded-full" style={{ background: atelier ? "#B8913F" : "#D8B25E" }} />
    </span>
  );
}
