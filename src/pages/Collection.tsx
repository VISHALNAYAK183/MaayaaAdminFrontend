import React, { useState, useEffect } from "react";
import {
  getCollections,
  addCollection,
  updateCollection,
  deleteCollection,
  type Collection,
} from "../api/Admincollection";
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

const CollectionManagement: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setTableLoading(true);
    try {
      const res = await getCollections();
      setCollections(Array.isArray(res.data) ? res.data : [res.data]);
    } catch {
      setStatus({ type: "error", msg: "Failed to load collections." });
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
      setStatus({ type: "error", msg: "Collection name is required." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      if (editingId !== null) {
        await updateCollection(editingId, form);
        setStatus({ type: "success", msg: `Collection "${form.name}" updated successfully!` });
      } else {
        await addCollection(form);
        setStatus({ type: "success", msg: `Collection "${form.name}" created successfully!` });
      }
      reset();
      loadCollections();
    } catch (err: any) {
      setStatus({
        type: "error",
        msg: err?.message || `Failed to ${editingId ? "update" : "create"} collection.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (c: Collection) => {
    setForm({ name: c.name, description: c.description || "" });
    setEditingId(c.collectionId ?? null);
    setShowForm(true);
    setStatus(null);
  };

  const requestDelete = (id: number, name: string) => setPendingDelete({ id, name });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteCollection(id);
      setStatus({ type: "success", msg: `Collection "${name}" deleted.` });
      loadCollections();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete collection." });
    }
  };

  const reset = () => {
    setForm({ name: "", description: "" });
    setEditingId(null);
    setShowForm(false);
    setStatus(null);
  };

  const filtered = collections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { setPage(1); }, [search, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={["Dashboard", "Catalog", "Collection Management"]}
        title="Collection Management"
        subtitle="Group products into seasonal or themed collections"
        actionLabel="New Collection"
        onAction={() => {
          reset();
          setShowForm(true);
        }}
      />

      <StatusBanner status={status} onClose={() => setStatus(null)} />

      <FormModal
        open={showForm}
        title={editingId !== null ? "Edit Collection" : "Create New Collection"}
        onClose={reset}
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel={editingId !== null ? "Update Collection" : "Create Collection"}
        submittingLabel={editingId !== null ? "Updating..." : "Creating..."}
      >
        <SectionHeader icon="📦" title="Collection Details" desc="Set a name and optional description" />
        <div className="flex flex-col gap-5">
          <Field label="Collection Name" req hint="e.g. Summer 2025, Diwali Specials">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Summer 2025"
              className={inputCls}
              autoFocus
              required
            />
          </Field>
          <Field label="Description" hint="Optional — a brief summary of this collection">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. Light, breezy outfits for the summer season"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      </FormModal>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Collections" value={collections.length} />
        <StatCard
          label="Latest"
          value={
            <span className="text-sm font-bold text-slate-800 truncate block">
              {collections.length > 0 ? collections[collections.length - 1].name : "—"}
            </span>
          }
        />
        <StatCard label="Search Results" value={filtered.length} />
      </div>

      <TableCard
        title="All Collections"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or description…"
        showingCount={filtered.length}
        totalCount={collections.length}
        itemLabel="collections"
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
              <TableLoadingRow colSpan={4} label="Loading collections…" />
            ) : filtered.length === 0 ? (
              <TableEmptyRow
                colSpan={4}
                icon="📦"
                title={search ? "No collections match your search" : "No collections yet"}
                subtitle={search ? "Try a different keyword" : 'Click "New Collection" to add your first one'}
              />
            ) : (
              paged.map((c) => (
                <tr key={c.collectionId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{c.collectionId}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 max-w-xs">
                    <span className="line-clamp-1">
                      {c.description || <span className="text-slate-300 italic">No description</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <RowActions
                      onEdit={() => handleEdit(c)}
                      onDelete={() => c.collectionId && requestDelete(c.collectionId, c.name)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtered.length > pageSize && (
          <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-slate-100 bg-slate-50 flex-wrap">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)}</span> of <span className="font-semibold text-slate-700">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500 font-medium">Per page:</label>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-blue-400 transition-colors">
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
                <span className="text-xs text-slate-600 px-2 font-semibold">Page {safePage} of {totalPages}</span>
                <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
              </div>
            </div>
          </div>
        )}
      </TableCard>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete collection?"
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

export default CollectionManagement;
