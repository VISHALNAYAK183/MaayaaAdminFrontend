import { useState } from "react";
import { addHomeSection } from "../../api/homeCms";

const AddSection = () => {
  const [form, setForm] = useState({
    type: "",
    title: "",
    subtitle: "",
    position: "",
    gender: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      await addHomeSection({
        type: form.type,
        title: form.title,
        subtitle: form.subtitle,
        position: Number(form.position),
        gender: form.gender,
      });

      alert("Section added successfully ✅");

      setForm({
        type: "",
        title: "",
        subtitle: "",
        position: "",
        gender: "",
      });
    } catch (error) {
      alert("Failed to add section ❌");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl bg-white rounded-lg">

      <h2 className="text-xl font-semibold mb-6">
        Add Home CMS Section
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          type="text"
          name="type"
          placeholder="Type (FEATURED_PRODUCTS)"
          value={form.type}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="text"
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="text"
          name="subtitle"
          placeholder="Subtitle"
          value={form.subtitle}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="number"
          name="position"
          placeholder="Position"
          value={form.position}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="text"
          name="gender"
          placeholder="Gender (M / F / U)"
          value={form.gender}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
        >
          {loading ? "Saving..." : "Add Section"}
        </button>

      </form>
    </div>
  );
};

export default AddSection;