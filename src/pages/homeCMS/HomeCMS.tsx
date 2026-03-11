import { useEffect, useRef, useState } from "react";
import {
  getAllSections,
  deleteHomeSection,
  updateHomeSection,
  addHomeSection,
  getSectionItems,
  addSectionItem,
  updateSectionItem,
  deleteSectionItem,
  HomeSection,
  SectionItem,
} from "../../api/homeCms";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface SectionWithItems extends HomeSection {
  items: SectionItem[];
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const SECTION_TYPES = [
  "HERO", "RECOMMENDED", "FEATURED_PRODUCTS",
  "PROMO", "CATEGORIES", "TRENDING",
  "REVIEWS", "WHY_MAAYAA", "WHY_SHOPWITH_MAAYAA",
];
const GENDERS = ["M", "F", "U"];
const STATUSES = ["ACTIVE", "INACTIVE", "DRAFT"];

const SECTION_LABEL: Record<string, string> = {
  HERO: "Hero Section",
  RECOMMENDED: "Recommended",
  FEATURED_PRODUCTS: "Featured Products",
  PROMO: "Promo",
  CATEGORIES: "Categories",
  TRENDING: "Trending Now",
  REVIEWS: "Reviews",
  WHY_MAAYAA: "Why Maayyaa",
  WHY_SHOPWITH_MAAYAA: "Why Shop With Maayyaa",
};

const HAS_META = new Set(["RECOMMENDED", "FEATURED_PRODUCTS", "TRENDING"]);
const PRODUCT_SECTION_TYPES = new Set(["RECOMMENDED", "FEATURED_PRODUCTS", "TRENDING"]);
const TABLE_SECTION_TYPES = new Set(["HERO", "PROMO", "REVIEWS", "WHY_MAAYAA", "CATEGORIES", "WHY_SHOPWITH_MAAYAA"]);
const TALL_TYPES = new Set(["RECOMMENDED", "FEATURED_PRODUCTS", "TRENDING", "REVIEWS", "WHY_MAAYAA", "WHY_SHOPWITH_MAAYAA", "CATEGORIES", "PROMO"]);

// Hero images are served from this base path
const HERO_IMAGE_BASE = "/assets/images/hero/";

// ─── ROOT ────────────────────────────────────────────────────────────────────
const HomeCMS = () => {
  const [sections, setSections] = useState<SectionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getAllSections();
      const raw: HomeSection[] = res.data ?? [];
      const withItems = await Promise.all(
        raw.map(async (s) => {
          try {
            const ir = await getSectionItems(s.sectionId);
            return { ...s, items: ir.data ?? [] } as SectionWithItems;
          } catch {
            return { ...s, items: [] } as SectionWithItems;
          }
        })
      );
      setSections(withItems.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    } catch {
      alert("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteSection = async (id: number) => {
    if (!window.confirm("Delete this section?")) return;
    await deleteHomeSection(id);
    setSections((p) => p.filter((s) => s.sectionId !== id));
  };

  const updateSection = async (id: number, patch: Partial<HomeSection>) => {
    await updateHomeSection(id, patch as any);
    setSections((p) => p.map((s) => (s.sectionId === id ? { ...s, ...patch } : s)));
  };

  const addSection = async (data: any) => {
    const res = await addHomeSection(data);
    const newS: SectionWithItems = { ...res.data, items: [] };
    setSections((p) => [...p, newS].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    setAddOpen(false);
  };

  const addItem = async (sectionId: number, payload: any) => {
    const res = await addSectionItem(sectionId, payload);
    setSections((p) =>
      p.map((s) => s.sectionId === sectionId ? { ...s, items: [...s.items, res.data] } : s)
    );
  };

  const updateItem = async (sectionId: number, itemId: number, payload: any) => {
    await updateSectionItem(itemId, payload);
    setSections((p) =>
      p.map((s) =>
        s.sectionId === sectionId
          ? { ...s, items: s.items.map((i) => (i.itemId === itemId ? { ...i, ...payload } : i)) }
          : s
      )
    );
  };

  const deleteItem = async (sectionId: number, itemId: number) => {
    if (!window.confirm("Delete this item?")) return;
    await deleteSectionItem(itemId);
    setSections((p) =>
      p.map((s) =>
        s.sectionId === sectionId
          ? { ...s, items: s.items.filter((i) => i.itemId !== itemId) }
          : s
      )
    );
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Home CMS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Home / Home CMS</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Section
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl h-36 animate-pulse border border-gray-200 dark:border-gray-700" />
          ))
        ) : sections.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center text-gray-400 text-sm">
            No sections yet — click "Add Section" to begin.
          </div>
        ) : (
          sections.map((s) => (
            <SectionBlock
              key={s.sectionId}
              section={s}
              onDelete={() => deleteSection(s.sectionId)}
              onUpdate={(p) => updateSection(s.sectionId, p)}
              onAddItem={(p) => addItem(s.sectionId, p)}
              onUpdateItem={(iid, p) => updateItem(s.sectionId, iid, p)}
              onDeleteItem={(iid) => deleteItem(s.sectionId, iid)}
            />
          ))
        )}
      </div>

      {addOpen && (
        <SectionModal onClose={() => setAddOpen(false)} onSave={addSection} />
      )}
    </>
  );
};

