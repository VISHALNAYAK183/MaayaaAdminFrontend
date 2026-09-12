import { useReducer, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { draftReducer, EMPTY_DRAFT } from "./draft/draftState";
import type { DraftId, DraftSection } from "./draft/types";
import StudioRail from "./studio/StudioRail";
import { SectionBlock } from "./editor/SectionEditor";

/**
 * Dev-only rig for the rail.
 *
 * The studio sits behind sign-in, and drag-and-drop is the one part of it that
 * cannot be checked by reading the code — it depends on react-dnd's HTML5
 * backend actually working in this React version. This mounts the real rail
 * over the real reducer with fabricated sections, on a route that exists only
 * in a dev build. Goes away with the harness.
 */

const section = (over: Partial<DraftSection>): DraftSection => ({
  sectionId: 1, type: "HERO", title: "Hero", subtitle: "",
  position: 1, status: "ACTIVE", gender: "MALE", items: [], ...over,
});

const SEED: DraftSection[] = [
  section({ sectionId: 1, title: "Hero", position: 1, items: [
    { itemId: 10, image: null, heading: "Slide one", subheading: null, ctaText: null, link: "/a", productId: null, categoryId: null, reviewId: null, position: 1 },
    { itemId: 11, image: null, heading: "Slide two", subheading: null, ctaText: null, link: "/b", productId: null, categoryId: null, reviewId: null, position: 2 },
    { itemId: 12, image: null, heading: "Slide three", subheading: null, ctaText: null, link: "/c", productId: null, categoryId: null, reviewId: null, position: 3 },
  ] }),
  section({ sectionId: 2, title: "Unisex promo", type: "PROMO", position: 2, gender: "OTHER" }),
  section({ sectionId: 3, title: "Featured", type: "FEATURED_PRODUCTS", position: 3, status: "DRAFT" }),
  section({ sectionId: 4, title: "Reviews", type: "REVIEWS", position: 4, status: "INACTIVE" }),
  section({ sectionId: 5, title: "Shop by Category", type: "CATEGORIES", position: 5, items: [
    { itemId: 50, image: null, heading: null, subheading: null, ctaText: null, link: null, productId: null, categoryId: null, reviewId: null, position: 1 },
    { itemId: 51, image: null, heading: "Kurtas", subheading: null, ctaText: null, link: "/search?categories=3", productId: null, categoryId: 3, reviewId: null, position: 2 },
  ] }),
  section({ sectionId: 6, title: "Featured", type: "FEATURED_PRODUCTS", position: 6, items: [
    { itemId: 60, image: null, heading: "Stored name", subheading: null, ctaText: null, link: null, productId: 4242, categoryId: null, reviewId: null, position: 1 },
  ] }),
];

const RailSandbox = () => {
  const [state, dispatch] = useReducer(draftReducer, EMPTY_DRAFT, (empty) =>
    draftReducer(empty, { type: "load", sections: SEED })
  );
  const [selected, setSelected] = useState<DraftId | null>(null);

  const order = state.working
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.position}:${s.title}`)
    .join("  |  ");

  return (
    <div className="p-4">
      <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Dev sandbox.</strong> The real rail over the real reducer. Not registered in production builds.
      </div>

      <p data-testid="order" className="mb-3 rounded bg-gray-900 px-3 py-2 font-mono text-xs text-gray-100">
        {order}
      </p>

      <DndProvider backend={HTML5Backend}>
        <div className="w-[340px] rounded-xl border border-gray-200 bg-gray-50">
          <StudioRail
            sections={state.working.slice().sort((a, b) => a.position - b.position)}
            selectedId={selected}
            loading={false}
            readOnly={false}
            sortable
            tabGender="MALE"
            onSelect={setSelected}
            onOpen={setSelected}
            onDelete={(id) => dispatch({ type: "deleteSection", id })}
            onStatus={(id, status) => dispatch({ type: "updateSection", id, patch: { status } })}
            onReorderSections={(orderedIds) => dispatch({ type: "reorderSections", orderedIds })}
            onReorderItems={(sectionId, orderedIds) => dispatch({ type: "reorderItems", sectionId, orderedIds })}
            onAdd={() => {}}
          />
        </div>
      </DndProvider>

      {/* The editors, where the pickers live. Signed out, the catalogue calls
        fail — which is the point of showing them here: the fallbacks have to be
        legible, not a crash. */}
      <div className="mt-6 space-y-4">
        {state.working
          .filter((s2) => s2.sectionId === 5 || s2.sectionId === 6)
          .map((s2) => (
            <SectionBlock
              key={s2.sectionId}
              section={s2}
              onDelete={() => dispatch({ type: "deleteSection", id: s2.sectionId })}
              onUpdate={(p) => dispatch({ type: "updateSection", id: s2.sectionId, patch: p })}
              onAddItem={(p) => dispatch({ type: "addItem", sectionId: s2.sectionId, item: p })}
              onUpdateItem={(iid, p) => dispatch({ type: "updateItem", sectionId: s2.sectionId, itemId: iid, patch: p })}
              onDeleteItem={(iid) => dispatch({ type: "deleteItem", sectionId: s2.sectionId, itemId: iid })}
            />
          ))}
      </div>
    </div>
  );
};

export default RailSandbox;
