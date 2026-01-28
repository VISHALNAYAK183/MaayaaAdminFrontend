import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { updateHomeSection } from "../../api/homeCms";

const EditSection = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    type: "",
    title: "",
    subtitle: "",
    position: "",
    gender: "",
  });

  /* ================================
     LOAD FROM LOCAL STORAGE
  ================================ */
  useEffect(() => {
    const stored = localStorage.getItem("homeCmsSections");

    if (!stored) {
      alert("No section data found. Please reload Home CMS.");
      navigate("/home-cms");
      return;
    }

    const sections = JSON.parse(stored);

    const section = sections.find(
      (s: any) => s.sectionId === Number(id)
    );

    if (!section) {
      alert("Section not found");
      navigate("/home-cms");
      return;
    }

    setForm({
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      position: section.position.toString(),
      gender: section.gender,
    });

    setLoading(false);
  }, [id, navigate]);

  /* ================================
     HANDLE INPUT
  ================================ */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  /* ================================
     SUBMIT UPDATE
  ================================ */
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      await updateHomeSection(Number(id), {
        type: form.type,
        title: form.title,
        subtitle: form.subtitle,
        position: Number(form.position),
        gender: form.gender,
      });

      alert("Section updated successfully ✅");

      navigate("/home-cms");
    } catch (err) {
      console.error(err);
      alert("Update failed ❌");
    }
  };

  if (loading) {
    return <p className="p-6">Loading...</p>;
  }

  return (
    <div className="p-6 max-w-xl bg-white rounded-lg">
      <h2 className="text-xl font-semibold mb-6">
        Edit Home CMS Section
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="type"
          value={form.type}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Type"
          required
        />

        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Title"
          required
        />

        <input
          type="text"
          name="subtitle"
          value={form.subtitle}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Subtitle"
          required
        />

        <input
          type="number"
          name="position"
          value={form.position}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Position"
          required
        />

        <input
          type="text"
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Gender"
          required
        />

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-black text-white px-6 py-2 rounded"
          >
            Update
          </button>

          <button
            type="button"
            onClick={() => navigate("/home-cms")}
            className="border px-6 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSection;