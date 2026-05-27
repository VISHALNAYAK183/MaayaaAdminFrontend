import { useEffect, useMemo, useState } from "react";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  Expense,
  ExpenseCategory,
  ExpenseRequest,
} from "../../api/expenseApi";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "MARKETING",   label: "Marketing" },
  { value: "GATEWAY_FEE", label: "Gateway fee" },
  { value: "OTHER",       label: "Other" },
];

const GST_RATES = [0, 5, 12, 18, 28] as const;

const PAGE_SIZE = 20;

const currency = (n: number | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

interface FormState {
  category: ExpenseCategory;
  description: string;
  vendorName: string;
  vendorGstin: string;
  invoiceNumber: string;
  taxableValue: string;
  gstRate: string;
  amount: string;
  incurredAt: string; // yyyy-mm-dd
}

const emptyForm = (): FormState => ({
  category: "MARKETING",
  description: "",
  vendorName: "",
  vendorGstin: "",
  invoiceNumber: "",
  taxableValue: "",
  gstRate: "18",
  amount: "",
  incurredAt: new Date().toISOString().slice(0, 10),
});

export default function ExpenseManagement() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [filter, setFilter] = useState<"ALL" | ExpenseCategory>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listExpenses(
        page,
        PAGE_SIZE,
        filter === "ALL" ? undefined : filter,
      );
      setRows(res.data.content);
      setTotalPages(Math.max(1, res.data.totalPages));
      setTotalElements(res.data.totalElements);
    } catch {
      setError("Failed to load expenses.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(0); }, [filter]);
  useEffect(() => { fetch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, filter]);

  // ---- Derived totals shown above the table ----
  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const byCat: Record<string, number> = {};
    for (const r of rows) {
      byCat[r.category] = (byCat[r.category] ?? 0) + Number(r.amount ?? 0);
    }
    const itc = rows.reduce(
      (s, r) => s + (r.itcEligible ? Number(r.cgst ?? 0) + Number(r.sgst ?? 0) + Number(r.igst ?? 0) : 0),
      0,
    );
    return { total, byCat, itc };
  }, [rows]);

  // ---- Form actions ----
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (row: Expense) => {
    setEditingId(row.expenseId);
    setForm({
      category: row.category,
      description: row.description ?? "",
      vendorName: row.vendorName ?? "",
      vendorGstin: row.vendorGstin ?? "",
      invoiceNumber: row.invoiceNumber ?? "",
      taxableValue: row.taxableValue == null ? "" : String(row.taxableValue),
      gstRate: row.gstRate == null ? "0" : String(row.gstRate),
      amount: String(row.amount ?? ""),
      incurredAt: row.incurredAt ? row.incurredAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }
    if (form.vendorGstin && form.vendorGstin.trim().length !== 15) {
      alert("Vendor GSTIN must be 15 characters.");
      return;
    }

    const body: ExpenseRequest = {
      category: form.category,
      description: form.description.trim() || null,
      vendorName: form.vendorName.trim() || null,
      vendorGstin: form.vendorGstin.trim() || null,
      invoiceNumber: form.invoiceNumber.trim() || null,
      taxableValue: form.taxableValue ? Number(form.taxableValue) : null,
      gstRate: Number(form.gstRate ?? 0),
      amount: Number(form.amount),
      incurredAt: new Date(form.incurredAt).toISOString(),
    };

    setSaving(true);
    try {
      if (editingId == null) {
        await createExpense(body);
      } else {
        await updateExpense(editingId, body);
      }
      closeForm();
      await fetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this expense? (soft delete — can be restored from DB)")) return;
    try {
      await deleteExpense(id);
      await fetch();
    } catch {
      alert("Failed to delete.");
    }
  };

  // ---- UI -------------------------------------------------------------

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Home / Finance / Operating Expenses
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg"
        >
          + Add expense
        </button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total (this page)" value={currency(totals.total)} />
        {CATEGORIES.map((c) => (
          <Stat
            key={c.value}
            label={c.label}
            value={currency(totals.byCat[c.value] ?? 0)}
          />
        ))}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        ITC claimable (this page): <span className="font-semibold text-emerald-600 dark:text-emerald-400">{currency(totals.itc)}</span>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Category:</span>
        <button
          onClick={() => setFilter("ALL")}
          className={chipCls(filter === "ALL")}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={chipCls(filter === c.value)}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{totalElements} record{totalElements === 1 ? "" : "s"}</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              {["Date", "Category", "Description", "Vendor", "GSTIN", "Amount", "ITC", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 px-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="py-4 px-4">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-red-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">No expenses yet — click "+ Add expense" to create one.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.expenseId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{fmtDate(r.incurredAt)}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {r.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.description ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.vendorName ?? "—"}</td>
                  <td className="py-3 px-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                    {r.vendorGstin ?? <span className="italic text-gray-400">Unreg.</span>}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">{currency(r.amount)}</td>
                  <td className="py-3 px-4 text-xs">
                    {r.itcEligible ? (
                      <span className="text-emerald-600">Yes · {currency(Number(r.cgst ?? 0) + Number(r.sgst ?? 0) + Number(r.igst ?? 0))}</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(r)} className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded transition-colors">Edit</button>
                      <button onClick={() => handleDelete(r.expenseId)} className="text-xs font-medium text-red-600 hover:text-red-800 px-2 py-1 rounded transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-400">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-600 dark:text-gray-300"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-600 dark:text-gray-300"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
             onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingId == null ? "Add Expense" : "Edit Expense"}
              </h3>
              <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <input
                  type="date"
                  value={form.incurredAt}
                  onChange={(e) => setForm({ ...form, incurredAt: e.target.value })}
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Category" required>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Description" className="col-span-2">
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Diwali Instagram campaign"
                  className={inputCls}
                />
              </Field>
              <Field label="Vendor name">
                <input
                  value={form.vendorName}
                  onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                  placeholder="e.g. Razorpay Software Pvt Ltd"
                  className={inputCls}
                />
              </Field>
              <Field label="Vendor GSTIN" hint="15 chars — leave blank if vendor isn't registered">
                <input
                  value={form.vendorGstin}
                  onChange={(e) => setForm({ ...form, vendorGstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 29AAGCR4375J1ZU"
                  maxLength={15}
                  className={inputCls + " uppercase font-mono text-xs"}
                />
              </Field>
              <Field label="Invoice #">
                <input
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  placeholder="vendor's invoice ref"
                  className={inputCls}
                />
              </Field>
              <Field label="GST rate (%)">
                <select
                  value={form.gstRate}
                  onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                  className={inputCls}
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </Field>
              <Field label="Taxable value (₹)" hint="pre-GST amount">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.taxableValue}
                  onChange={(e) => setForm({ ...form, taxableValue: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Total paid (₹)" required hint="taxable + GST = gross">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={inputCls}
                  required
                />
              </Field>
            </div>

            <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
              ITC is auto-claimed when a valid vendor GSTIN is provided.
              CGST/SGST/IGST is auto-split based on whether the vendor is in Karnataka (intra-state) or another state.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId == null ? "Create" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

const chipCls = (active: boolean) =>
  "text-xs px-3 py-1.5 rounded-full font-semibold transition-colors " +
  (active
    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600");

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function Field({
  label, required, hint, className, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ?? ""}>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}