// ─── SECTION BLOCK ───────────────────────────────────────────────────────────
interface BlockProps {
  section: SectionWithItems;
  onDelete: () => void;
  onUpdate: (p: Partial<HomeSection>) => void;
  onAddItem: (p: any) => void;
  onUpdateItem: (id: number, p: any) => void;
  onDeleteItem: (id: number) => void;
}

const SectionBlock = ({ section, onDelete, onUpdate, onAddItem, onUpdateItem, onDeleteItem }: BlockProps) => {
  const hasMeta = HAS_META.has(section.type);
  const isTall = TALL_TYPES.has(section.type);
  const isHero = section.type === "HERO";
  const isTableSection = TABLE_SECTION_TYPES.has(section.type);
  const isProductSection = PRODUCT_SECTION_TYPES.has(section.type);
  const [editModal, setEditModal] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {SECTION_LABEL[section.type] ?? section.type}
          </span>
          {hasMeta && section.title && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{section.title}{section.subtitle ? ` — ${section.subtitle}` : ""}</p>
          )}
        </div>

        <div className="flex items-center gap-1 ml-3 shrink-0">
          <button
            onClick={() => setEditModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Edit section settings"
          >
            <PencilIcon />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete section"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Items strip */}
      {isTableSection ? (
        <div className="px-6 pb-6 pt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 pl-4 pr-3 w-14">#</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 pr-4">Image</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 pr-4">Link</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item) => (
                <HeroItemCard
                  key={item.itemId}
                  item={item}
                  allItems={section.items}
                  onUpdate={(p) => onUpdateItem(item.itemId, p)}
                  onDelete={() => onDeleteItem(item.itemId)}
                />
              ))}
              <AddHeroItemCard onAdd={onAddItem} allItems={section.items} />
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 pb-6 pt-4 overflow-x-auto">
          <div className="flex gap-3 items-end w-max">
            {section.items.map((item) => (
              <ItemCard
                key={item.itemId}
                item={item}
                tall={isTall}
                onUpdate={(p) => onUpdateItem(item.itemId, p)}
                onDelete={() => onDeleteItem(item.itemId)}
              />
            ))}
            <AddItemCard
              tall={isTall}
              isProductSection={isProductSection}
              onAdd={onAddItem}
              existingProductIds={section.items.map((i) => i.productId).filter(Boolean) as number[]}
            />
          </div>
        </div>
      )}

      {editModal && (
        <SectionModal
          initial={section}
          onClose={() => setEditModal(false)}
          onSave={async (data) => { await onUpdate(data); setEditModal(false); }}
        />
      )}
    </div>
  );
};

// ─── POSITION VALIDATION HELPER ─────────────────────────────────────────────
const validatePosition = (
  newPos: number,
  currentItemId: number | null, // null = adding new
  allItems: SectionItem[]
): string | null => {
  if (!newPos || newPos < 1) return "Position must be at least 1.";

  const otherItems = allItems.filter((i) => i.itemId !== currentItemId);
  const usedPositions = otherItems.map((i) => i.position).sort((a, b) => a - b);

  // Check duplicate
  if (usedPositions.includes(newPos)) return `Position ${newPos} is already taken.`;

  // Check no gap: the full set after this change must be 1..N with no gaps
  const allPositions = [...usedPositions, newPos].sort((a, b) => a - b);
  for (let i = 0; i < allPositions.length; i++) {
    if (allPositions[i] !== i + 1) {
      return `Position ${newPos} would create a gap. Next allowed: ${usedPositions.length + 1}.`;
    }
  }
  return null;
};

