import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  getAllSections,
  deleteHomeSection,
  HomeSection,
} from "../../api/homeCms";

const HomeCMS = () => {
  const navigate = useNavigate();

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================================
     FETCH ALL SECTIONS
  ================================ */
  const fetchSections = async () => {
    try {
      const res = await getAllSections();

      setSections(res.data);

      // cache for edit page
      localStorage.setItem(
        "homeCmsSections",
        JSON.stringify(res.data)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  /* ================================
     DELETE SECTION (SOFT DELETE)
  ================================ */
  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this section?"
    );

    if (!confirmDelete) return;

    try {
      await deleteHomeSection(id);

      alert("Section deleted successfully ✅");

      const updatedSections = sections.filter(
        (section) => section.sectionId !== id
      );

      setSections(updatedSections);

      localStorage.setItem(
        "homeCmsSections",
        JSON.stringify(updatedSections)
      );
    } catch (error) {
      console.error(error);
      alert("Failed to delete section ❌");
    }
  };

  /* ================================
     UI
  ================================ */
  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          Home CMS Sections
        </h1>

        <button
          onClick={() =>
            navigate("/home-cms/add-section")
          }
          className="bg-black text-white px-5 py-2 rounded hover:bg-gray-800"
        >
          + Add Section
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <p>Loading...</p>
      ) : sections.length === 0 ? (
        <p>No sections found</p>
      ) : (
        <div className="grid gap-4">
          {sections.map((section) => (
            <div
              key={section.sectionId}
              className="border rounded-lg p-5 bg-white"
            >
              <div className="flex justify-between items-center">
                {/* LEFT */}
                <div>
                  <h2 className="text-lg font-semibold">
                    {section.title}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {section.subtitle}
                  </p>

                  <div className="text-sm mt-2 space-x-4">
                    <span>
                      <b>Type:</b> {section.type}
                    </span>
                    <span>
                      <b>Gender:</b> {section.gender}
                    </span>
                    <span>
                      <b>Status:</b> {section.status}
                    </span>
                    <span>
                      <b>Position:</b> {section.position}
                    </span>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="text-right">
                  <p className="text-sm">
                    Items:{" "}
                    <b>{section.items?.length || 0}</b>
                  </p>

                  <div className="mt-2 flex gap-2 justify-end">
                    <button
                      className="border px-3 py-1 rounded text-sm"
                      onClick={() =>
                        navigate(
                          `/home-cms/edit/${section.sectionId}`
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="border px-3 py-1 rounded text-sm text-red-600"
                      onClick={() =>
                        handleDelete(section.sectionId)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeCMS;