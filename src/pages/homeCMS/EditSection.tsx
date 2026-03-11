import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { updateHomeSection } from "../../api/homeCms";

const SECTION_TYPES = [
  "HERO", "RECOMMENDED", "FEATURED_PRODUCTS", "PROMO", "CATEGORIES", "TRENDING",
];
const GENDERS = ["M", "F", "U"];

const EditSection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "",
    title: "",
    subtitle: "",
    position: "",
    gender: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("homeCmsSections");
    if (!stored) { alert("No section data found."); navigate("/home-cms"); return; }
    const section = JSON.parse(stored).find((s: any) => s.sectionId === Number(id));
    if (!section) { alert("Section not found"); navigate("/home-cms"); return; }
    setForm({
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      position: section.position.toString(),
      gender: section.gender,
    });
    setLoading(false);
  }, [id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateHomeSection(Number(id), {
        type: form.type,
        title: form.title,
        subtitle: form.subtitle,
        position: Number(form.position),
        gender: form.gender,
      });
      alert("Section updated ✅");
      navigate("/home-cms");
    } catch {
      alert("Update failed ❌");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/home-cms")}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
        >
          ←
        </button>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Home CMS</p>
          <h1 className="text-xl font-bold text-gray-900">Edit Section</h1>
        </div>
      </div>

      <div className="px-8 py-8 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Section Type</label>
              <div className="flex flex-wrap gap-2">
                {SECTION_TYPES.map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      form.type === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Title</label>
              <input name="title" value={form.title} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Subtitle</label>
              <input name="subtitle" value={form.subtitle} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Position</label>
                <input type="number" name="position" value={form.position} onChange={handleChange} min="1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button key={g} type="button" onClick={() => setForm({ ...form, gender: g })}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-colors ${
                        form.gender === g ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Update Section"}
              </button>
              <button type="button" onClick={() => navigate("/home-cms")}
                className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditSection;