import React, { useState, useEffect } from "react";
import {
  getColors,
  addColor,
  updateColor,
  deleteColor,
  type Color,
} from "../api/adminColor";

// ─── Icons ────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" />
    <path strokeLinecap="round" d="m21 21-4.35-4.35" />
  </svg>
);

const Fld = ({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
      {label}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <span className="text-xs text-slate-400">{hint}</span>}
  </div>
);

const SH = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-lg bg-slate-50 border border-slate-200 rounded-xl">{icon}</div>
    <div>
      <div className="text-sm font-bold text-slate-800">{title}</div>
      <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
    </div>
  </div>
);

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300";

// ─── Main Component ───────────────────────────────────────────────────────────
const ColorManagement: React.FC = () => {
  const [colors, setColors] = useState<Color[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [form, setForm] = useState<{ name: string; hex: string }>({ name: "", hex: "#000000" });

  useEffect(() => { loadColors(); }, []);

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
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setStatus({ type: "error", msg: "Color name is required." }); return; }
    if (!form.hex.trim()) { setStatus({ type: "error", msg: "Hex value is required." }); return; }
    setLoading(true); setStatus(null);
    try {
      if (editingId !== null) {
        await updateColor(editingId, form);
        setStatus({ type: "success", msg: `Color "${form.name}" updated successfully!` });
      } else {
        await addColor(form);
        setStatus({ type: "success", msg: `Color "${form.name}" created successfully!` });
      }
      reset(); loadColors();
    } catch (err: any) {
      setStatus({ type: "error", msg: err?.message || `Failed to ${editingId ? "update" : "create"} color.` });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (color: Color) => {
    setForm({ name: color.name, hex: color.hex });
    setEditingId(color.colorId ?? null);
    setShowForm(true); setStatus(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete color "${name}"?`)) return;
    try {
      await deleteColor(id);
      setStatus({ type: "success", msg: `Color "${name}" deleted.` });
      loadColors();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete color." });
    }
  };

  const reset = () => {
    setForm({ name: "", hex: "#000000" }); setEditingId(null); setShowForm(false); setStatus(null);
  };

  const filtered = colors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.hex.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            {["Dashboard", "Catalog"].map(c => (
              <React.Fragment key={c}>
                <span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">{c}</span>
                <span className="text-xs text-slate-300">›</span>
              </React.Fragment>
            ))}
            <span className="text-xs text-slate-600 font-semibold">Color Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Color Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage product colors and their hex values</p>
        </div>
        <button
          onClick={() => { reset(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-sm font-semibold">New Color</span>
        </button>
      </div>

      {/* Status Banner */}
      {status && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium mb-4
          ${status.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold shrink-0">
            {status.type === "success" ? "✓" : "✕"}
          </span>
          <span className="flex-1">{status.msg}</span>
          <button onClick={() => setStatus(null)} className="opacity-40 hover:opacity-70 text-lg leading-none">×</button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">{editingId !== null ? "Edit Color" : "Create New Color"}</h2>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <SH icon="🎨" title="Color Details" desc="Set a color name and its hex value" />
              <div className="flex flex-col gap-5 mb-6">
                <Fld label="Color Name" req hint='e.g. Yellow, Midnight Blue, Coral Red'>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Yellow"
                    className={inputCls}
                    autoFocus
                    required
                  />
                </Fld>
                <Fld label="Hex Value" req hint="Pick from the color swatch or type manually">
                  <div className="flex items-center gap-3">
                    {/* Native color picker */}
                    <input
                      type="color"
                      name="hex"
                      value={form.hex}
                      onChange={handleChange}
                      className="w-12 h-11 rounded-lg border border-slate-200 cursor-pointer p-1 bg-slate-50"
                    />
                    {/* Hex text input */}
                    <input
                      name="hex"
                      value={form.hex}
                      onChange={handleChange}
                      placeholder="#FFFF00"
                      className={`${inputCls} font-mono uppercase`}
                      required
                    />
                  </div>
                </Fld>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button type="button" onClick={reset}
                  className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex items-center px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {editingId !== null ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <><CheckIcon />{editingId !== null ? "Update Color" : "Create Color"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Colors</p>
          <p className="text-2xl font-extrabold text-slate-900">{colors.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Latest</p>
          <div className="flex items-center gap-2 mt-1">
            {colors.length > 0 && (
              <div className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
                style={{ backgroundColor: colors[colors.length - 1].hex }} />
            )}
            <p className="text-sm font-bold text-slate-800 truncate">
              {colors.length > 0 ? colors[colors.length - 1].name : "—"}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Search Results</p>
          <p className="text-2xl font-extrabold text-slate-900">{filtered.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-bold text-slate-800">All Colors</h2>
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or hex…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300 transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
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
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-xs text-slate-400 font-medium">Loading colors…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">🎨</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">{search ? "No colors match your search" : "No colors yet"}</p>
                      <p className="text-xs text-slate-400 mt-1">{search ? "Try a different keyword" : 'Click "New Color" to add your first one'}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                filtered.map(color => (
                  <tr key={color.colorId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{color.colorId}</td>
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-lg border border-slate-200 shadow-sm"
                        style={{ backgroundColor: color.hex }} />
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{color.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase">
                        {color.hex}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(color)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <EditIcon />
                        </button>
                        <button onClick={() => color.colorId && handleDelete(color.colorId, color.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!tableLoading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-600">{colors.length}</span> colors
              {search && <> matching <span className="font-semibold text-slate-600">"{search}"</span></>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorManagement;