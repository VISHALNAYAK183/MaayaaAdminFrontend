import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ADMIN_BASE, API_BASE, CLIENT_API_BASE, http } from "../api/client";
import JsBarcode from "jsbarcode";
import {
  getAdminProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type ProductResponse,
  type VariantImage,
  type QuestionAnswer,
  type Variant,
  type ProductSortBy,
  type ProductStockFilter,
} from "../api/Adminproduct";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getCategories, type Category } from "../api/adminCategory";
import { getCollections, type Collection } from "../api/Admincollection";
import { getSizes, type Size } from "../api/adminSize";
import { getColors, type Color } from "../api/adminColor";
import ProductAnalyticsModal from "../components/admin/ProductAnalyticsModal";
import {
  Field as Fld,
  SectionHeader as SH,
  StatusBanner,
  PageHeader,
  PageShell,
  FormModal,
  ConfirmDialog,
  StatCard,
  TableCard,
  TableLoadingRow,
  RowActions,
  inputCls,
  selectCls,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
  type Status,
} from "../components/admin";

// ─── Product-specific icons ────────────────────────────────────────────────
const BarcodeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h2M3 10h2M3 15h2M3 20h2M7 5v15M10 5v15M14 5v15M17 5v15M20 5h1v15h-1" />
  </svg>
);
const ImageIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const ReplaceIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const DuplicateIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </svg>
);
const DragHandleIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <circle cx="7" cy="5" r="1.4" />
    <circle cx="13" cy="5" r="1.4" />
    <circle cx="7" cy="10" r="1.4" />
    <circle cx="13" cy="10" r="1.4" />
    <circle cx="7" cy="15" r="1.4" />
    <circle cx="13" cy="15" r="1.4" />
  </svg>
);

// ─── Extended VariantImage with local upload fields ───────────────────────────
interface VariantImageLocal extends VariantImage {
  _file?: File;
  _preview?: string;
  _uploading?: boolean;
  _uploadError?: boolean;
}

// ─── IMAGE UPLOAD HELPER ─────────────────────────────────────────────────────
// Posts to the ADMIN backend's /api/admin/upload (field name "file"). In
// production both backends point app.upload.dir at the same shared folder, so
// a file uploaded here is served by api.maayaawear.com/uploads/ too — which is
// where the storefront resolves images from. Stores the host-relative
// "/uploads/<file>" verbatim (each frontend prefixes its own image base),
// keeping DB values portable across environments and the future S3 move.
const uploadImage = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append("file", file);
  const { url } = await http.upload<{ url: string }>(
    `${ADMIN_BASE}/upload`,
    fd,
    "upload image"
  );
  return url;
};

// ─── Gender options ───────────────────────────────────────────────────────────
// Values are the backend Gender enum names; labels are what the admin sees.
const GENDER_OPTIONS = [
  { value: "MALE", label: "Men" },
  { value: "FEMALE", label: "Women" },
  { value: "OTHER", label: "Unisex" },
];
const genderLabel = (g: string) =>
  GENDER_OPTIONS.find((o) => o.value === g)?.label ?? g;

// ─── Blank variant ────────────────────────────────────────────────────────────
const blankVariant = (): Variant => ({
  sizeId: 0,
  colorId: 0,
  quantity: 1,
  barcode: "",
  images: [{ url: "", postOrder: 1 }],
});

// ─── Blank form ───────────────────────────────────────────────────────────────
const blankForm = (): Omit<Product, "productId"> => ({
  name: "",
  categoryId: 0,
  collectionId: 0,
  gender: "",
  basePrice: 0,
  discountedPrice: 0,
  story: "",
  details: "",
  fabricDetails: "",
  hsnCode: "",
  // -1 = "not picked yet". 0 is a real, selectable rate (exempt goods).
  gstRate: -1,
  // 0 reads as "not measured": every one of these has to be above zero,
  // so unlike the GST rate there is no valid zero to confuse it with.
  weightKg: 0,
  lengthCm: 0,
  breadthCm: 0,
  heightCm: 0,
  questionsAnswers: [{ question: "", answer: "" }],
  variants: [blankVariant()],
  images: [],
});

// GST rates allowed for textiles + general retail. Per current GSTN slabs.
// 0% is valid (e.g. raw cotton, sanitary napkins, books).
const GST_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;

// ─── Resolve image URL ────────────────────────────────────────────────────────
const resolveImageUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  // Product images live on the customer backend (it serves /uploads/ and is
  // what the storefront resolves against); anything else falls back to the
  // admin backend (e.g. invoice assets).
  if (url.startsWith("/uploads/")) return `${CLIENT_API_BASE}${url}`;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return null;
};

// ─── Barcode Preview Component ────────────────────────────────────────────────
const BarcodePreview: React.FC<{ value: string; id: string }> = ({ value, id }) => {
  useEffect(() => {
    if (!value) return;
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    try {
      JsBarcode(canvas, value, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 4,
        background: "#f8fafc",
      });
    } catch {}
  }, [value, id]);

  if (!value) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-2">
      <canvas id={id} className="h-10" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CODE128</span>
        <span className="text-xs font-mono text-slate-600 truncate">{value}</span>
      </div>
    </div>
  );
};

