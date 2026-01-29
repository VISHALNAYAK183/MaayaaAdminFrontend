import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  getSectionItems,
  SectionItem,
} from "../../api/homeCms";

const SectionItems = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await getSectionItems(
        Number(sectionId)
      );
      setItems(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load section items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">
          Section Items
        </h1>

       <button
  onClick={() =>
    navigate(
      `/home-cms/section/${sectionId}/items/add`
    )
  }
>
  + Add Item
</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No items found</p>
      ) : (
        <div className="grid gap-4">
         {items.map((item) => (
  <div
    key={item.itemId}
    className="border rounded-lg p-5 bg-white"
  >
    <div className="grid grid-cols-2 gap-4 text-sm">

      <div>
        <b>Item ID:</b> {item.itemId}
      </div>

      <div>
        <b>Position:</b> {item.position}
      </div>

      <div>
        <b>Heading:</b> {item.heading ?? "—"}
      </div>

      <div>
        <b>Subheading:</b> {item.subheading ?? "—"}
      </div>

      <div>
        <b>CTA Text:</b> {item.ctaText ?? "—"}
      </div>

      <div>
        <b>Link:</b> {item.link ?? "—"}
      </div>

      <div>
        <b>Product ID:</b> {item.productId ?? "—"}
      </div>

      <div>
        <b>Category ID:</b> {item.categoryId ?? "—"}
      </div>

      <div>
        <b>Review ID:</b> {item.reviewId ?? "—"}
      </div>

      <div>
        <b>Image:</b>
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="h-16 mt-1 rounded border"
          />
        ) : (
          " —"
        )}
      </div>

      <div>
        <b>Deleted:</b>{" "}
        {item.isDeleted ? "Yes" : "No"}
      </div>

    </div>
  </div>
))}
        </div>
      )}
    </div>
  );
};

export default SectionItems;