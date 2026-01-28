import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getAllSections, HomeSection } from "../../api/homeCms";

const HomeCMS = () => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
const fetchSections = async () => {
  try {
    const res = await getAllSections();

    setSections(res.data);

    // ✅ store locally
    localStorage.setItem(
      "homeCmsSections",
      JSON.stringify(res.data)
    );
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchSections();
  }, []);

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Home CMS Sections</h1>

        <button
          onClick={() => navigate("/home-cms/add-section")}
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

                <div className="text-right">
                  <p className="text-sm">
                    Items:{" "}
                    <b>{section.items?.length || 0}</b>
                  </p>

                  {/* future buttons */}
                  <div className="mt-2 flex gap-2 justify-end">
                    <button className="border px-3 py-1 rounded text-sm">
                      View Items
                    </button>
                   <button
  className="border px-3 py-1 rounded text-sm"
  onClick={() =>
    navigate(`/home-cms/edit/${section.sectionId}`)
  }
>
  Edit
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