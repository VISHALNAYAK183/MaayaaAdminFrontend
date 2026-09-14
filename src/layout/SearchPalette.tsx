import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { searchAdmin, type SearchResults } from "../api/overviewApi";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../config/roles";
import { pagesFor, type SectionPage } from "../config/sections";
import { rupees } from "../lib/format";
import { PageIcon, ReceiptIcon, SearchIcon, TagIcon, UserIcon } from "./shellIcons";

type Result = {
  id: string;
  group: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
};

const RECENT_KEY = "maayaa.recentPages";

const ORDER_STATUS: Record<string, string> = {
  REQUESTED: "Awaiting call",
  PLACED: "To ship",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

const readRecent = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
};

const remember = (path: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([path, ...readRecent().filter((p) => p !== path)].slice(0, 4)));
  } catch {
    // Recents are a convenience; without storage the palette still works.
  }
};

const pageResult = (page: SectionPage, group: string): Result => ({
  id: `page:${page.path}`,
  group,
  icon: <PageIcon />,
  title: page.name,
  subtitle: page.description,
  meta: page.group,
  href: page.path,
});

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-brand-100 px-px text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Jump anywhere: pages by name, and orders, customers and products the role
 * can open. Pages match as you type; records are asked of the server once
 * there are two characters to go on.
 */
export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);

  const pages = useMemo(() => pagesFor(role), [role]);
  const searchesRecords = canAccess(role, "/orders") || canAccess(role, "/products");

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  // Records: debounced, and a slower answer never replaces a newer one.
  useEffect(() => {
    const q = query.trim();
    setRemoteFailed(false);
    if (!searchesRecords || q.length < 2) {
      setRemote(null);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchAdmin(q, ctrl.signal)
        .then((r) => setRemote(r))
        .catch((err) => {
          if (!ctrl.signal.aborted && err?.name !== "CanceledError") {
            setRemote(null);
            setRemoteFailed(true);
          }
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, searchesRecords]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recent = readRecent()
        .map((path) => pages.find((p) => p.path === path))
        .filter((p): p is SectionPage => !!p);
      const rest = pages.filter((p) => !recent.includes(p));
      return [...recent.map((p) => pageResult(p, "Recent")), ...rest.map((p) => pageResult(p, "Jump to"))];
    }

    const out: Result[] = pages
      .filter((p) => `${p.name} ${p.keywords ?? ""} ${p.group}`.toLowerCase().includes(q))
      .map((p) => pageResult(p, "Pages"));

    if (remote) {
      for (const o of remote.orders) {
        out.push({
          id: `order:${o.orderId}`,
          group: "Orders",
          icon: <ReceiptIcon />,
          title: `#${o.orderId}`,
          subtitle: [o.customerName, o.status ? ORDER_STATUS[o.status] ?? o.status : null].filter(Boolean).join(" · "),
          meta: rupees(o.amount),
          href: `/orders/${o.orderId}`,
        });
      }
      for (const c of remote.customers) {
        out.push({
          id: `customer:${c.userId}`,
          group: "Customers",
          icon: <UserIcon />,
          title: c.name || c.email || `Customer ${c.userId}`,
          subtitle: c.email ?? "",
          meta: c.phone ?? "",
          href: `/customers/${c.userId}`,
        });
      }
      for (const p of remote.products) {
        out.push({
          id: `product:${p.productId}`,
          group: "Products",
          icon: <TagIcon />,
          title: p.name,
          subtitle: p.live ? "Live on the shop" : "Hidden from the shop",
          meta: p.price != null ? rupees(p.price) : "",
          href: `/products?q=${encodeURIComponent(p.name)}`,
        });
      }
    }
    return out;
  }, [query, pages, remote]);

  useEffect(() => setActive(0), [query, remote]);

  const choose = (result: Result | undefined) => {
    if (!result) return;
    if (result.id.startsWith("page:")) remember(result.href);
    onClose();
    navigate(result.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    }
  };

  const scope = canAccess(role, "/orders") && canAccess(role, "/products")
    ? "Pages, orders, customers and products"
    : canAccess(role, "/orders")
      ? "Pages, orders and customers"
      : canAccess(role, "/products")
        ? "Pages and products"
        : "Pages";

  let lastGroup = "";

  return createPortal(
    <div
      className="shell-scrim fixed inset-0 z-[60] flex items-start justify-center px-4 pb-4 pt-[12vh]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="shell-pop shell-palette flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-gray-200 px-4 text-gray-500">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “ret”, “10482”, “kurti” or a phone number"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[17px] tracking-tight text-gray-900 outline-none placeholder:text-gray-400"
          />
          <kbd className="shell-num rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px]">esc</kbd>
        </div>

        <div id={listId} role="listbox" className="overflow-y-auto overscroll-contain p-2">
          {results.map((r, i) => {
            const heading = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={r.id}>
                {heading && <div className="shell-label px-2 pb-1 pt-2.5">{heading}</div>}
                <button
                  id={`${listId}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onPointerMove={() => i !== active && setActive(i)}
                  onClick={() => choose(r)}
                  className={`grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 text-left ${i === active ? "bg-brand-50" : ""}`}
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-700">{r.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      <Highlight text={r.title} query={query} />
                    </span>
                    {r.subtitle && (
                      <span className="block truncate text-xs text-gray-500">
                        <Highlight text={r.subtitle} query={query} />
                      </span>
                    )}
                  </span>
                  <span className="shell-num whitespace-nowrap text-xs text-gray-500">{r.meta}</span>
                </button>
              </div>
            );
          })}

          {results.length === 0 && !searching && (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              {remoteFailed ? "Search could not reach the server. Pages still match as you type." : `Nothing matches “${query.trim()}”.`}
            </p>
          )}
          {searching && <p className="px-3 py-2 text-xs text-gray-500">Searching orders, customers and products…</p>}
        </div>

        <div className="flex flex-wrap gap-4 border-t border-gray-200 px-4 py-2.5 text-xs text-gray-500">
          <span>↑ ↓ to move</span>
          <span>↵ to open</span>
          <span className="ml-auto">{scope}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