// ─── Variant Image Sub-section (with file upload) ─────────────────────────────
const VariantImages: React.FC<{
  variantIndex: number;
  images: VariantImageLocal[];
  onChange: (variantIndex: number, images: VariantImageLocal[]) => void;
}> = ({ variantIndex, images, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);

  // Process dropped / selected files into image slots. Shows a preview +
  // "uploading" placeholder immediately, then swaps in the real server URL
  // once each file finishes uploading. Sequential so `working` stays the
  // single source of truth across awaits instead of racing stale props.
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const filledCount = images.filter((img) => img.url || img._uploading).length;
    const remaining = 5 - filledCount;
    if (remaining <= 0) return;

    const toAdd = Array.from(files).slice(0, remaining);
    let working: VariantImageLocal[] = [...images];

    toAdd.forEach((file) => {
      const preview = URL.createObjectURL(file);
      const entry: VariantImageLocal = { url: "", postOrder: 0, _file: file, _preview: preview, _uploading: true };
      const emptyIdx = working.findIndex((img) => !img.url && !img._uploading && !img._uploadError);
      if (emptyIdx !== -1) {
        working[emptyIdx] = entry;
      } else if (working.length < 5) {
        working.push(entry);
      }
    });

    working = working.map((img, i) => ({ ...img, postOrder: i + 1 }));
    onChange(variantIndex, working);

    for (const file of toAdd) {
      const idx = working.findIndex((img) => img._file === file && img._uploading);
      if (idx === -1) continue;
      try {
        const url = await uploadImage(file);
        working = working.map((img, i) => (i === idx ? { ...img, url, _uploading: false } : img));
      } catch {
        working = working.map((img, i) => (i === idx ? { ...img, _uploading: false, _uploadError: true } : img));
      }
      onChange(variantIndex, working);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingOver(true);
  };

  const handleDragLeave = () => setDraggingOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ""; // reset so same file can be re-selected
  };

  // Allow manual URL/filename edit (for existing products loaded from API)
  const updateImageUrl = (imgIdx: number, url: string) => {
    const updated = images.map((img, i) =>
      i === imgIdx ? { ...img, url, _file: undefined, _preview: undefined, _uploadError: false } : img
    );
    onChange(variantIndex, updated);
  };

  // Replace a single slot with a new file — uploads it for real, same as handleFiles.
  const replaceImage = (imgIdx: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const prev = images[imgIdx];
      if (prev._preview) URL.revokeObjectURL(prev._preview);

      let working = images.map((img, i) =>
        i === imgIdx
          ? { ...img, url: "", _file: file, _preview: URL.createObjectURL(file), _uploading: true, _uploadError: false }
          : img
      );
      onChange(variantIndex, working);

      try {
        const url = await uploadImage(file);
        working = working.map((img, i) => (i === imgIdx ? { ...img, url, _uploading: false } : img));
      } catch {
        working = working.map((img, i) => (i === imgIdx ? { ...img, _uploading: false, _uploadError: true } : img));
      }
      onChange(variantIndex, working);
    };
    input.click();
  };

  const removeImage = (imgIdx: number) => {
    const target = images[imgIdx];
    if (target._preview) URL.revokeObjectURL(target._preview);
    const updated = images
      .filter((_, i) => i !== imgIdx)
      .map((img, i) => ({ ...img, postOrder: i + 1 }));
    onChange(variantIndex, updated.length > 0 ? updated : [{ url: "", postOrder: 1 }]);
  };

  // ── Drag-to-reorder ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const onRowDragStart = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const onRowDragOver = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx === null || dragIdx === idx) return;
    setDragOverIdx(idx);
  };

  const onRowDrop = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onChange(variantIndex, next.map((img, i) => ({ ...img, postOrder: i + 1 })));
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const onRowDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // A slot is "occupied" while it holds a finished URL, an in-flight upload,
  // or a failed upload awaiting retry — otherwise the empty-state drop zone
  // replaces the list mid-upload and the 5-image cap ignores pending slots.
  const filledCount = images.filter((img) => img.url || img._uploading || img._uploadError).length;
  const canAdd = filledCount < 5;

  return (
    <div className="col-span-2 mt-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <ImageIcon />
          Variant Images ({filledCount}/5)
        </span>
        {canAdd && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <PlusIcon /> Add image
          </button>
        )}
      </div>

      {/* Hidden file input (multi) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Empty state drop zone */}
      {filledCount === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2.5 border-2 border-dashed rounded-xl py-7 cursor-pointer transition-all select-none
            ${draggingOver
              ? "border-blue-400 bg-blue-50 scale-[1.01]"
              : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
            }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
            ${draggingOver ? "bg-blue-100 text-blue-500" : "bg-slate-100 border border-slate-200 text-slate-400"}`}>
            <UploadIcon />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600">
              {draggingOver ? "Drop images here" : "Click or drag & drop images"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP — up to 5 images per variant</p>
          </div>
        </div>
      )}

      {/* Filled image list */}
      {filledCount > 0 && (
        <div className="flex flex-col gap-2">
          {images.map((img, imgIdx) => {
            if (!img.url && !img._preview) return null;
            const previewUrl = img._preview || resolveImageUrl(img.url);

            const isDragging = dragIdx === imgIdx;
            const isDragOver = dragOverIdx === imgIdx;

            return (
              <div
                key={imgIdx}
                draggable
                onDragStart={(e) => onRowDragStart(e, imgIdx)}
                onDragOver={(e) => onRowDragOver(e, imgIdx)}
                onDrop={(e) => onRowDrop(e, imgIdx)}
                onDragEnd={onRowDragEnd}
                className={`flex items-center gap-2.5 px-3 py-2 bg-white border rounded-xl shadow-sm transition-all
                  ${isDragging ? "opacity-40" : ""}
                  ${isDragOver ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}
                `}
              >
                {/* Drag handle */}
                <button
                  type="button"
                  className="w-5 h-7 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
                  title="Drag to reorder"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <DragHandleIcon />
                </button>
                {/* Order badge */}
                <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                  {img.postOrder}
                </div>

                {/* Thumbnail */}
                <div className="w-11 h-11 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-base">🖼️</div>
                  )}
                </div>

                {/* Filename / URL */}
                <div className="flex-1 min-w-0">
                  <input
                    value={img.url}
                    onChange={(e) => updateImageUrl(imgIdx, e.target.value)}
                    placeholder="filename or URL"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white"
                  />
                  {img._uploading ? (
                    <p className="text-[10px] text-blue-500 mt-0.5 font-semibold">Uploading…</p>
                  ) : img._uploadError ? (
                    <p className="text-[10px] text-red-500 mt-0.5 font-semibold">Upload failed — click ↻ to retry</p>
                  ) : img._file && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate pl-0.5">
                      📎 {img._file.name}
                      <span className="ml-1 text-slate-300">·</span>
                      <span className="ml-1">{(img._file.size / 1024).toFixed(1)} KB</span>
                    </p>
                  )}
                </div>

                {/* Replace button */}
                <button
                  type="button"
                  onClick={() => replaceImage(imgIdx)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
                  title="Replace with another file"
                >
                  <ReplaceIcon />
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(imgIdx)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                  title="Remove image"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}

          {/* Add-more drop zone */}
          {canAdd && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 cursor-pointer transition-all select-none
                ${draggingOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"
                }`}
            >
              <PlusIcon />
              <span className="text-xs text-slate-400">
                {draggingOver ? "Drop to add" : `Add more (${5 - filledCount} remaining)`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Thumbnail strip preview */}
      {filledCount > 0 && (
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {images.map((img, imgIdx) => {
            const url = img._preview || resolveImageUrl(img.url);
            if (!url) return null;
            return (
              <div
                key={imgIdx}
                className="relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 right-0.5 bg-black/50 text-white text-[8px] font-bold px-1 rounded">
                  #{img.postOrder}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Side Panel Tab type ──────────────────────────────────────────────────────
type PanelTab = "overview" | "description" | "media" | "qa";

// ─── Side Panel: Product Details ──────────────────────────────────────────────
const ProductDetailPanel: React.FC<{
  product: ProductResponse | null;
  sizes: Size[];
  colors: Color[];
  onClose: () => void;
}> = ({ product, sizes, colors, onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [product?.productId]);

  if (!product) return null;

  const firstVariantImage = product.variants
    ?.flatMap((v) => v.images ?? [])
    .sort((a, b) => a.postOrder - b.postOrder)[0];
  const headerImageUrl = resolveImageUrl(firstVariantImage?.url ?? product.images?.[0]?.url);

  const resolveSizeLabel = (sizeId: number): string => {
    if (!sizeId) return "—";
    const found = sizes.find((s) => (s as any).sizeId === sizeId);
    return found ? (found as any).label : `#${sizeId}`;
  };

  const resolveColorObj = (colorId: number): Color | undefined => {
    if (!colorId) return undefined;
    return colors.find((c) => (c as any).colorId === colorId);
  };

  const tabs: { id: PanelTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "description", label: "Description", icon: "📝" },
    { id: "media", label: "Media", icon: "🖼️" },
    { id: "qa", label: "Q&A", icon: "❓" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[460px] max-w-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
              {headerImageUrl ? (
                <img src={headerImageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">📦</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight truncate">{product.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">ID #{product.productId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors shrink-0 ml-2"
          >
            <XIcon />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 bg-white shrink-0 px-4 pt-2 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 -mb-px
                ${activeTab === tab.id
                  ? "border-slate-900 text-slate-900 bg-slate-50"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Tab: Overview ── */}
          {activeTab === "overview" && (
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Base Price</p>
                  <p className="text-sm font-bold text-slate-400 line-through">₹{product.basePrice}</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Sale Price</p>
                  <p className="text-base font-extrabold text-slate-800">₹{product.discountedPrice}</p>
                </div>
                {product.basePrice > product.discountedPrice && (
                  <>
                    <div className="w-px h-10 bg-slate-200" />
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Discount</p>
                      <span className="text-sm font-bold text-green-600">
                        {Math.round(((product.basePrice - product.discountedPrice) / product.basePrice) * 100)}% off
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Variants ({(product.variants ?? []).length})
                </p>
                {(product.variants ?? []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No variants found</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {(product.variants ?? []).map((v, i) => {
                      const sizeName = resolveSizeLabel(v.sizeId);
                      const colorObj = resolveColorObj(v.colorId);
                      const variantImages = (v.images ?? []).filter((img) => img.url);
                      return (
                        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-bold rounded">{sizeName}</span>
                            {colorObj && (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                                  style={{ backgroundColor: (colorObj as any).hex }}
                                />
                                <span className="text-xs font-medium text-slate-700">{(colorObj as any).name}</span>
                              </div>
                            )}
                            <span className={`ml-auto text-xs font-bold ${v.quantity === 0 ? "text-red-500" : "text-slate-700"}`}>
                              Qty: {v.quantity}
                            </span>
                          </div>
                          {variantImages.length > 0 ? (
                            <div className="flex gap-1.5 px-3 py-3 flex-wrap">
                              {variantImages.map((img, imgIdx) => {
                                const url = resolveImageUrl(img.url);
                                return url ? (
                                  <div key={imgIdx} className="relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0.5 right-0.5 bg-black/50 text-white text-[8px] font-bold px-1 rounded">
                                      #{img.postOrder}
                                    </span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-400 italic">No images for this variant</div>
                          )}
                          {v.barcode && (
                            <div className="px-4 pb-3">
                              <span className="font-mono text-[10px] text-slate-400">{v.barcode}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Description ── */}
          {activeTab === "description" && (
            <div className="px-6 py-5 space-y-4">
              {!product.story && !product.details && !product.fabricDetails ? (
                <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                  <span className="text-4xl">📝</span>
                  <p className="text-sm font-medium">No description added</p>
                </div>
              ) : (
                <>
                  {product.story && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <span className="text-base">✨</span>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Story</span>
                      </div>
                      <div className="px-4 py-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{product.story}</p>
                      </div>
                    </div>
                  )}
                  {product.details && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <span className="text-base">📋</span>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Details</span>
                      </div>
                      <div className="px-4 py-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{product.details}</p>
                      </div>
                    </div>
                  )}
                  {product.fabricDetails && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <span className="text-base">🧵</span>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Fabric Details</span>
                      </div>
                      <div className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {product.fabricDetails.split(",").map((f, i) => (
                            <span key={i} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg">
                              {f.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Tab: Media ── */}
          {activeTab === "media" && (
            <div className="px-6 py-5 space-y-5">
              {(product.variants ?? []).every((v) => !(v.images ?? []).some((img) => img.url)) ? (
                <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                  <span className="text-4xl">🖼️</span>
                  <p className="text-sm font-medium">No variant images added</p>
                </div>
              ) : (
                (product.variants ?? []).map((v, vi) => {
                  const sizeName = resolveSizeLabel(v.sizeId);
                  const colorObj = resolveColorObj(v.colorId);
                  const variantImages = (v.images ?? []).filter((img) => img.url);
                  if (variantImages.length === 0) return null;
                  return (
                    <div key={vi}>
                      <div className="flex items-center gap-2 mb-2">
                        {colorObj && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: (colorObj as any).hex }}
                          />
                        )}
                        <span className="text-xs font-bold text-slate-600">
                          {sizeName} / {colorObj ? (colorObj as any).name : `Color #${v.colorId}`}
                        </span>
                        <span className="text-[10px] text-slate-400">({variantImages.length} image{variantImages.length !== 1 ? "s" : ""})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {variantImages.map((img, imgIdx) => {
                          const url = resolveImageUrl(img.url);
                          return (
                            <div key={imgIdx} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                              {url ? (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl">🖼️</div>
                              )}
                              <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                #{img.postOrder}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Tab: Q&A ── */}
          {activeTab === "qa" && (
            <div className="px-6 py-5">
              {(product.questionsAnswers ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                  <span className="text-4xl">❓</span>
                  <p className="text-sm font-medium">No Q&A added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                    {product.questionsAnswers.length} Question{product.questionsAnswers.length !== 1 ? "s" : ""}
                  </p>
                  {product.questionsAnswers.map((qa, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-start gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">Q</span>
                        <p className="text-xs font-bold text-slate-700">{qa.question}</p>
                      </div>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">A</span>
                        <p className="text-xs text-slate-600 leading-relaxed">{qa.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Sort header button ───────────────────────────────────────────────────────
const SortHeader: React.FC<{
  label: string;
  col: "id" | "name" | "price" | "stock";
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}> = ({ label, col: _col, active, dir, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide transition-colors ${
      active ? "text-slate-800" : "text-slate-500 hover:text-slate-700"
    }`}
  >
    {label}
    <span className={`text-[10px] ${active ? "opacity-100" : "opacity-30"}`}>
      {active && dir === "asc" ? "▲" : "▼"}
    </span>
  </button>
);

// ─── Form Step Bar ────────────────────────────────────────────────────────────
const FORM_STEPS = [
  { id: 0, label: "Basics", icon: "📦" },
  { id: 1, label: "Pricing", icon: "💰" },
  { id: 2, label: "Description", icon: "📝" },
  { id: 3, label: "Variants", icon: "🎨" },
  { id: 4, label: "Q&A", icon: "❓" },
] as const;

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [form, setForm] = useState<Omit<Product, "productId">>(blankForm());
  const [detailProduct, setDetailProduct] = useState<ProductResponse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Form step (0-4) ──
  const [formStep, setFormStep] = useState(0);

  // ── Analytics modal ──
  const [analyticsProduct, setAnalyticsProduct] = useState<{ id: number; name: string } | null>(null);

  // ── Filters ──
  const [filterCategory, setFilterCategory] = useState<number>(0);
  const [filterCollection, setFilterCollection] = useState<number>(0);
  const [filterGender, setFilterGender] = useState<string>("");
  const [filterStock, setFilterStock] = useState<"all" | "in" | "low" | "out">("all");

  // ── Sort ──
  const [sortBy, setSortBy] = useState<"id" | "name" | "price" | "stock">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Pagination ──
  // page is 1-indexed in this component (the UI says "Page X of Y"); the
  // backend uses 0-indexed pages, so we subtract 1 when calling the API.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);

  // Out-of-order response guard.
  const fetchSeq = useRef(0);

  useEffect(() => { loadLookups(); }, []);

  // Reset to page 1 whenever filters/search/pageSize change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCategory, filterCollection, filterGender, filterStock, pageSize, sortBy, sortDir]);

  // Refetch the product list whenever any server-side input changes.
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, filterCategory, filterCollection, filterGender, filterStock, sortBy, sortDir]);

  /**
   * Categories, collections, sizes, colours are essentially static — load
   * once on mount. Splitting these out keeps the product fetch quick and
   * lets the lookups survive a filter change.
   */
  const loadLookups = async () => {
    try {
      const [catRes, colRes, sizeRes, colorRes] = await Promise.all([
        getCategories(), getCollections(), getSizes(), getColors(),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : [catRes.data]);
      setCollections(Array.isArray(colRes.data) ? colRes.data : [colRes.data]);
      setSizes(Array.isArray(sizeRes.data) ? sizeRes.data : [sizeRes.data]);
      setColors(Array.isArray(colorRes.data) ? colorRes.data : [colorRes.data]);
    } catch {
      setStatus({ type: "error", msg: "Failed to load lookups." });
    }
  };

  /**
   * Server-paged product fetch — every filter/sort/page change comes here.
   * Race protection: if the user clicks faster than the server responds,
   * older responses are discarded so the table never displays stale rows.
   */
  const loadProducts = async () => {
    const seq = ++fetchSeq.current;
    setTableLoading(true);
    try {
      const res = await getAdminProducts({
        categoryId:   filterCategory || undefined,
        collectionId: filterCollection || undefined,
        gender:       filterGender || undefined,
        name:         debouncedSearch || undefined,
        stock:        filterStock as ProductStockFilter,
        sortBy:       sortBy as ProductSortBy,
        sortDir,
        page:         Math.max(0, page - 1),
        size:         pageSize,
      });
      if (seq !== fetchSeq.current) return;
      setProducts(res.items ?? []);
      setTotalProducts(res.total ?? 0);
    } catch {
      if (seq !== fetchSeq.current) return;
      setStatus({ type: "error", msg: "Failed to load products." });
      setProducts([]);
      setTotalProducts(0);
    } finally {
      if (seq === fetchSeq.current) setTableLoading(false);
    }
  };

  /**
   * Same lookups + the first product page. Called after a mutation
   * (create / update / delete / bulk delete) so the table reflects the
   * change immediately. Lookups rarely change but a category/collection
   * just-added in another tab should appear next time the user opens
   * the filter dropdown.
   */
  const loadAll = async () => {
    await loadLookups();
    await loadProducts();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setStatus(null);
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Q&A ──
  const updateQA = (i: number, field: keyof QuestionAnswer, value: string) => {
    setForm((prev) => {
      const qa = [...prev.questionsAnswers];
      qa[i] = { ...qa[i], [field]: value };
      return { ...prev, questionsAnswers: qa };
    });
  };
  const addQA = () =>
    setForm((prev) => ({ ...prev, questionsAnswers: [...prev.questionsAnswers, { question: "", answer: "" }] }));
  const removeQA = (i: number) =>
    setForm((prev) => ({ ...prev, questionsAnswers: prev.questionsAnswers.filter((_, idx) => idx !== i) }));

  // ── Variants ──
  const updateVariant = (i: number, field: keyof Variant, value: string | number) => {
    setForm((prev) => {
      const variants = [...prev.variants];
      const newValue = ["sizeId", "colorId", "quantity"].includes(field as string) ? Number(value) : value;
      variants[i] = { ...variants[i], [field]: newValue };

      // Joining an existing colour (another size already has that colorId with
      // images set) — inherit its images. Images never vary by size here, so a
      // newly added size under an existing colour should show that colour's
      // photos immediately instead of starting blank.
      if (field === "colorId" && newValue) {
        const sibling = variants.find(
          (v, idx) => idx !== i && v.colorId === newValue && (v.images ?? []).some((img) => img.url)
        );
        if (sibling) {
          variants[i] = { ...variants[i], images: sibling.images };
        } else {
          // New colour with no images yet. If the old colour still has other
          // rows, this row's images belong to that group — don't drag them
          // into the new colour. A row that was its colour's ONLY row is a
          // rename (wrong colour picked), so its images follow it.
          const oldColorId = prev.variants[i].colorId;
          const oldColorHasOtherRows =
            oldColorId && prev.variants.some((v, idx) => idx !== i && v.colorId === oldColorId);
          if (oldColorHasOtherRows) {
            variants[i] = { ...variants[i], images: [{ url: "", postOrder: 1 }] };
          }
        }
      }

      return { ...prev, variants };
    });
  };

  // Images are keyed to a colour, not a single size row — writing to every
  // variant index that currently shares this colour keeps them all in sync
  // from one upload instead of requiring a re-upload per size.
  const updateColorImages = (indices: number[], images: VariantImageLocal[]) => {
    setForm((prev) => {
      const variants = [...prev.variants];
      indices.forEach((idx) => {
        variants[idx] = { ...variants[idx], images };
      });
      return { ...prev, variants };
    });
  };

  const addVariant = () =>
    setForm((prev) => ({ ...prev, variants: [...prev.variants, blankVariant()] }));

  const removeVariant = (i: number) =>
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, idx) => idx !== i) }));

  // Group variant rows by colour for rendering — every size sharing a colour
  // shows one image uploader instead of one per size. Recomputed from
  // form.variants on every render so it self-heals when colours are changed
  // or rows are added/removed; colorId 0 (not yet picked) never groups with
  // another unset row.
  const colorGroups = useMemo(() => {
    const map = new Map<string, { key: string; colorId: number; indices: number[] }>();
    form.variants.forEach((v, i) => {
      const key = v.colorId ? `c-${v.colorId}` : `new-${i}`;
      if (!map.has(key)) map.set(key, { key, colorId: v.colorId, indices: [] });
      map.get(key)!.indices.push(i);
    });
    return [...map.values()];
  }, [form.variants]);

  // ── Barcode generator ──
  const generateBarcode = useCallback(
    (index: number) => {
      setForm((prev) => {
        const variant = prev.variants[index];
        const sizeObj = sizes.find((s) => (s as any).sizeId === variant.sizeId);
        const sizeName = sizeObj ? (sizeObj as any).label : "SZ";
        const colorObj = colors.find((c) => (c as any).colorId === variant.colorId);
        const colorName = colorObj ? (colorObj as any).name : "CLR";
        const productSlug = (prev.name || "PROD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(3, "X");
        const barcode = `${productSlug}-${colorName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)}-${sizeName.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
        const variants = [...prev.variants];
        variants[index] = { ...variants[index], barcode };
        return { ...prev, variants };
      });
    },
    [sizes, colors]
  );

  const generateAllBarcodes = useCallback(() => {
    form.variants.forEach((v, i) => {
      if (Number(v.sizeId) > 0 && Number(v.colorId) > 0) generateBarcode(i);
    });
  }, [form.variants, generateBarcode]);

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormStep(0);
      return setStatus({ type: "error", msg: "Product name is required." });
    }
    if (!form.categoryId) {
      setFormStep(0);
      return setStatus({ type: "error", msg: "Please select a category." });
    }
    if (!form.collectionId) {
      setFormStep(0);
      return setStatus({ type: "error", msg: "Please select a collection." });
    }
    if (!form.gender) {
      setFormStep(0);
      return setStatus({ type: "error", msg: "Please select a gender." });
    }
    if (Number(form.basePrice) <= 0) {
      setFormStep(1);
      return setStatus({ type: "error", msg: "Base price must be greater than 0." });
    }
    if (Number(form.discountedPrice) <= 0) {
      setFormStep(1);
      return setStatus({ type: "error", msg: "Discounted price must be greater than 0." });
    }
    if (Number(form.discountedPrice) >= Number(form.basePrice)) {
      setFormStep(1);
      return setStatus({ type: "error", msg: "Discounted price must be less than base price." });
    }
    if (!form.hsnCode || !form.hsnCode.trim()) {
      setFormStep(1);
      return setStatus({ type: "error", msg: "HSN code is required for GST filing." });
    }
    if (Number(form.gstRate) < 0 || !Number.isFinite(Number(form.gstRate))) {
      setFormStep(1);
      return setStatus({ type: "error", msg: "Select a GST rate (0 / 5 / 12 / 18 / 28%)." });
    }
    if (Number(form.weightKg) <= 0) {
      setFormStep(1);
      return setStatus({ type: "error", msg: "Packed weight is required — a courier will not take a parcel without it." });
    }
    if (Number(form.lengthCm) <= 0 || Number(form.breadthCm) <= 0 || Number(form.heightCm) <= 0) {
      setFormStep(1);
      return setStatus({ type: "error", msg: "Box length, breadth and height are all required." });
    }

    // Variant uniqueness — no two variants may share the same size + colour
    const validVariants = form.variants.filter((v) => v.sizeId && v.colorId);
    const variantKeys = new Set<string>();
    for (const v of validVariants) {
      const key = `${v.sizeId}-${v.colorId}`;
      if (variantKeys.has(key)) {
        setFormStep(3);
        const sizeLabel = (sizes.find((s) => (s as any).sizeId === v.sizeId) as any)?.label ?? `#${v.sizeId}`;
        const colorName = (colors.find((c) => (c as any).colorId === v.colorId) as any)?.name ?? `#${v.colorId}`;
        return setStatus({ type: "error", msg: `Duplicate variant: ${sizeLabel} / ${colorName} appears twice.` });
      }
      variantKeys.add(key);
    }

    const stillUploading = form.variants.some((v) =>
      (v.images ?? []).some((img) => (img as VariantImageLocal)._uploading)
    );
    if (stillUploading) {
      setFormStep(3);
      return setStatus({ type: "error", msg: "Please wait for image uploads to finish before saving." });
    }

    // A failed slot has an empty url and would be silently dropped from the
    // payload — the product would save looking fine but missing that image.
    const hasFailedUpload = form.variants.some((v) =>
      (v.images ?? []).some((img) => (img as VariantImageLocal)._uploadError)
    );
    if (hasFailedUpload) {
      setFormStep(3);
      return setStatus({ type: "error", msg: "An image failed to upload — retry (↻) or remove it before saving." });
    }

    setLoading(true);
    setStatus(null);
    try {
      const payload: Omit<Product, "productId"> = {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        collectionId: Number(form.collectionId),
        gender: form.gender,
        basePrice: Number(form.basePrice),
        discountedPrice: Number(form.discountedPrice),
        story: form.story ?? "",
        details: form.details ?? "",
        fabricDetails: form.fabricDetails ?? "",
        hsnCode: (form.hsnCode ?? "").trim(),
        gstRate: Number(form.gstRate),
        weightKg: Number(form.weightKg),
        lengthCm: Number(form.lengthCm),
        breadthCm: Number(form.breadthCm),
        heightCm: Number(form.heightCm),
        images: [],
        questionsAnswers: form.questionsAnswers.filter((qa) => qa.question.trim()),
        variants: form.variants
          .filter((v) => v.sizeId && v.colorId)
          .map((v) => ({
            ...(v.variantId ? { variantId: v.variantId } : {}),
            sizeId: Number(v.sizeId),
            colorId: Number(v.colorId),
            quantity: Number(v.quantity),
            barcode: v.barcode ?? "",
            images: (v.images ?? [])
              .filter((img) => img.url.trim())
              .map((img, idx) => ({
                ...(v.variantId ? { variantId: v.variantId } : {}),
                url: img.url.trim(),
                postOrder: idx + 1,
              })),
          })),
      };

      if (editingId !== null) {
        await updateProduct(editingId, payload);
        setStatus({ type: "success", msg: `Product "${form.name}" updated successfully!` });
      } else {
        await addProduct(payload);
        setStatus({ type: "success", msg: `Product "${form.name}" created successfully!` });
      }
      reset();
      loadAll();
    } catch (err: any) {
      setStatus({ type: "error", msg: err?.message || `Failed to ${editingId !== null ? "update" : "create"} product.` });
    } finally {
      setLoading(false);
    }
  };

  // ── Edit: map ProductResponse → form shape ──
  const handleEdit = (product: ProductResponse) => {
    const mappedVariants: Variant[] = (product.variants ?? []).map((v: any) => ({
      variantId: v.variantId,
      sizeId: Number(v.sizeId ?? 0),
      colorId: Number(v.colorId ?? 0),
      quantity: Number(v.quantity ?? 0),
      barcode: v.barcode ?? "",
      images: (v.images ?? []).length > 0 ? v.images : [{ url: "", postOrder: 1 }],
    }));

    setForm({
      name: product.name ?? "",
      categoryId: Number(product.categoryId ?? 0),
      collectionId: Number(product.collectionId ?? 0),
      gender: product.gender ?? "",
      basePrice: Number(product.basePrice ?? 0),
      discountedPrice: Number(product.discountedPrice ?? 0),
      story: product.story ?? "",
      details: product.details ?? "",
      fabricDetails: product.fabricDetails ?? "",
      hsnCode: product.hsnCode ?? "",
      // null → force re-selection. 0 is a real rate (exempt goods).
      gstRate: product.gstRate == null ? -1 : Number(product.gstRate),
      weightKg: Number(product.weightKg ?? 0),
      lengthCm: Number(product.lengthCm ?? 0),
      breadthCm: Number(product.breadthCm ?? 0),
      heightCm: Number(product.heightCm ?? 0),
      questionsAnswers: product.questionsAnswers?.length
        ? product.questionsAnswers
        : [{ question: "", answer: "" }],
      variants: mappedVariants.length ? mappedVariants : [blankVariant()],
      images: [],
    });
    setEditingId(product.productId ?? null);
    setShowForm(true);
    setStatus(null);
    setDetailProduct(null);
    setFormStep(0);
  };

  const requestDelete = (id: number, name: string) => {
    setPendingDelete({ id, name });
  };

  // ── Bulk selection ──
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageSelect = (ids: number[], allChecked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteProduct(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        setStatus({ type: "success", msg: `${ids.length} product${ids.length !== 1 ? "s" : ""} deleted.` });
      } else {
        setStatus({ type: "error", msg: `Deleted ${ids.length - failed} of ${ids.length}. ${failed} failed.` });
      }
      clearSelection();
      setPendingBulkDelete(false);
      loadAll();
    } finally {
      setBulkDeleting(false);
    }
  };

  // ── Duplicate: prefill form from existing product, drop variantId/productId ──
  const handleDuplicate = (product: ProductResponse) => {
    const mappedVariants: Variant[] = (product.variants ?? []).map((v: any) => ({
      sizeId: Number(v.sizeId ?? 0),
      colorId: Number(v.colorId ?? 0),
      quantity: Number(v.quantity ?? 0),
      barcode: "",
      images: (v.images ?? [])
        .filter((img: VariantImage) => img.url)
        .map((img: VariantImage, idx: number) => ({ url: img.url, postOrder: idx + 1 })),
    }));

    setForm({
      name: `${product.name} (Copy)`,
      categoryId: Number(product.categoryId ?? 0),
      collectionId: Number(product.collectionId ?? 0),
      gender: product.gender ?? "",
      basePrice: Number(product.basePrice ?? 0),
      discountedPrice: Number(product.discountedPrice ?? 0),
      story: product.story ?? "",
      details: product.details ?? "",
      fabricDetails: product.fabricDetails ?? "",
      hsnCode: product.hsnCode ?? "",
      // null → force re-selection. 0 is a real rate (exempt goods).
      gstRate: product.gstRate == null ? -1 : Number(product.gstRate),
      weightKg: Number(product.weightKg ?? 0),
      lengthCm: Number(product.lengthCm ?? 0),
      breadthCm: Number(product.breadthCm ?? 0),
      heightCm: Number(product.heightCm ?? 0),
      questionsAnswers: product.questionsAnswers?.length
        ? product.questionsAnswers
        : [{ question: "", answer: "" }],
      variants: mappedVariants.length ? mappedVariants : [blankVariant()],
      images: [],
    });
    setEditingId(null);
    setShowForm(true);
    setStatus({ type: "success", msg: `Duplicated "${product.name}" — review and save.` });
    setDetailProduct(null);
    setFormStep(0);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteProduct(id);
      setStatus({ type: "success", msg: `Product "${name}" deleted.` });
      if (detailProduct?.productId === id) setDetailProduct(null);
      loadAll();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete product." });
    }
  };

  const reset = () => {
    setForm(blankForm());
    setEditingId(null);
    setShowForm(false);
    setStatus(null);
    setFormStep(0);
  };

  const clearFilters = () => {
    setFilterCategory(0);
    setFilterCollection(0);
    setFilterGender("");
    setFilterStock("all");
    setSearch("");
  };

  const hasActiveFilters =
    filterCategory !== 0 ||
    filterCollection !== 0 ||
    filterGender !== "" ||
    filterStock !== "all" ||
    search !== "";

  // ── Stock helpers ──
  const getTotalStock = (p: ProductResponse): number =>
    (p.variants ?? []).reduce((sum, v) => sum + Number(v.quantity ?? 0), 0);

  const getStockStatus = (p: ProductResponse): "in" | "low" | "out" => {
    const total = getTotalStock(p);
    if (total === 0) return "out";
    if (total < 10) return "low";
    return "in";
  };

  const toggleSort = (col: "name" | "price" | "stock" | "id") => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  // Server already filtered / sorted / paginated — `products` is the
  // current page directly. `paged` kept as an alias for the JSX below
  // which iterates rows under that name.
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = products;

  const discountPreview =
    form.basePrice > 0 && form.discountedPrice > 0 && Number(form.discountedPrice) < Number(form.basePrice)
      ? Math.round(((Number(form.basePrice) - Number(form.discountedPrice)) / Number(form.basePrice)) * 100)
      : 0;

  const discountedExceedsBase =
    Number(form.basePrice) > 0 &&
    Number(form.discountedPrice) > 0 &&
    Number(form.discountedPrice) >= Number(form.basePrice);

  const canGenerateBarcode = (v: Variant): boolean =>
    form.name.trim().length > 0 && Number(v.sizeId) > 0 && Number(v.colorId) > 0;

  const canGenerateAnyBarcode =
    form.name.trim().length > 0 &&
    form.variants.some((v) => Number(v.sizeId) > 0 && Number(v.colorId) > 0);

  // ── Validate a single step. Returns error message or null. ──
  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!form.name.trim()) return "Product name is required.";
      if (!form.categoryId) return "Please select a category.";
      if (!form.collectionId) return "Please select a collection.";
      if (!form.gender) return "Please select a gender.";
      return null;
    }
    if (step === 1) {
      if (Number(form.basePrice) <= 0) return "Base price must be greater than 0.";
      if (Number(form.discountedPrice) <= 0) return "Discounted price must be greater than 0.";
      if (Number(form.discountedPrice) >= Number(form.basePrice))
        return "Discounted price must be less than base price.";
      // GST classification — also enforced on submit but failing here avoids
      // the user racing all the way to step 4 only to be bounced back.
      if (!form.hsnCode || !form.hsnCode.trim()) return "HSN code is required for GST filing.";
      if (Number(form.gstRate) < 0 || !Number.isFinite(Number(form.gstRate))) return "Select a GST rate (0 / 5 / 12 / 18 / 28%).";
      // Parcel measurements — the courier refuses an order without them, and
      // finding that out at the ship button is far too late.
      if (Number(form.weightKg) <= 0) return "Packed weight is required — a courier will not take a parcel without it.";
      if (Number(form.lengthCm) <= 0 || Number(form.breadthCm) <= 0 || Number(form.heightCm) <= 0)
        return "Box length, breadth and height are all required.";
      return null;
    }
    if (step === 3) {
      const validVariants = form.variants.filter((v) => v.sizeId && v.colorId);
      if (validVariants.length === 0) return "Add at least one variant with size and colour.";
      const seen = new Set<string>();
      for (const v of validVariants) {
        const key = `${v.sizeId}-${v.colorId}`;
        if (seen.has(key)) {
          const sizeLabel = (sizes.find((s) => (s as any).sizeId === v.sizeId) as any)?.label ?? `#${v.sizeId}`;
          const colorName = (colors.find((c) => (c as any).colorId === v.colorId) as any)?.name ?? `#${v.colorId}`;
          return `Duplicate variant: ${sizeLabel} / ${colorName} appears twice.`;
        }
        seen.add(key);
      }
      return null;
    }
    return null;
  };

  const stepError = validateStep(formStep);
  const isLastStep = formStep === FORM_STEPS.length - 1;

  const handleNext = () => {
    const err = validateStep(formStep);
    if (err) {
      setStatus({ type: "error", msg: err });
      return;
    }
    setFormStep((s) => Math.min(FORM_STEPS.length - 1, s + 1));
  };

  // Clicking a step tab: allow going back freely; going forward only if all preceding steps are valid.
  const handleStepTabClick = (target: number) => {
    if (target <= formStep) {
      setFormStep(target);
      return;
    }
    for (let s = formStep; s < target; s++) {
      const err = validateStep(s);
      if (err) {
        setFormStep(s);
        setStatus({ type: "error", msg: err });
        return;
      }
    }
    setFormStep(target);
  };

  return (
    <PageShell>
      <PageHeader
        title="Product Management"
        subtitle="Create and manage your product catalog"
        actionLabel="New Product"
        onAction={() => { reset(); setShowForm(true); }}
      />

      <StatusBanner status={status} onClose={() => setStatus(null)} />

      {/* ── Modal ── */}
      <FormModal
        open={showForm}
        title={editingId !== null ? "Edit Product" : "Create New Product"}
        onClose={reset}
        onSubmit={handleSubmit}
        loading={loading}
        maxWidth="4xl"
        submitLabel={editingId !== null ? "Update Product" : "Create Product"}
        submittingLabel={editingId !== null ? "Updating..." : "Creating..."}
      >
              {/* ── Step Bar ── */}
              <div className="flex items-center gap-1 mb-2 -mt-1">
                {FORM_STEPS.map((step, i) => (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => handleStepTabClick(step.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                        ${formStep === step.id
                          ? "bg-slate-900 text-white shadow-sm"
                          : formStep > step.id
                            ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                      <span className="text-sm">{formStep > step.id ? "✓" : step.icon}</span>
                      <span>{step.label}</span>
                    </button>
                    {i < FORM_STEPS.length - 1 && (
                      <div className={`flex-1 h-px ${formStep > step.id ? "bg-green-200" : "bg-slate-200"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* ── 1. Basic Info ── */}
              {formStep === 0 && (
              <div>
                <SH icon="📦" title="Basic Information" desc="Name, category, collection and gender" />
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <Fld label="Product Name" req>
                      <input name="name" value={form.name} onChange={handleChange}
                        placeholder="e.g. Premium Cotton Hoodie" className={inputCls} autoFocus />
                    </Fld>
                  </div>
                  <Fld label="Category" req>
                    <select name="categoryId" value={form.categoryId} onChange={handleChange} className={selectCls}>
                      <option value={0}>Select category…</option>
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                      ))}
                    </select>
                  </Fld>
                  <Fld label="Collection" req>
                    <select name="collectionId" value={form.collectionId} onChange={handleChange} className={selectCls}>
                      <option value={0}>Select collection…</option>
                      {collections.map((c) => (
                        <option key={c.collectionId} value={c.collectionId}>{c.name}</option>
                      ))}
                    </select>
                  </Fld>
                  <Fld label="Gender" req>
                    <select name="gender" value={form.gender} onChange={handleChange} className={selectCls}>
                      <option value="">Select gender…</option>
                      {GENDER_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Fld>
                </div>
              </div>
              )}

              {/* ── 2. Pricing ── */}
              {formStep === 1 && (
              <div>
                <SH icon="💰" title="Pricing" desc="Set the base and discounted prices" />
                <div className="grid grid-cols-2 gap-5">
                  <Fld label="Base Price (₹)" req>
                    <div className="relative">
                      <input type="number" name="basePrice" value={form.basePrice || ""}
                        onChange={handleChange} placeholder="e.g. 2799" className={`${inputCls} pr-7`} min={0} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">₹</span>
                    </div>
                  </Fld>
                  <Fld label="Discounted Price (₹)" req>
                    <div className="relative">
                      <input type="number" name="discountedPrice" value={form.discountedPrice || ""}
                        onChange={handleChange} placeholder="e.g. 1799"
                        className={`${inputCls} pr-7 ${discountedExceedsBase ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                        min={0} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">₹</span>
                    </div>
                    {discountedExceedsBase && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                        <span>⚠</span> Discounted price must be less than base price
                      </p>
                    )}
                  </Fld>
                  {discountPreview > 0 && !discountedExceedsBase && (
                    <div className="col-span-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-xs font-bold text-green-700">{discountPreview}% off</span>
                        <span className="text-xs text-green-600">Customer saves ₹{Number(form.basePrice) - Number(form.discountedPrice)}</span>
                      </div>
                    </div>
                  )}

                  {/* GST classification — needed for invoicing + GSTR-1 */}
                  <Fld label="HSN Code" req hint="e.g. 6204 — women's woven outerwear">
                    <input
                      name="hsnCode"
                      value={form.hsnCode ?? ""}
                      onChange={handleChange}
                      placeholder="e.g. 6204"
                      maxLength={10}
                      className={inputCls}
                    />
                  </Fld>
                  <Fld
                    label="GST Rate (%)"
                    req
                    hint="Textiles: 5% if sale value (post-discount) ≤ ₹1,000 per piece, else 12%. Confirm with CA."
                  >
                    <select
                      name="gstRate"
                      value={Number(form.gstRate) < 0 ? "" : String(form.gstRate)}
                      onChange={(e) => {
                        setStatus(null);
                        const v = e.target.value;
                        setForm((prev) => ({ ...prev, gstRate: v === "" ? -1 : Number(v) }));
                      }}
                      className={selectCls}
                    >
                      <option value="">Select rate</option>
                      {GST_RATE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </Fld>

                  {/* Parcel measurements — what a courier books on. Measured on
                      the packed parcel: the polybag and the tag travel too. */}
                  <div className="col-span-2">
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                  </div>
                  <Fld label="Packed weight (kg)" req hint="Weigh it bagged and tagged — e.g. 0.350 for a 350 g parcel">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={Number(form.weightKg) > 0 ? String(form.weightKg) : ""}
                      onChange={(e) => {
                        setStatus(null);
                        const v = e.target.value;
                        setForm((prev) => ({ ...prev, weightKg: v === "" ? 0 : Number(v) }));
                      }}
                      placeholder="0.350"
                      className={inputCls}
                    />
                  </Fld>
                  <Fld label="Box size (cm)" req hint="Length × breadth × height of the packed parcel">
                    <div className="flex items-center gap-2">
                      {([
                        ["lengthCm", "L"],
                        ["breadthCm", "B"],
                        ["heightCm", "H"],
                      ] as const).map(([key, mark]) => (
                        <div key={key} className="flex items-center gap-1.5 flex-1">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={Number(form[key]) > 0 ? String(form[key]) : ""}
                            onChange={(e) => {
                              setStatus(null);
                              const v = e.target.value;
                              setForm((prev) => ({ ...prev, [key]: v === "" ? 0 : Number(v) }));
                            }}
                            placeholder={mark}
                            aria-label={
                              key === "lengthCm" ? "Length in cm"
                                : key === "breadthCm" ? "Breadth in cm"
                                : "Height in cm"
                            }
                            className={inputCls}
                          />
                          {key !== "heightCm" && (
                            <span className="text-xs text-gray-400 shrink-0">×</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Fld>
                </div>
              </div>
              )}

              {/* ── 3. Description ── */}
              {formStep === 2 && (
              <div>
                <SH icon="📝" title="Product Description" desc="Story, details and fabric info" />
                <div className="flex flex-col gap-5">
                  <Fld label="Story" hint="Brand story or inspiration behind this product">
                    <textarea name="story" value={form.story} onChange={handleChange}
                      placeholder="e.g. Crafted with premium materials for everyday comfort…" rows={3} className={`${inputCls} resize-none`} />
                  </Fld>
                  <Fld label="Details" hint="Key product features and details">
                    <textarea name="details" value={form.details} onChange={handleChange}
                      placeholder="e.g. Relaxed fit, ribbed cuffs, kangaroo pocket…" rows={3} className={`${inputCls} resize-none`} />
                  </Fld>
                  <Fld label="Fabric Details" hint="Material composition">
                    <input name="fabricDetails" value={form.fabricDetails} onChange={handleChange}
                      placeholder="e.g. 98% Cotton, 2% Elastane" className={inputCls} />
                  </Fld>
                </div>
              </div>
              )}

              {/* ── 4. Variants + Barcode + Per-Colour Images ── */}
              {formStep === 3 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <SH icon="🎨" title="Variants & Images" desc="Upload once per colour — shared across every size" />
                  <button
                    type="button"
                    onClick={generateAllBarcodes}
                    disabled={!canGenerateAnyBarcode}
                    title={canGenerateAnyBarcode ? "Generate barcodes for all variants with size + colour set" : "Set product name and at least one variant's size + colour first"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shrink-0 mb-4"
                  >
                    <BarcodeIcon /> Generate All Barcodes
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {colorGroups.map((group) => {
                    const colorObj = colors.find((c) => (c as any).colorId === group.colorId);
                    const colorName = colorObj ? (colorObj as any).name : "New colour";
                    const canonicalImages = (form.variants[group.indices[0]]?.images ??
                      [{ url: "", postOrder: 1 }]) as VariantImageLocal[];

                    return (
                      <div key={group.key} className="border border-slate-200 rounded-xl overflow-hidden">
                        {/* Colour group header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {colorName} · {group.indices.length} size{group.indices.length > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* One image uploader for the whole colour — shared by every size below */}
                        <div className="p-4 border-b border-slate-100">
                          <VariantImages
                            variantIndex={group.indices[0]}
                            images={canonicalImages}
                            onChange={(_, images) => updateColorImages(group.indices, images)}
                          />
                        </div>

                        {/* Per-size rows */}
                        <div className="divide-y divide-slate-100">
                          {group.indices.map((i) => {
                            const variant = form.variants[i];
                            return (
                              <div key={i} className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Size row #{i + 1}</span>
                                  {form.variants.length > 1 && (
                                    <button type="button" onClick={() => removeVariant(i)}
                                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                                      <TrashIcon /> Remove
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  {/* Size */}
                                  <Fld label="Size" req>
                                    <select value={variant.sizeId} onChange={(e) => updateVariant(i, "sizeId", e.target.value)} className={selectCls}>
                                      <option value={0}>Select size…</option>
                                      {sizes.map((s) => {
                                        const id = (s as any).sizeId;
                                        const label = (s as any).label;
                                        return <option key={id} value={id}>{label}</option>;
                                      })}
                                    </select>
                                  </Fld>

                                  {/* Colour */}
                                  <Fld label="Colour" req>
                                    <select value={variant.colorId} onChange={(e) => updateVariant(i, "colorId", e.target.value)} className={selectCls}>
                                      <option value={0}>Select colour…</option>
                                      {colors.map((c) => {
                                        const id = (c as any).colorId;
                                        const name = (c as any).name;
                                        return <option key={id} value={id}>{name}</option>;
                                      })}
                                    </select>
                                  </Fld>

                                  {/* Quantity */}
                                  <Fld label="Quantity">
                                    <input type="number" value={variant.quantity}
                                      onChange={(e) => updateVariant(i, "quantity", e.target.value)}
                                      placeholder="0" min={0} className={inputCls} />
                                  </Fld>

                                  {/* Barcode */}
                                  <Fld label="Barcode (CODE128)" hint="Click ⚡ to auto-generate (needs product name + size + colour)">
                                    <div className="flex items-center gap-2">
                                      <input value={variant.barcode}
                                        onChange={(e) => updateVariant(i, "barcode", e.target.value)}
                                        placeholder="e.g. HOODIE-BLU-XL" className={`${inputCls} font-mono`} />
                                      <button
                                        type="button"
                                        onClick={() => generateBarcode(i)}
                                        disabled={!canGenerateBarcode(variant)}
                                        title={canGenerateBarcode(variant) ? "Auto-generate barcode" : "Set product name, size and colour first"}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors whitespace-nowrap"
                                      >
                                        <BarcodeIcon />⚡
                                      </button>
                                    </div>
                                  </Fld>
                                </div>

                                {/* Barcode preview */}
                                {variant.barcode && (
                                  <div className="mt-2">
                                    <BarcodePreview
                                      value={variant.barcode}
                                      id={`barcode-${i}-${variant.barcode.replace(/[^A-Z0-9]/g, "")}`}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <button type="button" onClick={addVariant}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                    <PlusIcon /> Add variant
                  </button>
                </div>
              </div>
              )}

              {/* ── 5. Q&A ── */}
              {formStep === 4 && (
              <div>
                <SH icon="❓" title="Questions & Answers" desc="Common customer questions and their answers" />
                <div className="flex flex-col gap-3">
                  {form.questionsAnswers.map((qa, i) => (
                    <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 flex flex-col gap-3">
                          <input value={qa.question} onChange={(e) => updateQA(i, "question", e.target.value)}
                            placeholder="e.g. Is this stretchable?" className={inputCls} />
                          <textarea value={qa.answer} onChange={(e) => updateQA(i, "answer", e.target.value)}
                            placeholder="e.g. Yes, slight stretch due to elastane content" rows={2}
                            className={`${inputCls} resize-none`} />
                        </div>
                        {form.questionsAnswers.length > 1 && (
                          <button type="button" onClick={() => removeQA(i)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0">
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addQA}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                    <PlusIcon /> Add question & answer
                  </button>
                </div>
              </div>
              )}

              {/* ── Inline step error ── */}
              {stepError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  <span>⚠</span> {stepError}
                </div>
              )}

              {/* ── Step Navigation ── */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setFormStep((s) => Math.max(0, s - 1))}
                  disabled={formStep === 0}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs font-semibold text-slate-400">
                  Step {formStep + 1} of {FORM_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLastStep || stepError !== null}
                  title={stepError ?? undefined}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>

      </FormModal>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Products" value={totalProducts} />
        <StatCard label="Categories" value={categories.length} />
        <StatCard label="Collections" value={collections.length} />
        <StatCard label="Matching" value={totalProducts} />
      </div>

      {/* ── Table Card ── */}
      <TableCard
        title="All Products"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
      >
          {/* ── Filter Row ── */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Filters:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-blue-400 transition-colors"
            >
              <option value={0}>All Categories</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterCollection}
              onChange={(e) => setFilterCollection(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-blue-400 transition-colors"
            >
              <option value={0}>All Collections</option>
              {collections.map((c) => (
                <option key={c.collectionId} value={c.collectionId}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-blue-400 transition-colors"
            >
              <option value="">All Genders</option>
              {GENDER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value as "all" | "in" | "low" | "out")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-blue-400 transition-colors"
            >
              <option value="all">All Stock</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock (&lt;10)</option>
              <option value="out">Out of Stock</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <XIcon /> Clear filters
              </button>
            )}
          </div>

          {/* ── Bulk action bar (shown when items selected) ── */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-blue-200 bg-blue-50">
              <p className="text-xs font-semibold text-blue-900">
                {selectedIds.size} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setPendingBulkDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  <TrashIcon />
                  Delete {selectedIds.size}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  {(() => {
                    const pageIds = paged.map((p) => p.productId!).filter(Boolean) as number[];
                    const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
                    const someChecked = pageIds.some((id) => selectedIds.has(id));
                    return (
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = !allChecked && someChecked;
                        }}
                        onChange={() => togglePageSelect(pageIds, allChecked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        title={allChecked ? "Deselect this page" : "Select this page"}
                      />
                    );
                  })()}
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="ID" col="id" active={sortBy === "id"} dir={sortDir} onClick={() => toggleSort("id")} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Product" col="name" active={sortBy === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Tags</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Gender</th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Price" col="price" active={sortBy === "price"} dir={sortDir} onClick={() => toggleSort("price")} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label="Stock" col="stock" active={sortBy === "stock"} dir={sortDir} onClick={() => toggleSort("stock")} />
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <TableLoadingRow colSpan={8} label="Loading products…" />
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">📦</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">
                          {hasActiveFilters ? "No products match your filters" : "No products yet"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {hasActiveFilters ? "Try clearing filters or a different keyword" : 'Click "New Product" to add one'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-2 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((product) => {
                  const firstVariantWithImage = product.variants?.find((v) => (v.images ?? []).some((img) => img.url));
                  const firstImage = firstVariantWithImage?.images
                    ?.slice()
                    .sort((a, b) => a.postOrder - b.postOrder)[0];
                  const imageUrl = resolveImageUrl(firstImage?.url ?? null);

                  const catName = categories.find((c) => c.categoryId === product.categoryId)?.name || "—";
                  const colName = collections.find((c) => c.collectionId === product.collectionId)?.name || "—";
                  const disc = product.basePrice > product.discountedPrice
                    ? Math.round(((product.basePrice - product.discountedPrice) / product.basePrice) * 100) : 0;
                  const variantCount = (product.variants ?? []).length;
                  const totalStock = getTotalStock(product);
                  const stockStatus = getStockStatus(product);
                  const isActive = detailProduct?.productId === product.productId;

                  const isSelected = product.productId !== undefined && selectedIds.has(product.productId);
                  return (
                    <tr
                      key={product.productId}
                      onClick={() => setDetailProduct(isActive ? null : product)}
                      className={`border-t border-slate-100 cursor-pointer transition-colors
                        ${isSelected ? "bg-blue-50/70" : isActive ? "bg-blue-50" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => product.productId && toggleSelect(product.productId)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{product.productId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                            {imageUrl ? (
                              <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">📦</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate max-w-[200px]">{product.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {variantCount} variant{variantCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold w-fit">{catName}</span>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-semibold w-fit">{colName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                          ${product.gender === "MALE" ? "bg-blue-100 text-blue-700"
                            : product.gender === "FEMALE" ? "bg-pink-100 text-pink-700"
                            : "bg-purple-100 text-purple-700"}`}>
                          {genderLabel(product.gender)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">₹{product.discountedPrice}</span>
                            {disc > 0 && (
                              <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{disc}%</span>
                            )}
                          </div>
                          {disc > 0 && (
                            <span className="text-[10px] text-slate-400 line-through">₹{product.basePrice}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-700">{totalStock}</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold w-fit uppercase tracking-wide
                            ${stockStatus === "in" ? "bg-green-100 text-green-700"
                              : stockStatus === "low" ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"}`}>
                            {stockStatus === "in" ? "In Stock" : stockStatus === "low" ? "Low" : "Out"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailProduct(isActive ? null : product)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                              ${isActive
                                ? "bg-blue-600 text-white"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
                            title="View details"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(product)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Duplicate product"
                          >
                            <DuplicateIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              product.productId &&
                              setAnalyticsProduct({ id: product.productId, name: product.name })
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="View analytics"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 4 4 5-5" />
                            </svg>
                          </button>
                          <RowActions
                            onEdit={() => handleEdit(product)}
                            onDelete={() => product.productId && requestDelete(product.productId, product.name)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

          {/* ── Pagination Footer ── */}
          {totalProducts > 0 && (
            <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-slate-100 bg-slate-50 flex-wrap">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {(safePage - 1) * pageSize + 1}–
                  {Math.min((safePage - 1) * pageSize + paged.length, totalProducts)}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{totalProducts}</span>
                {hasActiveFilters && (
                  <span className="text-slate-400"> (filtered)</span>
                )}
              </p>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-slate-500 font-medium">Per page:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-blue-400 transition-colors"
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-slate-600 px-2 font-semibold">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          )}
      </TableCard>

      {/* ── Side Panel ── */}
      <ProductDetailPanel
        product={detailProduct}
        sizes={sizes}
        colors={colors}
        onClose={() => setDetailProduct(null)}
      />

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete product?"
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

      {/* ── Bulk Delete Confirmation ── */}
      <ConfirmDialog
        open={pendingBulkDelete}
        title={`Delete ${selectedIds.size} products?`}
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">{selectedIds.size}</span>{" "}
            product{selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
          </>
        }
        confirmLabel={bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size}`}
        tone="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setPendingBulkDelete(false)}
      />
      {analyticsProduct && (
        <ProductAnalyticsModal
          productId={analyticsProduct.id}
          productName={analyticsProduct.name}
          onClose={() => setAnalyticsProduct(null)}
        />
      )}
    </PageShell>
  );
};

export default ProductManagement;