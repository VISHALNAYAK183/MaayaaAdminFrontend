import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  updateSectionItem,
  AddItemPayload,
} from "../../api/homeCms";

const EditSectionItem = () => {
  const { itemId, sectionId } = useParams();
  const navigate = useNavigate();

  const [original, setOriginal] =
    useState<any>(null);

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

  /* ================================
     LOAD EXISTING ITEM
  ================================ */
  useEffect(() => {
    const stored =
      localStorage.getItem("sectionItems");

    if (!stored) {
      alert("Item cache missing");
      navigate(-1);
      return;
    }

    const items = JSON.parse(stored);

    const item = items.find(
      (i: any) => i.itemId === Number(itemId)
    );

    if (!item) {
      alert("Item not found");
      navigate(-1);
      return;
    }

    setOriginal(item);

    // prefill form
    setForm({
      image: item.image ?? "",
      heading: item.heading ?? "",
      subheading: item.subheading ?? "",
      ctaText: item.ctaText ?? "",
      link: item.link ?? "",
      productId: item.productId?.toString() ?? "",
      categoryId: item.categoryId?.toString() ?? "",
      reviewId: item.reviewId?.toString() ?? "",
      position: item.position?.toString() ?? "",
    });
  }, []);

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
     SAFE MERGE UPDATE
  ================================ */
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const payload: AddItemPayload = {
      image:
        form.image !== ""
          ? form.image
          : original.image,

      heading:
        form.heading !== ""
          ? form.heading
          : original.heading,

      subheading:
        form.subheading !== ""
          ? form.subheading
          : original.subheading,

      ctaText:
        form.ctaText !== ""
          ? form.ctaText
          : original.ctaText,

      link:
        form.link !== ""
          ? form.link
          : original.link,

      productId:
        form.productId !== ""
          ? form.productId
          : original.productId,

      categoryId:
        form.categoryId !== ""
          ? form.categoryId
          : original.categoryId,

      reviewId:
        form.reviewId !== ""
          ? form.reviewId
          : original.reviewId,

      position:
        form.position !== ""
          ? form.position
          : original.position,
    };

    try {
      await updateSectionItem(
        Number(itemId),
        payload
      );

      alert("Item updated successfully ✅");

      navigate(
        `/home-cms/section/${sectionId}/items`
      );
    } catch (err) {
      console.error(err);
      alert("Update failed ❌");
    }
  };

  return (
    <div className="p-6 max-w-xl bg-white rounded-lg">
      <h2 className="text-xl font-semibold mb-6">
        Edit Section Item
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {Object.keys(form).map((key) => (
          <input
            key={key}
            name={key}
            value={(form as any)[key]}
            onChange={handleChange}
            placeholder={key}
            className="w-full border p-2 rounded"
          />
        ))}

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-black text-white px-6 py-2 rounded"
          >
            Update
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border px-6 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSectionItem;