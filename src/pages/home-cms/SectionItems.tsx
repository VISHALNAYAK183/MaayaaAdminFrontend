import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  getItems,
  deleteItem,
} from "../../api/homeCms.api";
import { HomeSectionItem } from "../../types/homeCms";

export default function SectionItems() {
  const { sectionId } = useParams();
  const [items, setItems] = useState<HomeSectionItem[]>([]);

  const load = () =>
    getItems(Number(sectionId)).then((r) => setItems(r.data));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">
        Section Items
      </h2>

      <table className="w-full border">
        <thead>
          <tr>
            <th>ID</th>
            <th>Image</th>
            <th>Heading</th>
            <th>Product</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((i) => (
            <tr key={i.itemId}>
              <td>{i.itemId}</td>
              <td>
                {i.image && (
                  <img src={i.image} width={60} />
                )}
              </td>
              <td>{i.heading}</td>
              <td>{i.productId}</td>
              <td>
                <button
                  onClick={() =>
                    deleteItem(i.itemId!).then(load)
                  }
                  className="text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}