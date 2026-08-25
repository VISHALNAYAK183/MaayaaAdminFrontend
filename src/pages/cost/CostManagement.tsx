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
import { getProducts } from "../../api/Adminproduct";

type ProductLite = { productId: number; name: string; discountedPrice?: number };

export default function CostManagement() {
  const readOnly = useReadOnly();
  const [costs, setCosts] = useState<ProductCostSummary[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductCostSummary | null>(null);
  const [adding, setAdding] = useState<ProductLite | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [costRes, prodRes] = await Promise.all([
        getAllProductCosts(),
        getProducts(),
      ]);
      const costList = Array.isArray(costRes.data) ? costRes.data : [];
      setCosts(costList);
      const prodList: ProductLite[] = (prodRes.data ?? []).map((p: any) => ({
        productId: p.productId,
        name: p.name,
        discountedPrice: p.discountedPrice,
      }));
      setProducts(prodList);
    } catch {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Costs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Home / Product Costs · {costs.length} tracked · {productsWithoutCost.length} untracked
          </p>
        </div>
        <input
          type="search"
          placeholder="Search product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white">
            Tracked products
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                {["Product", "Total cost", "Profit", "Items", ""].map((h, i) => (
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="py-4 px-5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
                  <tr key={c.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="py-3 px-5 text-sm text-gray-900 dark:text-white truncate max-w-[260px]">
                      {c.productName ?? `#${c.productId}`}
                      <span className="block text-[11px] text-gray-400">#{c.productId}</span>
                    </td>
                    <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">
                      ₹{Number(c.totalCost ?? 0).toLocaleString()}
                    </td>
                    <td className={`py-3 px-5 text-sm font-medium ${c.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      ₹{Number(c.profit ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-700 dark:text-gray-300">
                      {c.breakdown?.length ?? 0}
                    </td>
                    <td className="py-3 px-5">
                      <button
                        onClick={() => setSelected(c)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
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

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white">
            Untracked products
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-gray-400">Loading…</p>
            ) : productsWithoutCost.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">All products have cost tracking</p>
            ) : (
              productsWithoutCost.map((p) => (
                <div key={p.productId} className="px-5 py-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-gray-900 dark:text-white truncate">
                    {p.name}
                    <span className="block text-[11px] text-gray-400">
                      #{p.productId}
                      {p.discountedPrice != null && ` · ₹${Number(p.discountedPrice).toLocaleString()}`}
                    </span>
                  </div>
                  {!readOnly && (
                  <button
                    onClick={() => setAdding(p)}
                    className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
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
      alert(e?.response?.data || "Failed to update");
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
      alert(e?.response?.data || "Failed to delete");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title={`${summary.productName ?? `#${summary.productId}`} — Cost breakdown`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Total cost</p>
          <p className="font-bold text-gray-900 dark:text-white">₹{Number(summary.totalCost ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Profit</p>
          <p className={`font-bold ${summary.profit < 0 ? "text-red-600" : "text-emerald-600"}`}>
            ₹{Number(summary.profit ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            {["Type", "Description", "Amount", "", ""].map((h, i) => (
              <th key={i} className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase py-2 px-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
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
              return (
                <tr key={item.id}>
                  <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300">
                    {item.costType.replace(/_/g, " ")}
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
                      className="w-28 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    {!readOnly && (
                    <button
                      onClick={() => save(item)}
                      disabled={!dirty || isBusy}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white"
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
                      className="text-xs px-2.5 py-1 rounded-lg font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
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

      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
      alert(e?.response?.data || "Failed to add costs");
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
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
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
              className="w-28 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={it.description}
              onChange={(e) => update(i, { description: e.target.value })}
              className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={() => remove(i)}
              disabled={items.length === 1}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={() => setItems((arr) => [...arr, { costType: "OTHER", amount: "", description: "" }])}
          className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          + Add another item
        </button>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
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
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
