/**
 * The classic Home CMS list — every section stacked down the page.
 *
 * Kept at /home-cms/classic while the studio beds in. It edits the same draft
 * and publishes through the same plan, so the two are interchangeable.
 */
import { useState } from "react";
import { useReadOnly } from "../../hooks/useReadOnly";
import { useHomeCmsDraft } from "./draft/useHomeCmsDraft";
import type { DraftId } from "./draft/types";
import { SectionBlock, SectionModal } from "./editor/SectionEditor";
import { GENDER_TABS } from "./editor/shared";

// ─── ROOT ────────────────────────────────────────────────────────────────────
const HomeCMS = () => {
  const readOnly = useReadOnly();
  const [addOpen, setAddOpen] = useState(false);
  const [activeGender, setActiveGender] = useState("MALE");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const {
    sections,
    loading,
    loadError,
    publishing,
    isDirty,
    pendingCount,
    addSection: stageSection,
    updateSection,
    deleteSection: removeSection,
    addItem,
    updateItem,
    deleteItem: removeItem,
    discard,
    publish,
  } = useHomeCmsDraft();

  const deleteSection = (id: DraftId) => {
    if (!window.confirm("Delete this section? It stays on the site until you publish.")) return;
    removeSection(id);
  };

  const deleteItem = (sectionId: DraftId, itemId: DraftId) => {
    if (!window.confirm("Delete this item? It stays on the site until you publish.")) return;
    removeItem(sectionId, itemId);
  };

  const addSection = (data: any) => {
    stageSection(data);
    setAddOpen(false);
  };

  const onPublish = async () => {
    const report = await publish();
    setNotice({ ok: report.ok, text: report.message });
  };

  const onDiscard = () => {
    if (!window.confirm(`Discard ${pendingCount} unpublished change${pendingCount === 1 ? "" : "s"}?`)) return;
    discard();
    setNotice(null);
  };

  const visibleSections = sections.filter((s) => s.gender === activeGender);

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Home CMS</h1>
          <p className="text-sm text-gray-500 mt-1">The list view, from before the studio</p>
        </div>
        {!readOnly && (
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition-colors shell-press"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Section
        </button>
        )}
      </div>

      {/* Unpublished changes. Everything above and below this bar is edited in
        the browser only — this is the one control that writes to the site. */}
      {!readOnly && isDirty && (
        <div className="sticky top-0 z-20 mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
            {pendingCount}
          </span>
          <span className="text-sm text-amber-900">
            unpublished change{pendingCount === 1 ? "" : "s"} — the storefront still shows the old page.
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={onDiscard}
              disabled={publishing}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 shell-press"
            >
              Discard
            </button>
            <button
              onClick={onPublish}
              disabled={publishing}
              className="rounded-full bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 shell-press"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-medium opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      {/* Gender Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-full w-fit">
        {GENDER_TABS.map(({ key, label }) => {
          const count = sections.filter((s) => s.gender === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveGender(key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all shell-press ${
                activeGender === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  activeGender === key
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shell-panel h-36 animate-pulse" />
          ))
        ) : visibleSections.length === 0 ? (
          <div className="shell-panel border-dashed p-16 text-center">
            <p className="text-gray-400 text-sm">
              No sections for{" "}
              <span className="font-medium">{GENDER_TABS.find((t) => t.key === activeGender)?.label}</span>{" "}
              yet.
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-3 text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              + Add the first section
            </button>
          </div>
        ) : (
          visibleSections.map((s) => (
            <SectionBlock
              key={s.sectionId}
              section={s}
              onDelete={() => deleteSection(s.sectionId)}
              onUpdate={(p) => updateSection(s.sectionId, p)}
              onAddItem={(p) => addItem(s.sectionId, p)}
              onUpdateItem={(iid, p) => updateItem(s.sectionId, iid, p)}
              onDeleteItem={(iid) => deleteItem(s.sectionId, iid)}
            />
          ))
        )}
      </div>

      {addOpen && (
        <SectionModal
          initial={{ gender: activeGender }}
          onClose={() => setAddOpen(false)}
          onSave={addSection}
        />
      )}
    </>
  );
};

export default HomeCMS;
