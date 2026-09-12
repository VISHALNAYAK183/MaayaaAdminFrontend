/**
 * The section and item editors, shared by the studio and the classic list.
 *
 * Lifted out of HomeCMS.tsx unchanged when the studio arrived — the studio
 * opens these in a drawer, the classic page stacks them down the screen, and
 * neither should be the one place they live.
 *
 * Everything here edits the DRAFT. No call in this file reaches the API except
 * the image upload, which has to happen up front so an unpublished item has a
 * real URL to preview.
 */
import { useReadOnly } from "../../../hooks/useReadOnly";
import { useRef, useState, useCallback } from "react";
import { CLIENT_BASE } from "../../../api/client";

// ─── IMAGE UPLOAD HELPER ─────────────────────────────────────────────────────
// Posts to the CUSTOMER backend — the storefront serves /uploads/ from that
// host, so uploading to the admin backend would render nothing on the site.
// Stores the host-relative "/uploads/<file>" so the value survives deploys
// instead of baking a localhost origin into the database.
const uploadImage = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append("file", file);
  // Left as a bare fetch on purpose: this is the storefront host, not admin-api.
  // Our ACCESS token was issued by admin-api and must not be sent to a
  // different service. If the storefront starts requiring admin auth, wire it
  // up deliberately rather than inheriting a header by accident.
  const res = await fetch(`${CLIENT_BASE}/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.url as string;
};

import type { DraftId, DraftItem, DraftSection, SectionStatus } from "../draft/types";
import type { PreviewProduct } from "../preview/useStorefrontPreview";
import {
  GENDER_TABS,
  SECTION_LABEL,
  SECTION_TYPES,
  resolveCmsImage,
} from "./shared";
import { CategoryPickerModal, ProductPickerModal, type PickerProduct } from "./pickers";
import { useCategoryNames } from "./categories";
import { categoryLink } from "./links";

// ─── TYPES ──────────────────────────────────────────────────────────────────
// The page edits a draft, not the server. Every card below keeps working
// against these because a draft section is an API section with two differences:
// ids widen to string while a row is still unpublished, and status is carried
// as a word rather than the 'Y' / 'I' / 'D' character reads come back with.
export type SectionWithItems = DraftSection;
type SectionItem = DraftItem;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STATUSES: SectionStatus[] = ["ACTIVE", "INACTIVE", "DRAFT"];


const HAS_META = new Set(["RECOMMENDED", "FEATURED_PRODUCTS", "TRENDING"]);
export const PRODUCT_SECTION_TYPES = new Set(["RECOMMENDED", "FEATURED_PRODUCTS", "TRENDING"]);
const TABLE_SECTION_TYPES = new Set(["HERO", "PROMO", "REVIEWS", "WHY_MAAYAA", "CATEGORIES", "WHY_SHOPWITH_MAAYAA"]);
const TALL_TYPES = new Set(["RECOMMENDED", "FEATURED_PRODUCTS", "TRENDING", "REVIEWS", "WHY_MAAYAA", "WHY_SHOPWITH_MAAYAA", "CATEGORIES", "PROMO"]);

// ─── TABS ─────────────────────────────────────────────────────────────────────

// ─── SECTION BLOCK ───────────────────────────────────────────────────────────
interface BlockProps {
  section: SectionWithItems;
  /**
   * Products already resolved by the caller, so a product card can show a name
   * and a price instead of an id. Optional: the classic list has no lookup of
   * its own and falls back to the id.
   */
  products?: Map<number, PreviewProduct>;
  onDelete: () => void;
  onUpdate: (p: Partial<DraftSection>) => void;
  onAddItem: (p: any) => void;
  onUpdateItem: (id: DraftId, p: any) => void;
  onDeleteItem: (id: DraftId) => void;
}

export const SectionBlock = ({ section, products, onDelete, onUpdate, onAddItem, onUpdateItem, onDeleteItem }: BlockProps) => {
  const readOnly = useReadOnly();
  const hasMeta = HAS_META.has(section.type);
  const isTall = TALL_TYPES.has(section.type);
  const isTableSection = TABLE_SECTION_TYPES.has(section.type);
  const isProductSection = PRODUCT_SECTION_TYPES.has(section.type);
  const isCategorySection = section.type === "CATEGORIES";
  const categoryNames = useCategoryNames(isCategorySection);
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

        <div className="flex items-center gap-2 ml-3 shrink-0">
          {/* Item count */}
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
            {section.items.length} item{section.items.length !== 1 ? "s" : ""}
          </span>

          {/* Status badge. The draft carries words; the 'Y' / 'I' / 'D' the
            backend stores is translated on the way in and out (draft/types). */}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            section.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
              : section.status === "INACTIVE"
              ? "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
          }`}>
            {section.status === "ACTIVE" ? "Active" : section.status === "INACTIVE" ? "Inactive" : "Draft"}
          </span>

          {!readOnly && (<>
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
          </>)}
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
                  linkToCategory={isCategorySection}
                  categoryNames={categoryNames}
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
                product={item.productId != null ? products?.get(item.productId) : undefined}
                existingProductIds={section.items.map((i) => i.productId).filter(Boolean) as number[]}
                onUpdate={(p) => onUpdateItem(item.itemId, p)}
                onDelete={() => onDeleteItem(item.itemId)}
              />
            ))}
            <AddItemCard
              tall={isTall}
              isProductSection={isProductSection}
              onAdd={onAddItem}
              existingProductIds={section.items.map((i) => i.productId).filter(Boolean) as number[]}
              allItems={section.items}
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
  currentItemId: DraftId | null, // null = adding new
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
  /** Category tiles link to a category rather than to a typed-in path. */
  linkToCategory?: boolean;
  categoryNames?: Map<number, string>;
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

