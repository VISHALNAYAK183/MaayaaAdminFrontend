import React, { useState, useEffect, useCallback } from "react";
import JsBarcode from "jsbarcode";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type ProductImage,
  type QuestionAnswer,
  type Variant,
} from "../api/adminProduct";
import { getCategories, type Category } from "../api/adminCategory";
import { getCollections, type Collection } from "../api/adminCollection";
import { getSizes, type Size } from "../api/adminSize";
import { getColors, type Color } from "../api/adminColor";

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
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
  </svg>
);
const BarcodeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h2M3 10h2M3 15h2M3 20h2M7 5v15M10 5v15M14 5v15M17 5v15M20 5h1v15h-1" />
  </svg>
);

// ─── Shared helpers ───────────────────────────────────────────────────────────
const Fld = ({ label, req, hint, children }: {
  label: string; req?: boolean; hint?: string; children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
      {label}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <span className="text-xs text-slate-400">{hint}</span>}
  </div>
);

const SH = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-lg bg-slate-50 border border-slate-200 rounded-xl">{icon}</div>
    <div>
      <div className="text-sm font-bold text-slate-800">{title}</div>
      <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
    </div>
  </div>
);

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300";
const selectCls = `${inputCls} cursor-pointer`;

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
  questionsAnswers: [{ question: "", answer: "" }],
  variants: [{ sizeId: 0, colorId: 0, quantity: 0, barcode: "" }],
  images: [{ url: "", postOrder: 1 }],
});

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

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [form, setForm] = useState<Omit<Product, "productId">>(blankForm());

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setTableLoading(true);
    try {
      const [prodRes, catRes, colRes, sizeRes, colorRes] = await Promise.all([
        getProducts(),
        getCategories(),
        getCollections(),
        getSizes(),
        getColors(),
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : [prodRes.data]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : [catRes.data]);
      setCollections(Array.isArray(colRes.data) ? colRes.data : [colRes.data]);
      setSizes(Array.isArray(sizeRes.data) ? sizeRes.data : [sizeRes.data]);
      setColors(Array.isArray(colorRes.data) ? colorRes.data : [colorRes.data]);
    } catch {
      setStatus({ type: "error", msg: "Failed to load data." });
    } finally {
      setTableLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setStatus(null);
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ── Images ──
  const updateImage = (i: number, field: keyof ProductImage, value: string | number) => {
    setForm(prev => {
      const images = [...prev.images];
      images[i] = { ...images[i], [field]: field === "postOrder" ? Number(value) : value };
      return { ...prev, images };
    });
  };
  const addImage = () => {
    if (form.images.length >= 5) return;
    setForm(prev => ({ ...prev, images: [...prev.images, { url: "", postOrder: prev.images.length + 1 }] }));
  };
  const removeImage = (i: number) => {
    setForm(prev => {
      const images = prev.images.filter((_, idx) => idx !== i).map((img, idx) => ({ ...img, postOrder: idx + 1 }));
      return { ...prev, images };
    });
  };

  // ── Q&A ──
  const updateQA = (i: number, field: keyof QuestionAnswer, value: string) => {
    setForm(prev => {
      const qa = [...prev.questionsAnswers];
      qa[i] = { ...qa[i], [field]: value };
      return { ...prev, questionsAnswers: qa };
    });
  };
  const addQA = () => setForm(prev => ({ ...prev, questionsAnswers: [...prev.questionsAnswers, { question: "", answer: "" }] }));
  const removeQA = (i: number) => setForm(prev => ({ ...prev, questionsAnswers: prev.questionsAnswers.filter((_, idx) => idx !== i) }));

  // ── Variants ──
  const updateVariant = (i: number, field: keyof Variant, value: string | number) => {
    setForm(prev => {
      const variants = [...prev.variants];
      variants[i] = {
        ...variants[i],
        [field]: ["sizeId", "colorId", "quantity"].includes(field) ? Number(value) : value,
      };
      return { ...prev, variants };
    });
  };
  const addVariant = () => setForm(prev => ({
    ...prev,
    variants: [...prev.variants, { sizeId: 0, colorId: 0, quantity: 0, barcode: "" }],
  }));
  const removeVariant = (i: number) => setForm(prev => ({
    ...prev,
    variants: prev.variants.filter((_, idx) => idx !== i),
  }));

  // ── Barcode generator ──
  const generateBarcode = useCallback((index: number) => {
    setForm(prev => {
      const variant = prev.variants[index];
      const sizeName = sizes.find(s => s.sizeId === variant.sizeId)?.label || "SZ";
      const colorName = colors.find(c => c.colorId === variant.colorId)?.name || "CLR";
      const productSlug = (prev.name || "PROD")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6)
        .padEnd(3, "X");
      const barcode = `${productSlug}-${colorName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)}-${sizeName.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
      const variants = [...prev.variants];
      variants[index] = { ...variants[index], barcode };
      return { ...prev, variants };
    });
  }, [sizes, colors]);

  const generateAllBarcodes = useCallback(() => {
    form.variants.forEach((_, i) => generateBarcode(i));
  }, [form.variants.length, generateBarcode]);

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setStatus({ type: "error", msg: "Product name is required." }); return; }
    if (!form.categoryId) { setStatus({ type: "error", msg: "Please select a category." }); return; }
    if (!form.collectionId) { setStatus({ type: "error", msg: "Please select a collection." }); return; }
    if (!form.gender) { setStatus({ type: "error", msg: "Please select a gender." }); return; }
    setLoading(true); setStatus(null);
    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        collectionId: Number(form.collectionId),
        basePrice: Number(form.basePrice),
        discountedPrice: Number(form.discountedPrice),
        images: form.images.filter(img => img.url.trim()),
        questionsAnswers: form.questionsAnswers.filter(qa => qa.question.trim()),
        variants: form.variants.filter(v => v.sizeId && v.colorId),
      };
      if (editingId !== null) {
        await updateProduct(editingId, payload);
        setStatus({ type: "success", msg: `Product "${form.name}" updated successfully!` });
      } else {
        await addProduct(payload);
        setStatus({ type: "success", msg: `Product "${form.name}" created successfully!` });
      }
      reset(); loadAll();
    } catch (err: any) {
      setStatus({ type: "error", msg: err?.message || `Failed to ${editingId !== null ? "update" : "create"} product.` });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      collectionId: product.collectionId,
      gender: product.gender,
      basePrice: product.basePrice,
      discountedPrice: product.discountedPrice,
      story: product.story || "",
      details: product.details || "",
      fabricDetails: product.fabricDetails || "",
      questionsAnswers: product.questionsAnswers?.length ? product.questionsAnswers : [{ question: "", answer: "" }],
      variants: product.variants?.length ? product.variants : [{ sizeId: 0, colorId: 0, quantity: 0, barcode: "" }],
      images: product.images?.length ? product.images : [{ url: "", postOrder: 1 }],
    });
    setEditingId(product.productId ?? null);
    setShowForm(true); setStatus(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete product "${name}"?`)) return;
    try {
      await deleteProduct(id);
      setStatus({ type: "success", msg: `Product "${name}" deleted.` });
      loadAll();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete product." });
    }
  };

  const reset = () => { setForm(blankForm()); setEditingId(null); setShowForm(false); setStatus(null); };

  const filtered = products.filter(p => (p.name ?? "").toLowerCase().includes(search.toLowerCase()));

  const discountPreview = form.basePrice > 0 && form.discountedPrice > 0 && Number(form.discountedPrice) < Number(form.basePrice)
    ? Math.round(((Number(form.basePrice) - Number(form.discountedPrice)) / Number(form.basePrice)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            {["Dashboard", "Catalog"].map(c => (
              <React.Fragment key={c}>
                <span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">{c}</span>
                <span className="text-xs text-slate-300">›</span>
              </React.Fragment>
            ))}
            <span className="text-xs text-slate-600 font-semibold">Product Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Create and manage your product catalog</p>
        </div>
        <button
          onClick={() => { reset(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-sm font-semibold">New Product</span>
        </button>
      </div>

      {/* ── Status Banner ── */}
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

      {/* ── Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full my-6">

            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId !== null ? "Edit Product" : "Create New Product"}
              </h2>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">

              {/* ── 1. Basic Info ── */}
              <div>
                <SH icon="📦" title="Basic Information" desc="Name, category, collection and gender" />
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <Fld label="Product Name" req>
                      <input name="name" value={form.name} onChange={handleChange}
                        placeholder="e.g. Premium Cotton Hoodie" className={inputCls} autoFocus required />
                    </Fld>
                  </div>
                  <Fld label="Category" req>
                    <select name="categoryId" value={form.categoryId} onChange={handleChange} className={selectCls} required>
                      <option value={0}>Select category…</option>
                      {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                    </select>
                  </Fld>
                  <Fld label="Collection" req>
                    <select name="collectionId" value={form.collectionId} onChange={handleChange} className={selectCls} required>
                      <option value={0}>Select collection…</option>
                      {collections.map(c => <option key={c.collectionId} value={c.collectionId}>{c.name}</option>)}
                    </select>
                  </Fld>
                  <Fld label="Gender" req>
                    <select name="gender" value={form.gender} onChange={handleChange} className={selectCls} required>
                      <option value="">Select gender…</option>
                      {["Men", "Women", "Unisex", "Kids"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Fld>
                </div>
              </div>

              {/* ── 2. Pricing ── */}
              <div>
                <SH icon="💰" title="Pricing" desc="Set the base and discounted prices" />
                <div className="grid grid-cols-2 gap-5">
                  <Fld label="Base Price (₹)" req>
                    <div className="relative">
                      <input type="number" name="basePrice" value={form.basePrice || ""} onChange={handleChange}
                        placeholder="e.g. 2799" className={`${inputCls} pr-7`} min={0} required />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">₹</span>
                    </div>
                  </Fld>
                  <Fld label="Discounted Price (₹)" req>
                    <div className="relative">
                      <input type="number" name="discountedPrice" value={form.discountedPrice || ""} onChange={handleChange}
                        placeholder="e.g. 1799" className={`${inputCls} pr-7`} min={0} required />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">₹</span>
                    </div>
                  </Fld>
                  {discountPreview > 0 && (
                    <div className="col-span-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-xs font-bold text-green-700">{discountPreview}% off</span>
                        <span className="text-xs text-green-600">
                          Customer saves ₹{Number(form.basePrice) - Number(form.discountedPrice)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 3. Description ── */}
              <div>
                <SH icon="📝" title="Product Description" desc="Story, details and fabric info" />
                <div className="flex flex-col gap-5">
                  <Fld label="Story" hint="Brand story or inspiration behind this product">
                    <textarea name="story" value={form.story} onChange={handleChange}
                      placeholder="e.g. Crafted with premium materials for everyday comfort…"
                      rows={3} className={`${inputCls} resize-none`} />
                  </Fld>
                  <Fld label="Details" hint="Key product features and details">
                    <textarea name="details" value={form.details} onChange={handleChange}
                      placeholder="e.g. Relaxed fit, ribbed cuffs, kangaroo pocket…"
                      rows={3} className={`${inputCls} resize-none`} />
                  </Fld>
                  <Fld label="Fabric Details" hint="Material composition">
                    <input name="fabricDetails" value={form.fabricDetails} onChange={handleChange}
                      placeholder="e.g. 98% Cotton, 2% Elastane" className={inputCls} />
                  </Fld>
                </div>
              </div>

              {/* ── 4. Images ── */}
              <div>
                <SH icon="🖼️" title="Product Images" desc="Up to 5 images — enter image filename or full URL" />
                <div className="flex flex-col gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {img.postOrder}
                      </div>
                      <div className="flex-1">
                        <input
                          value={img.url}
                          onChange={e => updateImage(i, "url", e.target.value)}
                          placeholder={`Image ${i + 1} — e.g. shirt1.jpg or full URL`}
                          className={inputCls}
                        />
                      </div>
                      {img.url && (
                        <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                          <img
                            src={img.url.startsWith("http") ? img.url : `https://res.cloudinary.com/maayaa/image/upload/${img.url}`}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                      {form.images.length > 1 && (
                        <button type="button" onClick={() => removeImage(i)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0">
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.images.length < 5 && (
                    <button type="button" onClick={addImage}
                      className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                      <PlusIcon /> Add image ({form.images.length}/5)
                    </button>
                  )}
                </div>
              </div>

              {/* ── 5. Variants + Barcode ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <SH icon="🎨" title="Variants" desc="Size + colour combinations with CODE128 barcode" />
                  <button
                    type="button"
                    onClick={generateAllBarcodes}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors shrink-0 mb-4"
                  >
                    <BarcodeIcon />
                    Generate All
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {form.variants.map((variant, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">

                      {/* Variant header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Variant #{i + 1}
                        </span>
                        {form.variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(i)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                            <TrashIcon /> Remove
                          </button>
                        )}
                      </div>

                      <div className="p-4 grid grid-cols-2 gap-4">
                        <Fld label="Size" req>
                          <select value={variant.sizeId}
                            onChange={e => updateVariant(i, "sizeId", e.target.value)}
                            className={selectCls}>
                            <option value={0}>Select size…</option>
                            {sizes.map(s => <option key={s.sizeId} value={s.sizeId}>{s.label}</option>)}
                          </select>
                        </Fld>

                        <Fld label="Colour" req>
                          <select value={variant.colorId}
                            onChange={e => updateVariant(i, "colorId", e.target.value)}
                            className={selectCls}>
                            <option value={0}>Select colour…</option>
                            {colors.map(c => (
                              <option key={c.colorId} value={c.colorId}>{c.name}</option>
                            ))}
                          </select>
                        </Fld>

                        <Fld label="Quantity">
                          <input type="number" value={variant.quantity || ""}
                            onChange={e => updateVariant(i, "quantity", e.target.value)}
                            placeholder="0" min={0} className={inputCls} />
                        </Fld>

                        <Fld label="Barcode (CODE128)" hint="Click ⚡ to auto-generate from name, colour & size">
                          <div className="flex items-center gap-2">
                            <input
                              value={variant.barcode}
                              onChange={e => updateVariant(i, "barcode", e.target.value)}
                              placeholder="e.g. HOODIE-BLU-XL"
                              className={`${inputCls} font-mono`}
                            />
                            <button
                              type="button"
                              onClick={() => generateBarcode(i)}
                              title="Auto-generate CODE128 barcode"
                              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                            >
                              <BarcodeIcon />
                              ⚡
                            </button>
                          </div>
                        </Fld>
                      </div>

                      {/* Live barcode preview */}
                      {variant.barcode && (
                        <div className="px-4 pb-4">
                          <BarcodePreview
                            value={variant.barcode}
                            id={`barcode-${i}-${variant.barcode.replace(/[^A-Z0-9]/g, "")}`}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button type="button" onClick={addVariant}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                    <PlusIcon /> Add variant
                  </button>
                </div>
              </div>

              {/* ── 6. Q&A ── */}
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
                          <input
                            value={qa.question}
                            onChange={e => updateQA(i, "question", e.target.value)}
                            placeholder="e.g. Is this stretchable?"
                            className={inputCls}
                          />
                          <textarea
                            value={qa.answer}
                            onChange={e => updateQA(i, "answer", e.target.value)}
                            placeholder="e.g. Yes, slight stretch due to elastane content"
                            rows={2}
                            className={`${inputCls} resize-none`}
                          />
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

              {/* ── Form Actions ── */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
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
                    <><CheckIcon />{editingId !== null ? "Update Product" : "Create Product"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Products</p>
          <p className="text-2xl font-extrabold text-slate-900">{products.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Categories</p>
          <p className="text-2xl font-extrabold text-slate-900">{categories.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Collections</p>
          <p className="text-2xl font-extrabold text-slate-900">{collections.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Search Results</p>
          <p className="text-2xl font-extrabold text-slate-900">{filtered.length}</p>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-bold text-slate-800">All Products</h2>
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300 transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Image</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Collection</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Base Price</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Sale Price</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Variants</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-xs text-slate-400 font-medium">Loading products…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">📦</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">{search ? "No products match your search" : "No products yet"}</p>
                      <p className="text-xs text-slate-400 mt-1">{search ? "Try a different keyword" : 'Click "New Product" to add one'}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                filtered.map(product => {
                  const firstImage = product.images?.find(img => img.postOrder === 1) || product.images?.[0];
                  const imageUrl = firstImage?.url?.startsWith("http")
                    ? firstImage.url
                    : firstImage?.url ? `https://res.cloudinary.com/maayaa/image/upload/${firstImage.url}` : null;
                  const catName = categories.find(c => c.categoryId === product.categoryId)?.name || "—";
                  const colName = collections.find(c => c.collectionId === product.collectionId)?.name || "—";
                  const disc = product.basePrice > product.discountedPrice
                    ? Math.round(((product.basePrice - product.discountedPrice) / product.basePrice) * 100)
                    : 0;

                  return (
                    <tr key={product.productId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{product.productId}</td>
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).src = ""; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">📦</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[180px]">{product.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">{product.fabricDetails}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">{catName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-xs font-semibold">{colName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                          ${product.gender === "Men" ? "bg-blue-100 text-blue-700" :
                            product.gender === "Women" ? "bg-pink-100 text-pink-700" :
                            product.gender === "Kids" ? "bg-yellow-100 text-yellow-700" :
                            "bg-purple-100 text-purple-700"}`}>
                          {product.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 line-through text-xs">₹{product.basePrice}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">₹{product.discountedPrice}</span>
                          {disc > 0 && (
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{disc}% off</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          {product.variants?.length || 0} variants
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(product)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <EditIcon />
                          </button>
                          <button onClick={() => product.productId && handleDelete(product.productId, product.name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {!tableLoading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-600">{products.length}</span> products
              {search && <> matching <span className="font-semibold text-slate-600">"{search}"</span></>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;