import { useEffect, useState } from "react";
import { getSections, deleteSection } from "../../api/homeCms.api";
import { HomeSection } from "../../types/homeCms";
import { Link } from "react-router";

export default function HomeCms() {
  const [sections, setSections] = useState<HomeSection[]>([]);

  const load = () =>
    getSections().then((res) => setSections(res.data));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Home CMS Sections</h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Title</th>
            <th>Position</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {sections.map((s) => (
            <tr key={s.sectionId}>
              <td>{s.sectionId}</td>
              <td>{s.type}</td>
              <td>{s.title}</td>
              <td>{s.position}</td>
              <td className="flex gap-3">
                <Link
                  to={`/home-cms/sections/${s.sectionId}/items`}
                  className="text-blue-600"
                >
                  Items
                </Link>

                <button
                  onClick={() => deleteSection(s.sectionId).then(load)}
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