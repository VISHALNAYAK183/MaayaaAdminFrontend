import { useState } from "react";
import type { DraftId, DraftItem, DraftSection, SectionStatus } from "../draft/types";
import type { PreviewProduct } from "../preview/useStorefrontPreview";
import { SECTION_LABEL, resolveCmsImage } from "../editor/shared";
import DragHandle from "./DragHandle";
import { moved, useSortable } from "./useSortable";

/**
 * The outline: every section of the page being edited, in the order the
 * storefront will render them, draggable into a new one.
 *
 * Deliberately not an editor. Selecting a row moves the preview; opening one
 * hands the section to the full editor in the drawer. Keeping the two apart is
 * what lets the rail stay narrow enough to sit beside a 1440px preview.
 */

const STATUS_STYLE: Record<SectionStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  INACTIVE: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600",
};

const STATUS_LABEL: Record<SectionStatus, string> = {
  ACTIVE: "Live",
  DRAFT: "Draft",
  INACTIVE: "Off",
};

// ── Item row ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: DraftItem;
  index: number;
  sectionId: DraftId;
  draggable: boolean;
  product?: PreviewProduct;
  onMove: (from: number, to: number) => void;
}

const ItemRow = ({ item, index, sectionId, draggable, product, onMove }: ItemRowProps) => {
  // Scoped to its section: there is no API for moving an item between sections,
  // so a drag that crossed one would have to delete and recreate it, quietly
  // changing its id.
  const { isDragging, rowRef, handleRef } = useSortable({
    type: `cms-item:${sectionId}`,
    index,
    onMove,
    disabled: !draggable,
  });

  // The storefront draws a product card from the catalogue, so the rail shows
  // what it will actually render rather than what the item happens to store.
  const src = resolveCmsImage(product?.primaryImage ?? item.image);
  const label = product?.name ?? item.heading?.trim() ?? item.link;

  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-2 rounded px-1 py-1 ${isDragging ? "opacity-40" : ""}`}
    >
      {draggable && (
        <button
          ref={handleRef}
          className="cursor-grab px-0.5 active:cursor-grabbing"
          aria-label={`Reorder item ${item.position}`}
        >
          <DragHandle />
        </button>
      )}

      {src ? (
        <img src={src} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-[9px] text-gray-400 dark:bg-gray-700">
          {item.productId ? "#" + item.productId : "—"}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-[11px] text-gray-600 dark:text-gray-300">
        {label || `Item ${item.position}`}
      </span>
      <span className="text-[10px] text-gray-400">{item.position}</span>
    </div>
  );
};

// ── Section row ───────────────────────────────────────────────────────────────

interface SectionRowProps {
  section: DraftSection;
  index: number;
  selected: boolean;
  expanded: boolean;
  readOnly: boolean;
  draggable: boolean;
  /** The audience whose page this rail is showing. */
  tabGender: string;
  onSelect: (id: DraftId) => void;
  onOpen: (id: DraftId) => void;
  onDelete: (id: DraftId) => void;
  onStatus: (id: DraftId, status: SectionStatus) => void;
  onToggle: (id: DraftId) => void;
  onMove: (from: number, to: number) => void;
  onMoveItem: (sectionId: DraftId, from: number, to: number) => void;
  products?: Map<number, PreviewProduct>;
}

const SectionRow = ({
  section, index, selected, expanded, readOnly, draggable, tabGender, products,
  onSelect, onOpen, onDelete, onStatus, onToggle, onMove, onMoveItem,
}: SectionRowProps) => {
  const { isDragging, rowRef, handleRef } = useSortable({
    type: "cms-section",
    index,
    onMove,
    disabled: !draggable,
  });

  const items = [...section.items].sort((a, b) => a.position - b.position);
  const shared = section.gender === "OTHER" && tabGender !== "OTHER";

  return (
    <div
      ref={rowRef}
      data-rail-section={String(section.sectionId)}
      className={`rounded-lg border transition-colors ${isDragging ? "opacity-40" : ""} ${
        selected
          ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <div className="flex items-start gap-1.5 p-2.5">
        {draggable ? (
          <button
            ref={handleRef}
            className="mt-1 cursor-grab px-0.5 active:cursor-grabbing"
            aria-label={`Reorder ${section.title || section.type}`}
          >
            <DragHandle />
          </button>
        ) : (
          <span className="mt-1 px-0.5">
            <DragHandle disabled />
          </span>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(section.sectionId)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(section.sectionId);
            }
          }}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-2"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {section.position}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {section.title?.trim() || SECTION_LABEL[section.type] || section.type}
              </span>
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_STYLE[section.status]}`}>
                {STATUS_LABEL[section.status]}
              </span>
              {shared && (
                <span
                  className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
                  title="Unisex — this section also appears on the other audience's page, and moving it here moves it there too."
                >
                  Unisex
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">
              {SECTION_LABEL[section.type] ?? section.type}
              {section.items.length > 0 && ` · ${section.items.length} item${section.items.length === 1 ? "" : "s"}`}
              {typeof section.sectionId === "string" && " · unpublished"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-gray-100 px-2.5 py-1.5 dark:border-gray-700">
        {section.items.length > 0 && (
          <button
            onClick={() => onToggle(section.sectionId)}
            className="rounded px-1.5 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {expanded ? "Hide items" : "Items"}
          </button>
        )}

        {!readOnly && (
          <>
            <select
              value={section.status}
              onChange={(e) => onStatus(section.sectionId, e.target.value as SectionStatus)}
              className="rounded border border-gray-200 bg-transparent px-1 py-0.5 text-[11px] text-gray-600 dark:border-gray-600 dark:text-gray-300"
              aria-label="Section visibility"
            >
              <option value="ACTIVE">Live</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Off</option>
            </select>

            <button
              onClick={() => onOpen(section.sectionId)}
              className="ml-auto rounded px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(section.sectionId)}
              className="rounded px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="space-y-1 border-t border-gray-100 p-2 dark:border-gray-700">
          {items.map((item, i) => (
            <ItemRow
              key={item.itemId}
              item={item}
              index={i}
              sectionId={section.sectionId}
              draggable={!readOnly && items.length > 1}
              product={item.productId != null ? products?.get(item.productId) : undefined}
              onMove={(from, to) => onMoveItem(section.sectionId, from, to)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Rail ──────────────────────────────────────────────────────────────────────

interface Props {
  sections: DraftSection[];
  selectedId: DraftId | null;
  loading: boolean;
  readOnly: boolean;
  /** False on the Unisex tab, which is a filter rather than a whole page. */
  sortable: boolean;
  tabGender: string;
  onSelect: (id: DraftId) => void;
  onOpen: (id: DraftId) => void;
  onDelete: (id: DraftId) => void;
  onStatus: (id: DraftId, status: SectionStatus) => void;
  onReorderSections: (orderedIds: DraftId[]) => void;
  onReorderItems: (sectionId: DraftId, orderedIds: DraftId[]) => void;
  onAdd: () => void;
  products?: Map<number, PreviewProduct>;
}

const StudioRail = ({
  sections, selectedId, loading, readOnly, sortable, tabGender, products,
  onSelect, onOpen, onDelete, onStatus, onReorderSections, onReorderItems, onAdd,
}: Props) => {
  const [expanded, setExpanded] = useState<DraftId | null>(null);

  const moveSection = (from: number, to: number) => {
    onReorderSections(moved(sections.map((s) => s.sectionId), from, to));
  };

  const moveItem = (sectionId: DraftId, from: number, to: number) => {
    const section = sections.find((s) => s.sectionId === sectionId);
    if (!section) return;
    const ordered = [...section.items].sort((a, b) => a.position - b.position).map((i) => i.itemId);
    onReorderItems(sectionId, moved(ordered, from, to));
  };

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-400">No sections for this audience yet.</p>
        {!readOnly && (
          <button onClick={onAdd} className="mt-3 text-sm font-medium text-blue-500 hover:text-blue-700">
            + Add the first section
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 p-3">
      {sections.map((section, index) => (
        <SectionRow
          key={section.sectionId}
          section={section}
          index={index}
          selected={selectedId === section.sectionId}
          expanded={expanded === section.sectionId}
          readOnly={readOnly}
          draggable={sortable && !readOnly && sections.length > 1}
          tabGender={tabGender}
          products={products}
          onSelect={onSelect}
          onOpen={onOpen}
          onDelete={onDelete}
          onStatus={onStatus}
          onToggle={(id) => setExpanded(expanded === id ? null : id)}
          onMove={moveSection}
          onMoveItem={moveItem}
        />
      ))}
    </div>
  );
};

export default StudioRail;
