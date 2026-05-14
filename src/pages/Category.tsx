import React, { useState, useEffect } from "react";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from "../api/adminCategory";
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

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setTableLoading(true);
    try {
      const res = await getCategories();
      setCategories(Array.isArray(res.data) ? res.data : [res.data]);
    } catch {
      setStatus({ type: "error", msg: "Failed to load categories." });
    } finally {
      setTableLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setStatus(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus({ type: "error", msg: "Category name is required." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      if (editingId !== null) {
        await updateCategory(editingId, form);
        setStatus({ type: "success", msg: `Category "${form.name}" updated successfully!` });
      } else {
        await addCategory(form);
        setStatus({ type: "success", msg: `Category "${form.name}" created successfully!` });
      }
      reset();
      loadCategories();
    } catch (err: any) {
      setStatus({
        type: "error",
        msg: err?.message || `Failed to ${editingId ? "update" : "create"} category.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setForm({ name: cat.name, description: cat.description || "" });
    setEditingId(cat.categoryId ?? null);
    setShowForm(true);
    setStatus(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await deleteCategory(id);
      setStatus({ type: "success", msg: `Category "${name}" deleted.` });
      loadCategories();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete category." });
    }
  };

  const reset = () => {
    setForm({ name: "", description: "" });
    setEditingId(null);
    setShowForm(false);
    setStatus(null);
  };

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={["Dashboard", "Catalog", "Category Management"]}
        title="Category Management"
        subtitle="Organise your product catalog with categories"
        actionLabel="New Category"
        onAction={() => {
          reset();
          setShowForm(true);
        }}
      />

      <StatusBanner status={status} onClose={() => setStatus(null)} />

      <FormModal
        open={showForm}
        title={editingId !== null ? "Edit Category" : "Create New Category"}
        onClose={reset}
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel={editingId !== null ? "Update Category" : "Create Category"}
        submittingLabel={editingId !== null ? "Updating..." : "Creating..."}
      >
        <SectionHeader icon="🏷️" title="Category Details" desc="Set a name and optional description" />
        <div className="flex flex-col gap-5">
          <Field label="Category Name" req hint="Keep it short and descriptive (e.g. Shoes, Electronics)">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Shoes"
              className={inputCls}
              autoFocus
              required
            />
          </Field>
          <Field label="Description" hint="Optional — a brief summary of this category">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. All types of footwear for men, women and kids"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      </FormModal>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Categories" value={categories.length} />
        <StatCard
          label="Latest"
          value={
            <span className="text-sm font-bold text-slate-800 truncate block">
              {categories.length > 0 ? categories[categories.length - 1].name : "—"}
            </span>
          }
        />
        <StatCard label="Search Results" value={filtered.length} />
      </div>

      <TableCard
        title="All Categories"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or description…"
        showingCount={filtered.length}
        totalCount={categories.length}
        itemLabel="categories"
        searchTerm={search}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">ID</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Description</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableLoading ? (
              <TableLoadingRow colSpan={4} label="Loading categories…" />
            ) : filtered.length === 0 ? (
              <TableEmptyRow
                colSpan={4}
                icon="🏷️"
                title={search ? "No categories match your search" : "No categories yet"}
                subtitle={search ? "Try a different keyword" : 'Click "New Category" to add your first one'}
              />
            ) : (
              filtered.map((cat) => (
                <tr key={cat.categoryId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{cat.categoryId}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 max-w-xs">
                    <span className="line-clamp-1">
                      {cat.description || <span className="text-slate-300 italic">No description</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <RowActions
                      onEdit={() => handleEdit(cat)}
                      onDelete={() =>
                        cat.categoryId && handleDelete(cat.categoryId, cat.name)
                      }
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

export default CategoryManagement;
