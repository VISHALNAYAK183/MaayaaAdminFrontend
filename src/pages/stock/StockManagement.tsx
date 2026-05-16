import { useEffect, useMemo, useState } from "react";
import { getStockManagement, updateStock, StockRow } from "../../api/stockApi";
import { getSizes, Size } from "../../api/adminSize";
import { getColors, Color } from "../../api/adminColor";

const LOW_STOCK_THRESHOLD = 5;   // mirrors backend StockManagementService.lowStock rule

export default function StockManagement() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [sizes, setSizes] = useState<Record<number, string>>({});
  const [colors, setColors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW" | "OUT">("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const [stockRes, sizeRes, colorRes] = await Promise.all([
        getStockManagement(),
        getSizes(),
        getColors(),
      ]);

      const sizeMap: Record<number, string> = {};
      (sizeRes.data ?? []).forEach((s: Size) => {
        if (s.sizeId != null) sizeMap[s.sizeId] = s.label;
      });

      const colorMap: Record<number, string> = {};
      (colorRes.data ?? []).forEach((c: Color) => {
        if (c.colorId != null) colorMap[c.colorId] = c.name;
      });

      setSizes(sizeMap);
      setColors(colorMap);
      setRows(stockRes.data?.data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "LOW" && !r.lowStock) return false;
      if (filter === "OUT" && r.quantity > 0) return false;
      if (q && !r.productName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filter]);

  const handleDraftChange = (variantId: number, value: string) => {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) {
      setDrafts((d) => ({ ...d, [variantId]: Math.floor(n) }));
    }
  };

  const handleSave = async (row: StockRow) => {
    const next = drafts[row.variantId];
    if (next == null || next === row.quantity) return;
    setSaving(row.variantId);
    try {
      await updateStock(row.variantId, next);
      setRows((rs) =>
        rs.map((r) =>
          r.variantId === row.variantId
            ? { ...r, quantity: next, lowStock: next <= LOW_STOCK_THRESHOLD }
            : r
        )
      );
      setDrafts((d) => {
        const copy = { ...d };
        delete copy[row.variantId];
        return copy;
      });
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to update stock");
    } finally {
      setSaving(null);
    }
  };

  const counts = useMemo(
    () => ({
      total: rows.length,
      low: rows.filter((r) => r.lowStock).length,
      out: rows.filter((r) => r.quantity === 0).length,
    }),
    [rows]
  );

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Home / Stock Management · {counts.total} variant{counts.total === 1 ? "" : "s"} ·
            <span className="text-amber-600 dark:text-amber-400 ml-1">{counts.low} low</span> ·
            <span className="text-red-600 dark:text-red-400 ml-1">{counts.out} out</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Search product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(["ALL", "LOW", "OUT"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {f === "ALL" ? "All" : f === "LOW" ? "Low stock" : "Out of stock"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              {["Product", "Size", "Color", "Stock", "", "Save"].map((h, i) => (
                <th
                  key={i}
                  className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 px-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="py-4 px-5">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">
                  No variants matching your filters
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const draft = drafts[row.variantId];
                const dirty = draft != null && draft !== row.quantity;
                const isBusy = saving === row.variantId;

                return (
                  <tr
                    key={row.variantId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="py-3 px-5 text-sm text-gray-900 dark:text-white truncate max-w-[260px]">
                      {row.productName}
                      <span className="block text-[11px] text-gray-400">#{row.productId} · variant {row.variantId}</span>
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-700 dark:text-gray-300">
                      {row.sizeId != null ? sizes[row.sizeId] ?? `#${row.sizeId}` : "—"}
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-700 dark:text-gray-300">
                      {row.colorId != null ? colors[row.colorId] ?? `#${row.colorId}` : "—"}
                    </td>
                    <td className="py-3 px-5">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={draft ?? row.quantity}
                        onChange={(e) => handleDraftChange(row.variantId, e.target.value)}
                        className="w-24 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </td>
                    <td className="py-3 px-5">
                      {row.quantity === 0 ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-red-50 text-red-700 border-red-200">
                          Out of stock
                        </span>
                      ) : row.lowStock ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                          Low stock
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <button
                        onClick={() => handleSave(row)}
                        disabled={!dirty || isBusy}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        {isBusy ? "…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
