import React, { useState, useEffect } from "react";
import {
  getColors,
  addColor,
  updateColor,
  deleteColor,
  type Color,
} from "../api/adminColor";
import {
  Field,
  SectionHeader,
  StatusBanner,
  PageHeader,
  PageShell,
  FormModal,
  ConfirmDialog,
  StatCard,
  TableCard,
  TableLoadingRow,
  TableEmptyRow,
  RowActions,
  inputCls,
  type Status,
} from "../components/admin";

const ColorManagement: React.FC = () => {
  const [colors, setColors] = useState<Color[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [form, setForm] = useState<{ name: string; hex: string }>({
    name: "",
    hex: "#000000",
  });
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    loadColors();
  }, []);

  const loadColors = async () => {
    setTableLoading(true);
    try {
      const res = await getColors();
      setColors(Array.isArray(res.data) ? res.data : [res.data]);
    } catch {
      setStatus({ type: "error", msg: "Failed to load colors." });
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
    if (!form.name.trim()) {
      setStatus({ type: "error", msg: "Color name is required." });
      return;
    }
    if (!form.hex.trim()) {
      setStatus({ type: "error", msg: "Hex value is required." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      if (editingId !== null) {
        await updateColor(editingId, form);
        setStatus({ type: "success", msg: `Color "${form.name}" updated successfully!` });
      } else {
        await addColor(form);
        setStatus({ type: "success", msg: `Color "${form.name}" created successfully!` });
      }
      reset();
      loadColors();
    } catch (err: any) {
      setStatus({
        type: "error",
        msg: err?.message || `Failed to ${editingId ? "update" : "create"} color.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (color: Color) => {
    setForm({ name: color.name, hex: color.hex });
    setEditingId(color.colorId ?? null);
    setShowForm(true);
    setStatus(null);
  };

  const requestDelete = (id: number, name: string) => setPendingDelete({ id, name });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteColor(id);
      setStatus({ type: "success", msg: `Color "${name}" deleted.` });
      loadColors();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete color." });
    }
  };

  const reset = () => {
    setForm({ name: "", hex: "#000000" });
    setEditingId(null);
    setShowForm(false);
    setStatus(null);
  };

  const filtered = colors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.hex.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={["Dashboard", "Catalog", "Color Management"]}
        title="Color Management"
        subtitle="Manage product colors and their hex values"
        actionLabel="New Color"
        onAction={() => {
          reset();
          setShowForm(true);
        }}
      />

      <StatusBanner status={status} onClose={() => setStatus(null)} />

      <FormModal
        open={showForm}
        title={editingId !== null ? "Edit Color" : "Create New Color"}
        onClose={reset}
        onSubmit={handleSubmit}
        loading={loading}
        maxWidth="md"
        submitLabel={editingId !== null ? "Update Color" : "Create Color"}
        submittingLabel={editingId !== null ? "Updating..." : "Creating..."}
      >
        <SectionHeader icon="🎨" title="Color Details" desc="Set a color name and its hex value" />
        <div className="flex flex-col gap-5">
          <Field label="Color Name" req hint="e.g. Yellow, Midnight Blue, Coral Red">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Yellow"
              className={inputCls}
              autoFocus
              required
            />
          </Field>
          <Field label="Hex Value" req hint="Pick from the swatch or type manually">
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="hex"
                value={form.hex}
                onChange={handleChange}
                className="w-12 h-11 rounded-lg border border-slate-200 cursor-pointer p-1 bg-slate-50"
              />
              <input
                name="hex"
                value={form.hex}
                onChange={handleChange}
                placeholder="#FFFF00"
                className={`${inputCls} font-mono uppercase`}
                required
              />
            </div>
          </Field>
        </div>
      </FormModal>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Colors" value={colors.length} />
        <StatCard
          label="Latest"
          value={
            <div className="flex items-center gap-2 mt-1">
              {colors.length > 0 && (
                <div
                  className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
                  style={{ backgroundColor: colors[colors.length - 1].hex }}
                />
              )}
              <span className="text-sm font-bold text-slate-800 truncate">
                {colors.length > 0 ? colors[colors.length - 1].name : "—"}
              </span>
            </div>
          }
        />
        <StatCard label="Search Results" value={filtered.length} />
      </div>

      <TableCard
        title="All Colors"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or hex…"
        showingCount={filtered.length}
        totalCount={colors.length}
        itemLabel="colors"
        searchTerm={search}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">ID</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Color</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Hex</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableLoading ? (
              <TableLoadingRow colSpan={5} label="Loading colors…" />
            ) : filtered.length === 0 ? (
              <TableEmptyRow
                colSpan={5}
                icon="🎨"
                title={search ? "No colors match your search" : "No colors yet"}
                subtitle={search ? "Try a different keyword" : 'Click "New Color" to add your first one'}
              />
            ) : (
              filtered.map((color) => (
                <tr key={color.colorId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{color.colorId}</td>
                  <td className="px-6 py-4">
                    <div
                      className="w-8 h-8 rounded-lg border border-slate-200 shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{color.name}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase">
                      {color.hex}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <RowActions
                      onEdit={() => handleEdit(color)}
                      onDelete={() =>
                        color.colorId && requestDelete(color.colorId, color.name)
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete color?"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">"{pendingDelete?.name}"</span>?
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </PageShell>
  );
};

export default ColorManagement;