// ─── HERO ITEMS TABLE ────────────────────────────────────────────────────────
// Renders all hero items as a clean table. Exported so SectionBlock can use it.

interface HeroItemCardProps {
  item: SectionItem;
  allItems: SectionItem[];
  onUpdate: (p: any) => void;
  onDelete: () => void;
}

// Inline editable cell
const InlineEdit = ({
  value, onSave, placeholder, type = "text", validate,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  type?: string;
  validate?: (v: string) => string | null;
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [err, setErr] = useState("");

  const commit = () => {
    if (validate) {
      const e = validate(val);
      if (e) { setErr(e); return; }
    }
    onSave(val);
    setEditing(false);
    setErr("");
  };

  const cancel = () => { setVal(value); setEditing(false); setErr(""); };

  if (editing) {
    return (
      <div className="flex flex-col gap-0.5 w-full">
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type={type}
            value={val}
            onChange={(e) => { setVal(e.target.value); setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            placeholder={placeholder}
            className={`flex-1 text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-gray-400 ${err ? "border-red-300" : "border-gray-300"}`}
          />
          <button onClick={commit} className="text-gray-500 hover:text-gray-900 transition-colors p-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button onClick={cancel} className="text-gray-300 hover:text-gray-500 transition-colors p-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {err && <p className="text-[10px] text-red-500 leading-tight">{err}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => { setVal(value); setEditing(true); }}
      className="group flex items-center gap-1.5 text-left w-full"
      title="Click to edit"
    >
      <span className={`text-xs truncate ${value ? "text-gray-700" : "text-gray-300 italic"}`}>
        {value || placeholder || "—"}
      </span>
      <svg className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  );
};

const HeroItemCard = ({ item, allItems, onUpdate, onDelete }: HeroItemCardProps) => {
  const editFileRef = useRef<HTMLInputElement>(null);
  const [editImageModal, setEditImageModal] = useState(false);
  const [newImageName, setNewImageName] = useState(item.image ?? "");
  const [previewDataUrl, setPreviewDataUrl] = useState("");

  const handleEditFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setNewImageName(f.name);
    const r = new FileReader();
    r.onload = () => setPreviewDataUrl(r.result as string);
    r.readAsDataURL(f);
  };

  const openEditModal = () => {
    setNewImageName(item.image ?? "");
    setPreviewDataUrl("");
    if (editFileRef.current) editFileRef.current.value = "";
    setEditImageModal(true);
  };

  const saveImage = () => {
    if (!newImageName.trim()) return;
    onUpdate({ image: newImageName.trim() });
    setEditImageModal(false);
  };

  const imageSrc = item.image ? `${HERO_IMAGE_BASE}${item.image}` : null;

  return (
    <tr className="group border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
      {/* Position */}
      <td className="py-3 pl-4 pr-3 w-12">
        <InlineEdit
          value={item.position?.toString() ?? ""}
          placeholder="1"
          type="number"
          onSave={(v) => onUpdate({ position: Number(v) })}
          validate={(v) => validatePosition(Number(v), item.itemId, allItems)}
        />
      </td>

      {/* Thumbnail + filename */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
            {imageSrc ? (
              <img src={imageSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImagePlaceholderIcon />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-700 font-medium truncate max-w-[140px]" title={item.image ?? ""}>
              {item.image || <span className="text-gray-300 italic">no image</span>}
            </p>
            <button
              onClick={openEditModal}
              className="text-[10px] text-blue-500 hover:text-blue-700 mt-0.5 flex items-center gap-0.5 transition-colors"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              change image
            </button>
          </div>
        </div>
      </td>

      {/* Link */}
      <td className="py-3 pr-4 min-w-[120px]">
        <InlineEdit
          value={item.link ?? ""}
          placeholder="/collection/..."
          onSave={(v) => onUpdate({ link: v || null })}
        />
      </td>

      {/* Delete */}
      <td className="py-3 pr-4 w-8">
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
          title="Delete item"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </td>

      {/* Edit image modal */}
      {editImageModal && (
        <td className="p-0 border-0">
          <div
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={() => setEditImageModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-[340px] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Change Image</h3>
                <button onClick={() => setEditImageModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Preview */}
              <div
                className="rounded-xl overflow-hidden bg-gray-100 h-36 flex items-center justify-center cursor-pointer relative group mb-4 border border-gray-200"
                onClick={() => editFileRef.current?.click()}
              >
                {previewDataUrl ? (
                  <img src={previewDataUrl} alt="" className="w-full h-full object-cover" />
                ) : newImageName ? (
                  <img src={`${HERO_IMAGE_BASE}${newImageName}`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all">
                  <div className="bg-white/90 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload new image
                  </div>
                </div>
              </div>

              {newImageName && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-4 border border-gray-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-xs font-mono text-gray-600 truncate flex-1">{newImageName}</span>
                </div>
              )}

              <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditFile} />

              <div className="flex gap-2">
                <button
                  onClick={saveImage}
                  disabled={!newImageName.trim()}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  Save changes
                </button>
                <button
                  onClick={() => setEditImageModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </td>
      )}
    </tr>
  );
};

// ─── ADD HERO ITEM CARD ──────────────────────────────────────────────────────
// Upload image for preview, but only the filename string is sent to the API.
const AddHeroItemCard = ({ onAdd, allItems }: { onAdd: (p: any) => void; allItems: SectionItem[] }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [form, setForm] = useState({ imageName: "", link: "", position: "" });
  const [posError, setPosError] = useState("");

  const cardW = 130;
  const cardH = 82;

  // Auto-suggest next available position
  const nextPos = allItems.length + 1;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm((prev) => ({ ...prev, imageName: f.name }));
    const r = new FileReader();
    r.onload = () => setPreviewDataUrl(r.result as string);
    r.readAsDataURL(f);
    setExpanded(true);
  };

  const reset = () => {
    setForm({ imageName: "", link: "", position: "" });
    setPreviewDataUrl("");
    setPosError("");
    setExpanded(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    if (!form.imageName.trim()) { alert("Please upload an image first"); return; }
    const pos = Number(form.position) || nextPos;
    const err = validatePosition(pos, null, allItems);
    if (err) { setPosError(err); return; }
    onAdd({
      image: form.imageName.trim(),
      link: form.link || null,
      heading: null,
      position: pos,
    });
    reset();
  };

  if (expanded) {
    return (
      <tr className="border-b border-gray-100 bg-gray-50/80">
        {/* Position */}
        <td className="py-3 pl-4 pr-3 w-12 align-top">
          <div className="flex flex-col gap-0.5">
            <input
              type="number"
              min="1"
              placeholder={String(nextPos)}
              value={form.position}
              onChange={(e) => { setForm({ ...form, position: e.target.value }); setPosError(""); }}
              className={`w-14 text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-gray-400 ${posError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
            />
            {posError && <p className="text-[10px] text-red-500 leading-tight w-28">{posError}</p>}
          </div>
        </td>

        {/* Image upload */}
        <td className="py-3 pr-4 align-top">
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors shrink-0 relative group"
              onClick={() => fileRef.current?.click()}
            >
              {previewDataUrl ? (
                <img src={previewDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </div>
            <div className="min-w-0">
              {form.imageName ? (
                <p className="text-xs font-mono text-gray-600 truncate max-w-[130px]">{form.imageName}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">no image selected</p>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="text-[10px] text-blue-500 hover:text-blue-700 mt-0.5 transition-colors"
              >
                {form.imageName ? "change" : "upload image"}
              </button>
            </div>
          </div>
        </td>

        {/* Link */}
        <td className="py-3 pr-4 align-top">
          <input
            placeholder="/collection/..."
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            className="text-xs px-2 py-1 rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 w-full"
          />
        </td>

        {/* Actions */}
        <td className="py-3 pr-4 align-top">
          <div className="flex items-center gap-1">
            <button
              onClick={submit}
              className="h-6 px-2.5 bg-gray-900 text-white rounded text-[11px] font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              Add
            </button>
            <button
              onClick={reset}
              className="h-6 w-6 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </td>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={4} className="py-2 pl-4">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors group"
        >
          <span className="w-5 h-5 rounded border border-dashed border-gray-300 group-hover:border-gray-400 flex items-center justify-center transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </span>
          Add item
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </td>
    </tr>
  );
};

// ─── ITEM CARD (non-hero) ─────────────────────────────────────────────────────
interface ItemCardProps {
  item: SectionItem;
  tall: boolean;
  onUpdate: (p: any) => void;
  onDelete: () => void;
}

const ItemCard = ({ item, tall, onUpdate, onDelete }: ItemCardProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkEdit, setLinkEdit] = useState(false);
  const [linkVal, setLinkVal] = useState(item.link ?? "");

  const isProduct = !!item.productId;
  const cardW = tall ? 100 : 120;
  const cardH = tall ? 130 : 78;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onUpdate({ image: r.result as string });
    r.readAsDataURL(f);
  };

  const saveLink = () => { onUpdate({ link: linkVal }); setLinkEdit(false); };

  if (isProduct) {
    // ── PRODUCT CARD ─────────────────────────────────────────────
    return (
      <div className="shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group" style={{ width: cardW }}>
        {/* Image — not clickable */}
        <div className="relative overflow-hidden bg-gray-50" style={{ height: cardH }}>
          {item.image ? (
            <img src={item.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              <ImagePlaceholderIcon />
              <span className="text-[9px] text-gray-300">No image</span>
            </div>
          )}
          {/* Delete button */}
          <button
            onClick={onDelete}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 text-gray-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Info */}
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-semibold text-gray-800 truncate leading-tight" title={item.heading ?? ""}>
            {item.heading || "—"}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">#{item.productId}</p>
        </div>
      </div>
    );
  }

  // ── REGULAR ITEM CARD ─────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1.5 shrink-0" style={{ width: cardW }}>
      <div
        className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-200 group cursor-pointer"
        style={{ width: cardW, height: cardH }}
        onClick={() => fileRef.current?.click()}
      >
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImagePlaceholderIcon />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <CameraIcon />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-red-500 transition-colors z-10 text-[11px] font-black leading-none"
        >
          ×
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {linkEdit ? (
        <div className="flex gap-1 items-center">
          <input autoFocus value={linkVal} onChange={(e) => setLinkVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveLink()} placeholder="/link"
            className="w-full text-[10px] border border-gray-300 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-800" />
          <button onClick={saveLink} className="shrink-0 text-[9px] bg-gray-900 text-white px-1.5 py-1 rounded-md font-bold">✓</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-gray-400 truncate" title={item.link ?? ""} style={{ maxWidth: cardW * 0.5 }}>
            {item.link ? item.link.replace(/^https?:\/\/[^/]+/, "").slice(0, 10) || "link" : "link"}
          </span>
          <button onClick={() => setLinkEdit(true)}
            className="text-[10px] text-gray-500 border border-gray-200 px-2 py-0.5 rounded-md hover:bg-gray-50 shrink-0 font-medium">
            edit
          </button>
        </div>
      )}
    </div>
  );
};

// ─── PRODUCT PICKER MODAL ────────────────────────────────────────────────────
interface ProductPickerProps {
  onSelect: (product: any) => void;
  onClose: () => void;
  existingProductIds: number[];
}

const ProductPickerModal = ({ onSelect, onClose, existingProductIds }: ProductPickerProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
        const res = await fetch(`http://localhost:8081/api/admin/products?${params}`);
        const json = await res.json();
        setProducts(Array.isArray(json.data) ? json.data : []);
      } catch { setProducts([]); }
      finally { setLoading(false); }
    };
    load();
  }, [page]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
                const discount = p.basePrice > 0
                  ? Math.round(((p.basePrice - p.discountedPrice) / p.basePrice) * 100)
                  : 0;
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
                        <span className="text-[10px] text-gray-400">{p.gender}</span>
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
                      <p className="text-sm font-semibold text-gray-900">₹{p.discountedPrice?.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {p.basePrice > p.discountedPrice && (
                          <span className="text-[10px] text-gray-400 line-through">₹{p.basePrice?.toLocaleString()}</span>
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

// ─── ADD ITEM CARD (non-hero) ─────────────────────────────────────────────────
const AddItemCard = ({
  tall, onAdd, isProductSection = false, existingProductIds = [],
}: { tall: boolean; onAdd: (p: any) => void; isProductSection?: boolean; existingProductIds?: number[] }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ image: "", link: "", heading: "", position: "1" });
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const cardW = tall ? 90 : 115;
  const cardH = tall ? 115 : 72;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setForm((prev) => ({ ...prev, image: r.result as string }));
      setExpanded(true);
    };
    r.readAsDataURL(f);
  };

  const handleProductSelect = (product: any) => {
    onAdd({
      productId: product.productId,
      image: product.images?.[0]?.url ?? null,
      link: `/product/${product.productId}`,
      heading: product.name,
      position: Number(form.position) || 1,
    });
    setPickerOpen(false);
  };

  const submit = () => {
    onAdd({
      image: form.image || null,
      link: form.link || null,
      heading: form.heading || null,
      position: Number(form.position) || 1,
    });
    setForm({ image: "", link: "", heading: "", position: "1" });
    setExpanded(false);
  };

  // Product section: just show + button that opens picker
  if (isProductSection) {
    return (
      <>
        <div className="flex flex-col gap-1.5 shrink-0" style={{ width: cardW }}>
          <button
            onClick={() => setPickerOpen(true)}
            className="rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-500 hover:bg-gray-50 transition-all"
            style={{ width: cardW, height: cardH }}
            title="Add product"
          >
            <span className="text-xl font-light leading-none">+</span>
          </button>
        </div>
        {pickerOpen && (
          <ProductPickerModal
            onSelect={handleProductSelect}
            onClose={() => setPickerOpen(false)}
            existingProductIds={existingProductIds}
          />
        )}
      </>
    );
  }

  if (expanded) {
    return (
      <div className="flex flex-col gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3 shrink-0" style={{ width: 160 }}>
        {form.image && (
          <img src={form.image} alt="" className="w-full h-20 object-cover rounded-lg" />
        )}
        <input placeholder="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
          className="text-[11px] border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none" />
        <input placeholder="Heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })}
          className="text-[11px] border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none" />
        <input placeholder="Position" type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
          className="text-[11px] border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none" />
        <div className="flex gap-1.5">
          <button onClick={submit} className="flex-1 bg-gray-900 text-white text-[11px] font-bold py-1.5 rounded-lg">Add</button>
          <button onClick={() => setExpanded(false)} className="text-[11px] text-gray-400 px-2 border border-gray-200 rounded-lg">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 shrink-0" style={{ width: cardW }}>
      <button
        onClick={() => fileRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-500 hover:bg-gray-50 transition-all"
        style={{ width: cardW, height: cardH }}
        title="Click to upload image"
      >
        <span className="text-xl font-light leading-none">+</span>
      </button>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-gray-300">link</span>
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] text-gray-400 border border-gray-200 px-2 py-0.5 rounded-md hover:bg-gray-50 font-medium"
        >
          add
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ─── SECTION MODAL ───────────────────────────────────────────────────────────
interface ModalProps {
  initial?: Partial<HomeSection>;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const SectionModal = ({ initial, onClose, onSave }: ModalProps) => {
  const isEdit = !!initial?.sectionId;
  const [form, setForm] = useState({
    type: initial?.type ?? "HERO",
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    position: initial?.position?.toString() ?? "1",
    gender: initial?.gender ?? "U",
    status: initial?.status ?? "ACTIVE",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        type: form.type,
        title: form.title,
        subtitle: form.subtitle,
        position: Number(form.position),
        gender: form.gender,
        status: form.status,
      });
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? "Edit Section" : "Add Section"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <Label>Type</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SECTION_TYPES.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    form.type === t
                      ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-500 dark:hover:border-gray-400"
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>

          <ModalField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <ModalField label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />

          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Position" value={form.position} type="number" onChange={(v) => setForm({ ...form, position: v })} required />
            <div>
              <Label>Gender</Label>
              <div className="flex gap-1 mt-2">
                {GENDERS.map((g) => (
                  <button key={g} type="button"
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      form.gender === g
                        ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
                        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >{g}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <div className="flex gap-2 mt-2">
              {STATUSES.map((s) => (
                <button key={s} type="button"
                  onClick={() => setForm({ ...form, status: s })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    form.status === s
                      ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : isEdit ? "Update Section" : "Add Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── SMALL HELPERS ───────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">{children}</span>
);

const ModalField = ({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) => (
  <div>
    <Label>{label}</Label>
    <input
      type={type} value={value} required={required}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 transition-colors"
    />
  </div>
);

// ─── ICONS ───────────────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ImagePlaceholderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export default HomeCMS;