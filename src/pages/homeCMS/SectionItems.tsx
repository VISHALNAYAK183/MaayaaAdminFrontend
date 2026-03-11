import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { getSectionItems, SectionItem } from "../../api/homeCms";

const SectionItems = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await getSectionItems(Number(sectionId));
      setItems(res.data);
      localStorage.setItem("sectionItems", JSON.stringify(res.data));
    } catch (err) {
      console.error(err);
      alert("Failed to load section items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/home-cms")}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          >
            ←
          </button>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Section #{sectionId}</p>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Items</h1>
          </div>
        </div>
        <button
          onClick={() => navigate(`/home-cms/section/${sectionId}/items/add`)}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Item
        </button>
      </div>

      <div className="px-8 py-8 max-w-6xl mx-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <EmptyState onAdd={() => navigate(`/home-cms/section/${sectionId}/items/add`)} />
        ) : (
          /* Sketch-style card grid — landscape cards with image + link/edit labels */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ItemCard
                key={item.itemId}
                item={item}
                onEdit={() => navigate(`/home-cms/section/${sectionId}/items/edit/${item.itemId}`)}
              />
            ))}
            {/* + Add tile */}
            <button
              onClick={() => navigate(`/home-cms/section/${sectionId}/items/add`)}
              className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 hover:bg-white transition-all"
            >
              <span className="text-3xl font-light">+</span>
              <span className="text-xs font-medium">Add Item</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── ITEM CARD (matches sketch: image with x, link label, edit label) ── */
const ItemCard = ({ item, onEdit }: { item: SectionItem; onEdit: () => void }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          </div>
        )}
        {/* Position badge */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          #{item.position}
        </div>
      </div>

      {/* Labels row — from sketch: "link  edit" at bottom */}
      <div className="px-3 py-2.5">
        {(item.heading || item.subheading) && (
          <div className="mb-2">
            {item.heading && <p className="text-xs font-semibold text-gray-800 truncate">{item.heading}</p>}
            {item.subheading && <p className="text-[11px] text-gray-500 truncate">{item.subheading}</p>}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Link indicator */}
          <div className="flex items-center gap-1">
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-blue-500 underline font-medium truncate max-w-[80px]"
              >
                link ↗
              </a>
            ) : (
              <span className="text-[11px] text-gray-300">no link</span>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={onEdit}
            className="text-[11px] font-semibold text-gray-600 border border-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-50 transition-colors"
          >
            edit
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
        <div className="aspect-[4/3] bg-gray-100" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
    <p className="text-gray-400 text-sm mb-4">No items in this section yet</p>
    <button
      onClick={onAdd}
      className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700"
    >
      + Add First Item
    </button>
  </div>
);

export default SectionItems;