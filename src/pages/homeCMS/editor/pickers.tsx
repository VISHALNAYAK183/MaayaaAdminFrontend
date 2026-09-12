/**
 * Pickers for the two fields that are ids in the database and names on the
 * screen: which product a card shows, and which category a tile links to.
 *
 * Typing a raw id into those fields is how a home page ends up advertising a
 * deleted product or linking to a category that was renamed — neither shows up
 * until a customer taps it. These read the catalogue instead.
 */
import { useEffect, useState } from "react";
import { ADMIN_BASE, http } from "../../../api/client";
import type { Category } from "../../../api/adminCategory";
import { getCategories } from "../../../api/adminCategory";
import { GENDER_TABS } from "./shared";

const ImagePlaceholderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ─── PRODUCT PICKER MODAL ────────────────────────────────────────────────────
/**
 * What the picker needs from a catalogue row. Deliberately a subset of the
 * product API's response: the modal shows a thumbnail, a name and a price, and
 * hands the chosen row back for the caller to copy onto an item.
 */
export interface PickerProduct {
  productId: number;
  name: string;
  gender?: string;
  categoryId?: number | null;
  basePrice?: number;
  discountedPrice?: number;
  images?: { url: string; postOrder?: number }[];
}

export interface ProductPickerProps {
  onSelect: (product: PickerProduct) => void;
  onClose: () => void;
  existingProductIds: number[];
}

export const ProductPickerModal = ({ onSelect, onClose, existingProductIds }: ProductPickerProps) => {
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search input — reset to page 1 when query changes
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
        if (debouncedSearch) params.append("name", debouncedSearch);
        const data = await http.get<PickerProduct[]>(
          `${ADMIN_BASE}/products?${params}`,
          "load products"
        );
        setProducts(Array.isArray(data) ? data : []);
      } catch { setProducts([]); }
      finally { setLoading(false); }
    };
    load();
  }, [page, debouncedSearch]);

  const filtered = products; // filtering is now server-side

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Add Product</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Select a product to add to this section</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading products...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p className="text-sm text-gray-400">No products found</p>
              {search && <button onClick={() => setSearch("")} className="text-xs text-gray-500 underline">Clear search</button>}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const img = p.images?.[0]?.url;
                // Both columns are nullable in the catalogue, and a product
                // saved without a discount used to make this NaN%.
                const base = p.basePrice ?? 0;
                const sale = p.discountedPrice ?? base;
                const discount = base > sale ? Math.round(((base - sale) / base) * 100) : 0;
                const alreadyAdded = existingProductIds.includes(p.productId);
                return (
                  <button
                    key={p.productId}
                    onClick={() => !alreadyAdded && onSelect(p)}
                    disabled={alreadyAdded}
                    className={`w-full flex items-center gap-4 px-6 py-3.5 transition-colors text-left group ${alreadyAdded ? "opacity-40 cursor-not-allowed bg-gray-50/50" : "hover:bg-gray-50 cursor-pointer"}`}
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImagePlaceholderIcon />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">#{p.productId}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">{GENDER_TABS.find((t) => t.key === p.gender)?.label ?? p.gender}</span>
                        {p.categoryId && (
                          <>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">Cat {p.categoryId}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">₹{sale.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {base > sale && (
                          <span className="text-[10px] text-gray-400 line-through">₹{base.toLocaleString()}</span>
                        )}
                        {discount > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{discount}%</span>
                        )}
                      </div>
                    </div>

                    {/* Arrow / Added badge */}
                    {alreadyAdded ? (
                      <span className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Added</span>
                    ) : (
                      <svg className="shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""} · Page {page}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-[11px] px-3 py-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors font-medium text-gray-600"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={products.length < limit}
              className="flex items-center gap-1 text-[11px] px-3 py-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors font-medium text-gray-600"
            >
              Next
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CATEGORY PICKER MODAL ───────────────────────────────────────────────────



export interface CategoryPickerProps {
  /** Highlighted as the current choice. */
  selectedId?: number | null;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export const CategoryPickerModal = ({ selectedId, onSelect, onClose }: CategoryPickerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    // The whole list, unpaged: this endpoint returns every category and a store
    // has tens of them, not thousands. Filtering happens in the box below.
    getCategories()
      .then((res) => {
        if (cancelled) return;
        setCategories(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? categories.filter((c) => (c.name ?? "").toLowerCase().includes(term))
    : categories;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Link to category</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Sets the tile's link to that category's search page</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading categories...</p>
            </div>
          ) : failed ? (
            <p className="py-14 text-center text-sm text-gray-400">Could not load categories.</p>
          ) : filtered.length === 0 ? (
            <p className="py-14 text-center text-sm text-gray-400">
              {categories.length ? "No categories match that." : "No categories yet."}
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((c) => {
                const current = c.categoryId === selectedId;
                return (
                  <button
                    key={c.categoryId}
                    onClick={() => onSelect(c)}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                      current ? "bg-blue-50/70" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        #{c.categoryId}
                        {c.description ? ` · ${c.description}` : ""}
                      </p>
                    </div>
                    {current && (
                      <span className="text-[10px] font-semibold text-blue-600 shrink-0">Current</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