const HeroItemCard = ({
  item, allItems, linkToCategory, categoryNames, onUpdate, onDelete,
}: HeroItemCardProps) => {
  const editFileRef = useRef<HTMLInputElement>(null);
  const [editImageModal, setEditImageModal] = useState(false);
  const [categoryPicker, setCategoryPicker] = useState(false);
  const [newImageName, setNewImageName] = useState(item.image ?? "");
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  /**
   * Uploads, then stores the URL the server gives back.
   *
   * This used to keep the file's NAME and nothing else, on the assumption that
   * hero images were hand-placed in the storefront bundle under
   * /assets/images/hero/. That directory does not exist, so every image saved
   * here resolved against the page root and 404'd - a black hero with a broken
   * image icon, on the live site as well as in the preview.
   */
  const handleEditFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Local preview first, so the modal shows the picture while it uploads.
    const r = new FileReader();
    r.onload = () => setPreviewDataUrl(r.result as string);
    r.readAsDataURL(f);

    setUploading(true);
    try {
      setNewImageName(await uploadImage(f));
    } catch {
      alert("Image upload failed");
      setPreviewDataUrl("");
    } finally {
      setUploading(false);
    }
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

  const imageSrc = resolveCmsImage(item.image);

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

      {/* Link — a free path for most sections, a category for category tiles */}
      <td className="py-3 pr-4 min-w-[120px]">
        {linkToCategory ? (
          <button
            onClick={() => setCategoryPicker(true)}
            className="flex w-full items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1.5 text-left text-[11px] text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            {item.categoryId ? (
              <>
                <span className="truncate font-medium">
                  {categoryNames?.get(item.categoryId) ?? `Category ${item.categoryId}`}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-gray-400">change</span>
              </>
            ) : (
              <span className="text-gray-400">Choose category…</span>
            )}
          </button>
        ) : (
          <InlineEdit
            value={item.link ?? ""}
            placeholder="/collection/..."
            onSave={(v) => onUpdate({ link: v || null })}
          />
        )}
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

      {/* Category picker. In a <td> because a table row may not hold anything
        else — the modal itself is fixed-position, so the cell is only a hook. */}
      {categoryPicker && (
        <td className="p-0 border-0">
          <CategoryPickerModal
            selectedId={item.categoryId}
            onClose={() => setCategoryPicker(false)}
            onSelect={(category) => {
              onUpdate({
                categoryId: category.categoryId,
                link: categoryLink(category.categoryId as number),
                // Only fill the heading if there isn't one: a tile may well be
                // captioned something other than the category's own name.
                ...(item.heading ? {} : { heading: category.name }),
              });
              setCategoryPicker(false);
            }}
          />
        </td>
      )}

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
                  <img src={resolveCmsImage(newImageName) ?? undefined} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : null}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                  </div>
                )}
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
                  <span className="text-xs font-mono text-gray-600 truncate flex-1" title={newImageName}>
                    {newImageName.split("/").pop()}
                  </span>
                </div>
              )}

              <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditFile} />

              <div className="flex gap-2">
                <button
                  onClick={saveImage}
                  disabled={uploading || !newImageName.trim()}
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
  const [uploading, setUploading] = useState(false);

  // Auto-suggest next available position
  const nextPos = allItems.length + 1;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const r = new FileReader();
    r.onload = () => setPreviewDataUrl(r.result as string);
    r.readAsDataURL(f);
    setExpanded(true);

    // See handleEditFile above: the file has to reach the server, or the row
    // stores a name that resolves to nothing.
    setUploading(true);
    try {
      const url = await uploadImage(f);
      setForm((prev) => ({ ...prev, imageName: url }));
    } catch {
      alert("Image upload failed");
      setPreviewDataUrl("");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setForm({ imageName: "", link: "", position: "" });
    setPreviewDataUrl("");
    setPosError("");
    setExpanded(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    if (uploading) { alert("The image is still uploading."); return; }
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
  /** Resolved catalogue entry for a product card, when the caller has one. */
  product?: PreviewProduct;
  /** So the picker can grey out products already in this section. */
  existingProductIds?: number[];
  onUpdate: (p: any) => void;
  onDelete: () => void;
}

const ItemCard = ({ item, tall, product, existingProductIds = [], onUpdate, onDelete }: ItemCardProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [productPicker, setProductPicker] = useState(false);
  const [linkEdit, setLinkEdit] = useState(false);
  const [linkVal, setLinkVal] = useState(item.link ?? "");
  const [uploading, setUploading] = useState(false);

  const isProduct = !!item.productId;
  const cardW = tall ? 100 : 120;
  const cardH = tall ? 130 : 78;

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage(f);
      onUpdate({ image: url });
    } catch {
      alert("Image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [onUpdate]);

  const saveLink = () => { onUpdate({ link: linkVal }); setLinkEdit(false); };

  if (isProduct) {
    // ── PRODUCT CARD ─────────────────────────────────────────────
    // The storefront draws these from the catalogue, not from the item: it
    // overrides the stored image with the product's own first photo and prices
    // it live. So the card shows the catalogue's answer where it has one, and
    // says plainly when it cannot find the product at all — an id pointing at a
    // deleted product renders as nothing on the live page.
    const missing = !product;
    const price = product?.discountedPrice ?? product?.basePrice ?? null;
    const struck =
      product?.basePrice != null &&
      product?.discountedPrice != null &&
      product.basePrice > product.discountedPrice
        ? product.basePrice
        : null;
    const thumb = product?.primaryImage ?? item.image;

    return (
      <>
      <div className="shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group" style={{ width: cardW }}>
        {/* Image — not clickable */}
        <div className="relative overflow-hidden bg-gray-50" style={{ height: cardH }}>
          {thumb ? (
            <img src={resolveCmsImage(thumb) ?? undefined} alt="" className="w-full h-full object-cover" />
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
          <p className="text-[10px] font-semibold text-gray-800 truncate leading-tight" title={product?.name ?? item.heading ?? ""}>
            {product?.name || item.heading || "—"}
          </p>

          {price != null ? (
            <p className="mt-0.5 flex items-baseline gap-1 text-[9px]">
              <span className="font-semibold text-gray-700">₹{price.toLocaleString()}</span>
              {struck != null && (
                <span className="text-gray-400 line-through">₹{struck.toLocaleString()}</span>
              )}
            </p>
          ) : (
            <p className={`mt-0.5 text-[9px] ${missing ? "text-red-500" : "text-gray-400"}`}>
              {missing ? `#${item.productId} not found` : `#${item.productId}`}
            </p>
          )}

          <button
            onClick={() => setProductPicker(true)}
            className="mt-1 w-full rounded border border-gray-200 py-0.5 text-[9px] font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
          >
            Change
          </button>
        </div>
      </div>

      {productPicker && (
        <ProductPickerModal
          existingProductIds={existingProductIds.filter((id) => id !== item.productId)}
          onClose={() => setProductPicker(false)}
          onSelect={(picked) => {
            onUpdate({
              productId: picked.productId,
              image: picked.images?.[0]?.url ?? null,
              link: `/product/${picked.productId}`,
              heading: picked.name,
            });
            setProductPicker(false);
          }}
        />
      )}
      </>
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
          <img src={resolveCmsImage(item.image) ?? undefined} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImagePlaceholderIcon />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading
            ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            : <CameraIcon />}
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


// ─── ADD ITEM CARD (non-hero) ─────────────────────────────────────────────────
const AddItemCard = ({
  tall, onAdd, isProductSection = false, existingProductIds = [], allItems = [],
}: { tall: boolean; onAdd: (p: any) => void; isProductSection?: boolean; existingProductIds?: number[]; allItems?: SectionItem[] }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ image: "", link: "", heading: "", position: "" });
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posError, setPosError] = useState("");

  const cardW = tall ? 90 : 115;
  const cardH = tall ? 115 : 72;
  const nextPos = allItems.length + 1;

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage(f);
      setForm((prev) => ({ ...prev, image: url }));
      setExpanded(true);
    } catch {
      alert("Image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const handleProductSelect = (product: PickerProduct) => {
    onAdd({
      productId: product.productId,
      image: product.images?.[0]?.url ?? null,
      link: `/product/${product.productId}`,
      heading: product.name,
      position: nextPos,
    });
    setPickerOpen(false);
  };

  const submit = () => {
    const pos = Number(form.position) || nextPos;
    const err = validatePosition(pos, null, allItems);
    if (err) { setPosError(err); return; }
    onAdd({
      image: form.image || null,
      link: form.link || null,
      heading: form.heading || null,
      position: pos,
    });
    setForm({ image: "", link: "", heading: "", position: "" });
    setPosError("");
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
          <img src={resolveCmsImage(form.image) ?? undefined} alt="" className="w-full h-20 object-cover rounded-lg" />
        )}
        <input placeholder="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
          className="text-[11px] border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none" />
        <input placeholder="Heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })}
          className="text-[11px] border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none" />
        <div className="flex flex-col gap-0.5">
          <input
            placeholder={`Position (${nextPos})`}
            type="number"
            value={form.position}
            onChange={(e) => { setForm({ ...form, position: e.target.value }); setPosError(""); }}
            className={`text-[11px] border rounded-md px-2 py-1.5 focus:outline-none ${posError ? "border-red-300 bg-red-50" : "border-gray-200"}`}
          />
          {posError && <p className="text-[10px] text-red-500 leading-tight">{posError}</p>}
        </div>
        <div className="flex gap-1.5">
          <button onClick={submit} className="flex-1 bg-gray-900 text-white text-[11px] font-bold py-1.5 rounded-lg">Add</button>
          <button onClick={() => { setExpanded(false); setPosError(""); }} className="text-[11px] text-gray-400 px-2 border border-gray-200 rounded-lg">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 shrink-0" style={{ width: cardW }}>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-500 hover:bg-gray-50 transition-all disabled:opacity-60"
        style={{ width: cardW, height: cardH }}
        title="Click to upload image"
      >
        {uploading
          ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          : <span className="text-xl font-light leading-none">+</span>}
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
  initial?: Partial<DraftSection>;
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
}

export const SectionModal = ({ initial, onClose, onSave }: ModalProps) => {
  const isEdit = !!initial?.sectionId;
  const [form, setForm] = useState({
    type: initial?.type ?? "HERO",
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    position: initial?.position?.toString() ?? "1",
    gender: initial?.gender ?? "OTHER",
    // A new section starts as a draft: it is saved, orderable and previewable,
    // but invisible to customers until someone deliberately makes it Active.
    status: initial?.status ?? "DRAFT",
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
                >{SECTION_LABEL[t] ?? t}</button>
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
                {GENDER_TABS.map(({ key, label }) => (
                  <button key={key} type="button"
                    onClick={() => setForm({ ...form, gender: key })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      form.gender === key
                        ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
                        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >{label}</button>
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

