import { useReadOnly } from "../../hooks/useReadOnly";
import { useEffect, useMemo, useState } from "react";
import {
  getAllProductCosts,
  addProductCost,
  updateCostItem,
  deleteCostItem,
  COST_TYPES,
  CostType,
  ProductCostSummary,
  CostBreakdown,
} from "../../api/costApi";
import { getAllProducts } from "../../api/Adminproduct";

type ProductLite = { productId: number; name: string; discountedPrice?: number };

/**
 * These calls go through axios, where a failure's body is the server's JSON
 * object. Alerting that object directly showed "[object Object]".
 */
const messageFrom = (e: unknown, fallback: string): string => {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  const message = (data as { message?: unknown })?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

export default function CostManagement() {
  const readOnly = useReadOnly();
  const [costs, setCosts] = useState<ProductCostSummary[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductCostSummary | null>(null);
  const [adding, setAdding] = useState<ProductLite | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [costRes, allProducts] = await Promise.all([
        getAllProductCosts(),
        getAllProducts(),
      ]);
      const costList = Array.isArray(costRes.data) ? costRes.data : [];
      setCosts(costList);
      const prodList: ProductLite[] = allProducts
        .filter((p) => p.productId != null)
        .map((p) => ({
          productId: p.productId as number,
          name: p.name,
          discountedPrice: p.discountedPrice,
        }));
      setProducts(prodList);
      setLoadFailed(false);
    } catch {
      // Empty lists read as "nothing tracked" and "all products have cost
      // tracking" - both false when the truth is that nothing loaded.
      setLoadFailed(true);
      setCosts([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const productsWithoutCost = useMemo(() => {
    const tracked = new Set(costs.map((c) => c.productId));
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        !tracked.has(p.productId) &&
        (q ? p.name.toLowerCase().includes(q) : true)
    );
  }, [costs, products, search]);

  const visibleCosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? costs.filter((c) => (c.productName ?? "").toLowerCase().includes(q))
      : costs;
  }, [costs, search]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Product Costs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {costs.length} tracked · {productsWithoutCost.length} untracked
          </p>
        </div>
        <input
          type="search"
          placeholder="Search product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      {loadFailed && !loading && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>Product costs could not be loaded.</span>
          <button onClick={() => load()} className="font-medium underline">
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="shell-panel lg:col-span-2 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
            Tracked products
          </div>
          <div className="overflow-x-auto">
            {/* Scrolls sideways on a phone - these columns do not fit one,
              and a squashed table is worse than one you swipe. */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Product", "Total cost", "Profit", "Items", ""].map((h, i) => (
                  <th
                    key={i}
                    className="text-left py-3 px-5 shell-label"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="py-4 px-5">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleCosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                    No tracked products yet — pick one from the right to start
                  </td>
                </tr>
              ) : (
                visibleCosts.map((c) => (
                  <tr key={c.productId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 text-sm text-gray-900 truncate max-w-[260px]">
                      {c.productName ?? `#${c.productId}`}
                      <span className="block text-[11px] text-gray-400">#{c.productId}</span>
                    </td>
                    <td className="py-3 px-5 text-sm font-medium text-gray-900">
                      ₹{Number(c.totalCost ?? 0).toLocaleString()}
                    </td>
                    <td className={`py-3 px-5 text-sm font-medium ${c.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      ₹{Number(c.profit ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-700">
                      {c.breakdown?.length ?? 0}
                    </td>
                    <td className="py-3 px-5">
                      <button
                        onClick={() => setSelected(c)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="shell-panel overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">
            Untracked products
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-gray-400">Loading…</p>
            ) : loadFailed ? (
              <p className="p-5 text-sm text-gray-400">Not loaded.</p>
            ) : productsWithoutCost.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">All products have cost tracking</p>
            ) : (
              productsWithoutCost.map((p) => (
                <div key={p.productId} className="px-5 py-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-gray-900 truncate">
                    {p.name}
                    <span className="block text-[11px] text-gray-400">
                      #{p.productId}
                      {p.discountedPrice != null && ` · ₹${Number(p.discountedPrice).toLocaleString()}`}
                    </span>
                  </div>
                  {!readOnly && (
                  <button
                    onClick={() => setAdding(p)}
                    className="shrink-0 text-xs px-2.5 py-1.5 rounded-full bg-gray-900 hover:bg-gray-700 text-white font-medium shell-press"
                  >
                    Add costs
                  </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selected && (
        <ManageCostModal
          summary={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
        />
      )}

      {adding && (
        <AddCostModal
          product={adding}
          onClose={() => setAdding(null)}
          onSaved={() => { setAdding(null); load(); }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------- modals --

function ManageCostModal({
  summary,
  onClose,
  onSaved,
}: {
  summary: ProductCostSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const readOnly = useReadOnly();
  const [busy, setBusy] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, number>>({});
  const active = (summary.breakdown ?? []).filter((b) => b.status === "1");

  const save = async (item: CostBreakdown) => {
    const next = drafts[item.id];
    if (next == null || next === item.amount) return;
    setBusy(item.id);
    try {
      await updateCostItem(item.id, next);
      onSaved();
    } catch (e: any) {
      alert(messageFrom(e, "Failed to update"));
    } finally {
      setBusy(null);
    }
  };

  const del = async (item: CostBreakdown) => {
    if (!window.confirm(`Delete this ${item.costType} cost?`)) return;
    setBusy(item.id);
    try {
      await deleteCostItem(item.id);
      onSaved();
    } catch (e: any) {
      alert(messageFrom(e, "Failed to delete"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title={`${summary.productName ?? `#${summary.productId}`} — Cost breakdown`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="shell-label">Total cost</p>
          <p className="font-bold text-gray-900">₹{Number(summary.totalCost ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="shell-label">Profit</p>
          <p className={`font-bold ${summary.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
            ₹{Number(summary.profit ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Scrolls sideways on a phone - these columns do not fit one,
          and a squashed table is worse than one you swipe. */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Type", "Description", "Amount", "", ""].map((h, i) => (
              <th key={i} className="text-left py-2 px-3 shell-label">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {active.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                No active cost items
              </td>
            </tr>
          ) : (
            active.map((item) => {
              const draft = drafts[item.id];
              const dirty = draft != null && draft !== item.amount;
              const isBusy = busy === item.id;
              // Shipping is taken from each order now. The line is shown so it
              // can be deleted, but no total counts it.
              const uncounted = item.costType === "SHIPPING";
              return (
                <tr key={item.id} className={uncounted ? "opacity-60" : undefined}>
                  <td className="py-2 px-3 text-sm text-gray-700">
                    {item.costType.replace(/_/g, " ")}
                    {uncounted && (
                      <span className="mt-0.5 block text-[11px] text-gray-500">
                        Not counted: shipping is per order now
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-500">{item.description || "—"}</td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft ?? item.amount}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [item.id]: Number(e.target.value) }))
                      }
                      className="w-28 px-2 py-1 text-sm rounded-lg border border-gray-200 bg-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    {!readOnly && (
                    <button
                      onClick={() => save(item)}
                      disabled={!dirty || isBusy}
                      className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white shell-press"
                    >
                      Save
                    </button>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {!readOnly && (
                    <button
                      onClick={() => del(item)}
                      disabled={isBusy}
                      className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shell-press"
                    >
                      Delete
                    </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 shell-press"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function AddCostModal({
  product,
  onClose,
  onSaved,
}: {
  product: ProductLite;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<{ costType: CostType; amount: string; description: string }[]>([
    { costType: "RAW_MATERIAL", amount: "", description: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const update = (idx: number, patch: Partial<typeof items[number]>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const remove = (idx: number) =>
    setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));

  const submit = async () => {
    const payload = items
      .filter((it) => Number(it.amount) > 0)
      .map((it) => ({
        costType: it.costType,
        amount: Number(it.amount),
        description: it.description.trim() || undefined,
      }));
    if (payload.length === 0) {
      alert("Add at least one cost item with a positive amount.");
      return;
    }
    setSaving(true);
    try {
      await addProductCost(product.productId, payload);
      onSaved();
    } catch (e: any) {
      alert(messageFrom(e, "Failed to add costs"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Add costs — ${product.name}`} onClose={onClose}>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-start">
            <select
              value={it.costType}
              onChange={(e) => update(i, { costType: e.target.value as CostType })}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
            >
              {COST_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Amount"
              value={it.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
              className="w-28 px-2 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={it.description}
              onChange={(e) => update(i, { description: e.target.value })}
              className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
            />
            <button
              onClick={() => remove(i)}
              disabled={items.length === 1}
              className="text-xs px-2 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 shell-press"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={() => setItems((arr) => [...arr, { costType: "OTHER", amount: "", description: "" }])}
          className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 shell-press"
        >
          + Add another item
        </button>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 shell-press"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-full bg-gray-900 hover:bg-gray-700 text-white font-medium disabled:opacity-50 shell-press"
        >
          {saving ? "Saving…" : "Save costs"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="shell-panel shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
