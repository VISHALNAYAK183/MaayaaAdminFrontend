// EditSectionItem.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { updateSectionItem, AddItemPayload } from "../../api/homeCms";
import { ItemForm } from "./AddSectionItem";

const EditSectionItem = () => {
  const { itemId, sectionId } = useParams();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({
    image: "", heading: "", subheading: "", ctaText: "",
    link: "", productId: "", categoryId: "", reviewId: "", position: "",
  });
  const [saving, setSaving] = useState(false);

  // Determine section type for hero-specific UI
  const sectionType = (() => {
    try {
      const sections = JSON.parse(localStorage.getItem("sections") ?? "[]");
      const found = sections.find((s: any) => s.sectionId === Number(sectionId));
      return found?.type ?? "";
    } catch { return ""; }
  })();

  const isHero = sectionType === "HERO";

  useEffect(() => {
    const stored = localStorage.getItem("sectionItems");
    if (!stored) { alert("Item cache missing"); navigate(-1); return; }
    const item = JSON.parse(stored).find((i: any) => i.itemId === Number(itemId));
    if (!item) { alert("Item not found"); navigate(-1); return; }
    setOriginal(item);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHero && !form.image.trim()) {
      alert("Image filename is required for Hero items");
      return;
    }
    const payload: AddItemPayload = {
      image: form.image !== "" ? form.image : original.image,
      heading: form.heading !== "" ? form.heading : original.heading,
      subheading: form.subheading !== "" ? form.subheading : original.subheading,
      ctaText: form.ctaText !== "" ? form.ctaText : original.ctaText,
      link: form.link !== "" ? form.link : original.link,
      productId: form.productId !== "" ? form.productId : original.productId,
      categoryId: form.categoryId !== "" ? form.categoryId : original.categoryId,
      reviewId: form.reviewId !== "" ? form.reviewId : original.reviewId,
      position: form.position !== "" ? form.position : original.position,
    };
    try {
      setSaving(true);
      await updateSectionItem(Number(itemId), payload);
      alert("Item updated ✅");
      navigate(`/home-cms/section/${sectionId}/items`);
    } catch {
      alert("Update failed ❌");
    } finally {
      setSaving(false);
    }
  };

  if (!original) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  return (
    <ItemForm
      title="Edit Item"
      form={form}
      saving={saving}
      submitLabel="Update Item"
      isHero={isHero}
      isEdit={true}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/home-cms/section/${sectionId}/items`)}
    />
  );
};

export default EditSectionItem;