import React, { useState, useEffect } from "react";
import {
  getSizes,
  addSize,
  updateSize,
  deleteSize,
  type Size,
} from "../api/adminSize";
import {
  Field,
  SectionHeader,
  StatusBanner,
  PageHeader,
  PageShell,
  FormModal,
  StatCard,
  TableCard,
  TableLoadingRow,
  TableEmptyRow,
  RowActions,
  inputCls,
  type Status,
} from "../components/admin";

const SizeManagement: React.FC = () => {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [form, setForm] = useState({ label: "" });

  useEffect(() => {
    loadSizes();
  }, []);

  const loadSizes = async () => {
    setTableLoading(true);
    try {
      const res = await getSizes();
      setSizes(Array.isArray(res.data) ? res.data : [res.data]);
    } catch {
      setStatus({ type: "error", msg: "Failed to load sizes." });
    } finally {
      setTableLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setStatus({ type: "error", msg: "Size label is required." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      if (editingId !== null) {
        await updateSize(editingId, form);
        setStatus({ type: "success", msg: `Size "${form.label}" updated successfully!` });
      } else {
        await addSize(form);
        setStatus({ type: "success", msg: `Size "${form.label}" created successfully!` });
      }
      reset();
      loadSizes();
    } catch (err: any) {
      setStatus({
        type: "error",
        msg: err?.message || `Failed to ${editingId ? "update" : "create"} size.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s: Size) => {
    setForm({ label: s.label });
    setEditingId(s.sizeId ?? null);
    setShowForm(true);
    setStatus(null);
  };

  const handleDelete = async (id: number, label: string) => {
    if (!window.confirm(`Delete size "${label}"?`)) return;
    try {
      await deleteSize(id);
      setStatus({ type: "success", msg: `Size "${label}" deleted.` });
      loadSizes();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete size." });
    }
  };

  const reset = () => {
    setForm({ label: "" });
    setEditingId(null);
    setShowForm(false);
    setStatus(null);
  };

  const filtered = sizes.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={["Dashboard", "Catalog", "Size Management"]}
        title="Size Management"
        subtitle="Manage product size labels (e.g. XS, S, M, L, XL)"
        actionLabel="New Size"
        onAction={() => {
          reset();
          setShowForm(true);
        }}
      />

      <StatusBanner status={status} onClose={() => setStatus(null)} />

      <FormModal
        open={showForm}
        title={editingId !== null ? "Edit Size" : "Create New Size"}
        onClose={reset}
        onSubmit={handleSubmit}
        loading={loading}
        maxWidth="md"
        submitLabel={editingId !== null ? "Update Size" : "Create Size"}
        submittingLabel={editingId !== null ? "Updating..." : "Creating..."}
      >
        <SectionHeader icon="📏" title="Size Details" desc="Set the size label" />
        <Field label="Size Label" req hint="e.g. XS, S, M, L, XL, 32, 34">
          <input
            name="label"
            value={form.label}
            onChange={handleChange}
            placeholder="e.g. M"
            className={inputCls}
            autoFocus
            required
          />
        </Field>
      </FormModal>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Sizes" value={sizes.length} />
        <StatCard
          label="Latest"
          value={
            <span className="text-sm font-bold text-slate-800 truncate block">
              {sizes.length > 0 ? sizes[sizes.length - 1].label : "—"}
            </span>
          }
        />
        <StatCard label="Search Results" value={filtered.length} />
      </div>

      <TableCard
        title="All Sizes"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search size…"
        showingCount={filtered.length}
        totalCount={sizes.length}
        itemLabel="sizes"
        searchTerm={search}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">ID</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Label</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableLoading ? (
              <TableLoadingRow colSpan={3} label="Loading sizes…" />
            ) : filtered.length === 0 ? (
              <TableEmptyRow
                colSpan={3}
                icon="📏"
                title={search ? "No sizes match your search" : "No sizes yet"}
                subtitle={search ? "Try a different keyword" : 'Click "New Size" to add your first one'}
              />
            ) : (
              filtered.map((s) => (
                <tr key={s.sizeId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{s.sizeId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.label}</td>
                  <td className="px-6 py-4">
                    <RowActions
                      onEdit={() => handleEdit(s)}
                      onDelete={() => s.sizeId && handleDelete(s.sizeId, s.label)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </PageShell>
  );
};

export default SizeManagement;
