import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  addSectionItem,
} from "../../api/homeCms";

const AddSectionItem = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    image: "",
    heading: "",
    subheading: "",
    ctaText: "",
    link: "",
    productId: "",
    categoryId: "",
    reviewId: "",
    position: "",
  });

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

  const payload = {
    image: form.image || null,
    heading: form.heading || null,
    subheading: form.subheading || null,
    ctaText: form.ctaText || null,
    link: form.link || null,
    productId: form.productId || null,
    categoryId: form.categoryId || null,
    reviewId: form.reviewId || null,
    position: form.position,
  };

  try {
    await addSectionItem(Number(sectionId), payload);

    alert("Item added successfully ✅");

    navigate(`/home-cms/section/${sectionId}/items`);
  } catch (err) {
    console.error(err);
    alert("Failed to add item ❌");
  }
};

  return (
    <div className="p-6 max-w-xl bg-white rounded-lg">

      <h2 className="text-xl font-semibold mb-6">
        Add Section Item
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          name="image"
          placeholder="Image URL"
          value={form.image}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          
        />

        <input
          name="heading"
          placeholder="Heading"
          value={form.heading}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          
        />

        <input
          name="subheading"
          placeholder="Subheading"
          value={form.subheading}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="ctaText"
          placeholder="CTA Text"
          value={form.ctaText}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="link"
          placeholder="Link"
          value={form.link}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="productId"
          placeholder="Product ID"
          value={form.productId}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="categoryId"
          placeholder="Category ID"
          value={form.categoryId}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="reviewId"
          placeholder="Review ID"
          value={form.reviewId}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="position"
          placeholder="Position"
          value={form.position}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-black text-white px-6 py-2 rounded"
          >
            Save
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/home-cms/section/${sectionId}/items`
              )
            }
            className="border px-6 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSectionItem;