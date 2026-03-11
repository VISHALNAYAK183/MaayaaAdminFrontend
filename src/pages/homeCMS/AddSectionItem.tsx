// AddSectionItem.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { addSectionItem } from "../../api/homeCms";

const HERO_IMAGE_BASE = "/assets/images/hero/";

const FIELDS = [
  { name: "heading", label: "Heading", placeholder: "e.g. New Arrivals" },
  { name: "subheading", label: "Subheading", placeholder: "Optional subheading" },
  { name: "ctaText", label: "CTA Text", placeholder: "e.g. Shop Now" },
  { name: "link", label: "Link", placeholder: "/collection/summer" },
];

const ID_FIELDS = [
  { name: "productId", label: "Product ID" },
  { name: "categoryId", label: "Category ID" },
  { name: "reviewId", label: "Review ID" },
];

export const AddSectionItem = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();

  // We need to know the section type to decide which image input to show.
  // The section type is stored in the route state or can be passed via location state.
  // Fall back to checking localStorage for the section data.
  const sectionType = (() => {
    try {
      const sections = JSON.parse(localStorage.getItem("sections") ?? "[]");
      const found = sections.find((s: any) => s.sectionId === Number(sectionId));
      return found?.type ?? "";
    } catch { return ""; }
  })();

  const isHero = sectionType === "HERO";

  const [form, setForm] = useState<Record<string, string>>({
    image: "", heading: "", subheading: "", ctaText: "",
    link: "", productId: "", categoryId: "", reviewId: "", position: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHero && !form.image.trim()) {
      alert("Image filename is required for Hero items");
      return;
    }
    try {
      setSaving(true);
      await addSectionItem(Number(sectionId), {
        // For hero: send filename only. For others: send as-is (URL or base64).
        image: form.image || null,
        heading: form.heading || null,
        subheading: form.subheading || null,
        ctaText: form.ctaText || null,
        link: form.link || null,
        productId: form.productId || null,
        categoryId: form.categoryId || null,
        reviewId: form.reviewId || null,
        position: form.position,
      });
      alert("Item added ✅");
      navigate(`/home-cms/section/${sectionId}/items`);
    } catch {
      alert("Failed to add item ❌");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ItemForm
      title="Add Item"
      form={form}
      saving={saving}
      submitLabel="Add Item"
      isHero={isHero}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/home-cms/section/${sectionId}/items`)}
      isEdit={false}
    />
  );
};

export default AddSectionItem;

/* ─── SHARED FORM COMPONENT ─────────────────────────────── */
interface ItemFormProps {
  title: string;
  form: Record<string, string>;
  saving: boolean;
  submitLabel: string;
  isHero: boolean;
  isEdit: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ItemForm = ({
  title, form, saving, submitLabel, isHero, isEdit, onChange, onSubmit, onCancel,
}: ItemFormProps) => {

  const heroPreviewSrc = isHero && form.image ? `${HERO_IMAGE_BASE}${form.image}` : null;

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-3">
        <button onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
        >←</button>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>

      <div className="px-8 py-8 max-w-2xl mx-auto">
        <form onSubmit={onSubmit} className="space-y-6">

          {/* ── IMAGE SECTION ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">
              Image {isHero && <span className="text-red-400">*</span>}
            </label>

            {isHero ? (
              /* HERO: filename input only */
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  {/* Preview box */}
                  <div className="w-40 h-28 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {heroPreviewSrc ? (
                      <img
                        src={heroPreviewSrc}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <svg className="text-gray-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1">
                    {/* On Add: editable. On Edit: also editable (edit is always allowed to change image). */}
                    <label className="text-xs text-gray-500 block mb-1">
                      Image Filename
                      {isEdit && <span className="ml-1 text-blue-500">(editable)</span>}
                    </label>
                    <input
                      name="image"
                      value={form.image}
                      onChange={onChange}
                      placeholder="hero_banner.jpg"
                      required={isHero}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Served from: <span className="font-mono text-gray-500">assets/images/hero/</span>
                    </p>
                    {form.image && (
                      <p className="text-[11px] text-green-600 mt-0.5 font-mono">
                        → assets/images/hero/{form.image}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* NON-HERO: URL input with preview */
              <div className="flex gap-4 items-start">
                <div className="w-32 h-24 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <svg className="text-gray-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </div>
                <input
                  name="image"
                  value={form.image}
                  onChange={onChange}
                  placeholder="Image URL"
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            )}
          </div>

          {/* ── CONTENT FIELDS ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Content</label>
            {FIELDS.map((field) => (
              <div key={field.name}>
                <label className="text-xs text-gray-500 block mb-1">{field.label}</label>
                <input
                  name={field.name}
                  value={form[field.name]}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            ))}
          </div>

          {/* ── REFERENCES & POSITION ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-4">References & Position</label>
            <div className="grid grid-cols-2 gap-4">
              {ID_FIELDS.map((field) => (
                <div key={field.name}>
                  <label className="text-xs text-gray-500 block mb-1">{field.label}</label>
                  <input
                    name={field.name}
                    value={form[field.name]}
                    onChange={onChange}
                    placeholder="—"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Position <span className="text-red-400">*</span></label>
                <input
                  name="position"
                  value={form.position}
                  onChange={onChange}
                  placeholder="1"
                  type="number"
                  min="1"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : submitLabel}
            </button>
            <button type="button" onClick={onCancel}
              className="px-8 py-3 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};