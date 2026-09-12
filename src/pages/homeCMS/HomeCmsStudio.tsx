import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useReadOnly } from "../../hooks/useReadOnly";
import { useHomeCmsDraft } from "./draft/useHomeCmsDraft";
import type { DraftId, SectionStatus } from "./draft/types";
import { SectionBlock, SectionModal } from "./editor/SectionEditor";
import { GENDER_TABS } from "./editor/shared";
import { useStorefrontPreview } from "./preview/useStorefrontPreview";
import { useProductLookup } from "./preview/useProductLookup";
import { referencedProductIds, toPreviewPayload, viewerGenderFor } from "./preview/toPreviewPayload";
import StudioPreview from "./studio/StudioPreview";
import { DEVICES } from "./studio/devices";
import StudioRail from "./studio/StudioRail";

/**
 * Home CMS studio — the outline on the left, the real storefront on the right.
 *
 * Nothing on this screen writes to the site. Edits land in a draft, the draft
 * is pushed into the preview frame on every change, and Publish is the single
 * moment anything reaches customers. That separation is the whole design: this
 * panel's dev config points at the production backend, so "arrange it and look
 * at it first" has to be possible without touching the live page.
 */

const StudioHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>
);

const HomeCmsStudio = () => {
  const readOnly = useReadOnly();

  const [gender, setGender] = useState("MALE");
  const [device, setDevice] = useState(DEVICES[0]);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [selected, setSelected] = useState<DraftId | null>(null);
  const [editing, setEditing] = useState<DraftId | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const {
    sections, loading, loadError, publishing, isDirty, pendingCount,
    addSection, updateSection, deleteSection, addItem, updateItem, deleteItem,
    reorderSections, reorderItems, discard, publish, reload,
  } = useHomeCmsDraft();

  // ── Preview ────────────────────────────────────────────────────────────────

  /**
   * Ids come back from the frame as strings, and a draft section's id is a
   * number until it has been published. Resolving through the draft rather than
   * storing the string keeps one id type on this side — otherwise a section
   * clicked in the preview never lights up in the rail, because "5" is not 5.
   */
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const onSectionClick = useCallback(
    (sectionId: string) => {
      const match = sectionsRef.current.find((s) => String(s.sectionId) === sectionId);
      if (!match) return;

      // A unisex section appears on the Men's preview but lives under the Unisex
      // tab. Clicking it should take the rail to where it can be edited, rather
      // than selecting a row that is not on screen.
      if (match.gender !== gender) setGender(match.gender);
      setSelected(match.sectionId);
    },
    [gender]
  );

  const { iframeRef, src, origin, ready, frameKey, render, select, reload: reloadFrame } =
    useStorefrontPreview({ onSectionClick });

  const productIds = useMemo(() => referencedProductIds(sections), [sections]);
  const { products } = useProductLookup(productIds);

  const payload = useMemo(
    () => toPreviewPayload(sections, { gender, includeDrafts, products }),
    [sections, gender, includeDrafts, products]
  );

  useEffect(() => {
    render(payload, viewerGenderFor(gender));
  }, [payload, gender, render]);

  // Selection travels both ways: the frame highlights and scrolls to the
  // section, and the rail scrolls the matching row into view.
  useEffect(() => {
    select(selected);
    if (selected == null) return;
    document
      .querySelector(`[data-rail-section="${String(selected)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected, select]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * What the rail shows.
   *
   * For Men and Women it is the page as composed — that audience's sections
   * merged with the unisex ones and ordered by position, exactly as the
   * storefront assembles it. Anything narrower would be a list you cannot
   * reorder honestly: `position` is a page-level ordinal shared across the
   * merge, so renumbering half of it would leave the two halves interleaved by
   * numbers that no longer mean anything.
   *
   * The Unisex tab is a filter rather than a page — somewhere to find and edit
   * unisex sections — so it lists only those, and dragging is off there.
   */
  const visible = useMemo(() => {
    const onPage =
      gender === "OTHER"
        ? sections.filter((s) => s.gender === "OTHER")
        : sections.filter((s) => s.gender === gender || s.gender === "OTHER");

    return onPage.sort((a, b) => a.position - b.position);
  }, [sections, gender]);

  const sortable = gender !== "OTHER";

  const openSection = sections.find((s) => s.sectionId === editing) ?? null;

  const onAdd = (data: unknown) => {
    const id = addSection(data as Record<string, unknown>);
    setAddOpen(false);
    setSelected(id);
    setEditing(id);
  };

  const onDelete = (id: DraftId) => {
    if (!window.confirm("Delete this section? It stays on the site until you publish.")) return;
    deleteSection(id);
    if (selected === id) setSelected(null);
    if (editing === id) setEditing(null);
  };

  const onDeleteItem = (sectionId: DraftId, itemId: DraftId) => {
    if (!window.confirm("Delete this item? It stays on the site until you publish.")) return;
    deleteItem(sectionId, itemId);
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

  const tabClass = (active: boolean) =>
    `px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
      active
        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
    }`;

  return (
    <>
      <StudioHeader>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Home CMS</h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Arrange the home page and see it before customers do.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {GENDER_TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setGender(key)} className={tabClass(gender === key)}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {DEVICES.map((d) => (
              <button
                key={d.label}
                onClick={() => setDevice(d)}
                className={tabClass(device.label === d.label)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeDrafts}
              onChange={(e) => setIncludeDrafts(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Show drafts
          </label>

          <button
            onClick={() => { reloadFrame(); reload(); }}
            className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          >
            Refresh
          </button>

          {!readOnly && (
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Section
            </button>
          )}
        </div>
      </StudioHeader>

      {gender === "OTHER" && (
        <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Unisex sections have no page of their own — they appear on both the Men's and
          Women's pages, and the preview shows them alongside the Men's. Order them from
          those tabs, where the whole page is visible.
        </p>
      )}

      {!readOnly && isDirty && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
            {pendingCount}
          </span>
          <span className="text-sm text-amber-900 dark:text-amber-200">
            unpublished change{pendingCount === 1 ? "" : "s"} — shown here, not on the site yet.
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={onDiscard}
              disabled={publishing}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              Discard
            </button>
            <button
              onClick={onPublish}
              disabled={publishing}
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      )}

      {(notice || loadError) && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice?.ok && !loadError
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          <span className="flex-1">{loadError ?? notice?.text}</span>
          {notice && (
            <button onClick={() => setNotice(null)} className="font-medium opacity-70 hover:opacity-100">
              Dismiss
            </button>
          )}
        </div>
      )}

      <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-15rem)] min-h-[520px] gap-4">
        <div className="w-[340px] shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-900/40">
          <StudioRail
            sections={visible}
            selectedId={selected}
            loading={loading}
            readOnly={readOnly}
            sortable={sortable}
            tabGender={gender}
            products={products}
            onSelect={setSelected}
            onOpen={(id) => { setSelected(id); setEditing(id); }}
            onDelete={onDelete}
            onStatus={(id, status: SectionStatus) => updateSection(id, { status })}
            onReorderSections={reorderSections}
            onReorderItems={reorderItems}
            onAdd={() => setAddOpen(true)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <StudioPreview
            iframeRef={iframeRef}
            src={src}
            frameKey={frameKey}
            device={device}
            ready={ready}
            invalidBase={!origin}
          />
        </div>
      </div>
      </DndProvider>

      {/* The section editor, opened over the studio rather than replacing it —
        the preview stays visible while its section is being edited. */}
      {openSection && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={() => setEditing(null)}>
          <div
            className="h-full w-full max-w-3xl overflow-y-auto bg-gray-50 p-4 shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Edit section</h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
              >
                Done
              </button>
            </div>

            <SectionBlock
              section={openSection}
              products={products}
              onDelete={() => onDelete(openSection.sectionId)}
              onUpdate={(p) => updateSection(openSection.sectionId, p)}
              onAddItem={(p) => addItem(openSection.sectionId, p)}
              onUpdateItem={(iid, p) => updateItem(openSection.sectionId, iid, p)}
              onDeleteItem={(iid) => onDeleteItem(openSection.sectionId, iid)}
            />
          </div>
        </div>
      )}

      {addOpen && (
        <SectionModal
          initial={{ gender }}
          onClose={() => setAddOpen(false)}
          onSave={onAdd}
        />
      )}
    </>
  );
};

export default HomeCmsStudio;
