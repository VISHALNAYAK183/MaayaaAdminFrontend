import {
  byPosition,
  isUnsaved,
  nextLocalId,
  type DraftId,
  type DraftItem,
  type DraftSection,
} from "./types";

/**
 * Draft state and the reducer that moves it.
 *
 * `baseline` is the last thing the server told us; `working` is what the
 * merchandiser has arranged. The difference between the two is the publish
 * plan (see diff.ts) — nothing here talks to the API.
 *
 * Deletions are tracked explicitly rather than inferred from "present in
 * baseline, absent from working". The distinction matters the moment the
 * baseline is refreshed: a section that appeared on the server while this draft
 * was open is something to adopt, not something to delete.
 */

export interface DraftState {
  baseline: DraftSection[];
  working: DraftSection[];
  /** Ids the merchandiser removed this session, database rows only. */
  deletedSections: number[];
  deletedItems: number[];
}

export const EMPTY_DRAFT: DraftState = {
  baseline: [],
  working: [],
  deletedSections: [],
  deletedItems: [],
};

export type DraftAction =
  | { type: "load"; sections: DraftSection[] }
  | { type: "addSection"; section: DraftSection }
  | { type: "updateSection"; id: DraftId; patch: Partial<DraftSection> }
  | { type: "deleteSection"; id: DraftId }
  | { type: "addItem"; sectionId: DraftId; item: Omit<DraftItem, "itemId"> }
  | { type: "updateItem"; sectionId: DraftId; itemId: DraftId; patch: Partial<DraftItem> }
  | { type: "deleteItem"; sectionId: DraftId; itemId: DraftId }
  | { type: "reorderSections"; orderedIds: DraftId[] }
  | { type: "reorderItems"; sectionId: DraftId; orderedIds: DraftId[] }
  | { type: "discard" }
  | { type: "rebase"; sections: DraftSection[]; sectionIds: Map<string, number>; itemIds: Map<string, number> }
  | { type: "commitLocal"; sectionIds: Map<string, number>; itemIds: Map<string, number> };

const clone = (sections: DraftSection[]): DraftSection[] =>
  sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));

const mapSection = (
  sections: DraftSection[],
  id: DraftId,
  fn: (s: DraftSection) => DraftSection
): DraftSection[] => sections.map((s) => (s.sectionId === id ? fn(s) : s));

export const draftReducer = (state: DraftState, action: DraftAction): DraftState => {
  switch (action.type) {
    case "load":
      return {
        baseline: clone(action.sections),
        working: clone(action.sections),
        deletedSections: [],
        deletedItems: [],
      };

    case "addSection":
      return { ...state, working: [...state.working, action.section] };

    case "updateSection":
      return {
        ...state,
        working: mapSection(state.working, action.id, (s) => ({ ...s, ...action.patch })),
      };

    case "deleteSection": {
      // A section that was never published just disappears — there is nothing
      // on the server to tell about it.
      const remembered =
        isUnsaved(action.id) || state.deletedSections.includes(action.id as number)
          ? state.deletedSections
          : [...state.deletedSections, action.id as number];

      return {
        ...state,
        working: state.working.filter((s) => s.sectionId !== action.id),
        deletedSections: remembered,
      };
    }

    case "addItem":
      return {
        ...state,
        working: mapSection(state.working, action.sectionId, (s) => ({
          ...s,
          items: [...s.items, { ...action.item, itemId: nextLocalId("item") }],
        })),
      };

    case "updateItem":
      return {
        ...state,
        working: mapSection(state.working, action.sectionId, (s) => ({
          ...s,
          items: s.items.map((i) =>
            i.itemId === action.itemId ? { ...i, ...action.patch } : i
          ),
        })),
      };

    case "deleteItem": {
      const remembered =
        isUnsaved(action.itemId) || state.deletedItems.includes(action.itemId as number)
          ? state.deletedItems
          : [...state.deletedItems, action.itemId as number];

      return {
        ...state,
        working: mapSection(state.working, action.sectionId, (s) => ({
          ...s,
          items: s.items.filter((i) => i.itemId !== action.itemId),
        })),
        deletedItems: remembered,
      };
    }

    /**
     * Renumber a page 1..N in the order given.
     *
     * `position` is a page-level ordinal, not a per-gender one: the storefront
     * merges a viewer's sections with the unisex ones and sorts the lot by
     * position. So the list handed in here is the whole merged page, and
     * anything not in it — the other gender's sections — keeps the position it
     * had.
     */
    case "reorderSections": {
      const rank = new Map(action.orderedIds.map((id, i) => [id, i + 1]));
      return {
        ...state,
        working: state.working.map((s) => {
          const position = rank.get(s.sectionId);
          return position === undefined || position === s.position ? s : { ...s, position };
        }),
      };
    }

    /**
     * Same, one level down. Items are renumbered 1..N with no gaps, which is
     * also what the editor's manual position field insists on — a drag and a
     * typed position have to leave the section in the same shape.
     */
    case "reorderItems": {
      const rank = new Map(action.orderedIds.map((id, i) => [id, i + 1]));
      return {
        ...state,
        working: mapSection(state.working, action.sectionId, (s) => ({
          ...s,
          items: s.items.map((i) => {
            const position = rank.get(i.itemId);
            return position === undefined || position === i.position ? i : { ...i, position };
          }),
        })),
      };
    }

    case "discard":
      return {
        ...state,
        working: clone(state.baseline),
        deletedSections: [],
        deletedItems: [],
      };

    /**
     * Re-anchor the draft on a freshly loaded baseline after a publish.
     *
     * Rows this publish created carry local ids in `working`; swapping those for
     * the ids the server handed back is what stops a retry after a partial
     * failure from creating everything a second time.
     *
     * Rows in the new baseline that `working` has never seen are adopted rather
     * than treated as deletions — they are someone else's work, or a row an
     * earlier op created before this one failed, and neither should be wiped by
     * the next Publish.
     */
    case "rebase": {
      const { sectionIds, itemIds } = action;

      const rekeyed = state.working.map((s) => ({
        ...s,
        sectionId: isUnsaved(s.sectionId)
          ? sectionIds.get(s.sectionId) ?? s.sectionId
          : s.sectionId,
        items: s.items.map((i) => ({
          ...i,
          itemId: isUnsaved(i.itemId) ? itemIds.get(i.itemId) ?? i.itemId : i.itemId,
        })),
      }));

      // A row someone else already removed is no longer ours to delete.
      const deletedSections = state.deletedSections.filter((id) =>
        action.sections.some((s) => s.sectionId === id)
      );

      const held = new Set(rekeyed.map((s) => s.sectionId));
      const adopted = action.sections.filter(
        (s) => !held.has(s.sectionId) && !deletedSections.includes(s.sectionId as number)
      );

      const working = byPosition([...rekeyed, ...clone(adopted)]).map((s) => {
        const fresh = action.sections.find((b) => b.sectionId === s.sectionId);
        if (!fresh) return s;

        // Same rule one level down: an item on the server that this draft has
        // no record of joins the section rather than being deleted by it.
        const heldItems = new Set(s.items.map((i) => i.itemId));
        const adoptedItems = fresh.items.filter(
          (i) => !heldItems.has(i.itemId) && !state.deletedItems.includes(i.itemId as number)
        );

        return adoptedItems.length
          ? { ...s, items: byPosition([...s.items, ...adoptedItems.map((i) => ({ ...i }))]) }
          : s;
      });

      const survivingItemIds = new Set(
        action.sections.flatMap((s) => s.items.map((i) => i.itemId))
      );

      return {
        baseline: clone(action.sections),
        working,
        deletedSections,
        deletedItems: state.deletedItems.filter((id) => survivingItemIds.has(id)),
      };
    }

    /**
     * Everything in the plan was written, but the reload that would have
     * brought back the server's own copy failed. What is on screen is what was
     * just published, so it becomes the baseline — with the created rows given
     * their real ids, because leaving local ids in place would make the next
     * Publish create all of them a second time.
     */
    case "commitLocal": {
      const rekeyed = state.working.map((s) => ({
        ...s,
        sectionId: isUnsaved(s.sectionId)
          ? action.sectionIds.get(s.sectionId) ?? s.sectionId
          : s.sectionId,
        items: s.items.map((i) => ({
          ...i,
          itemId: isUnsaved(i.itemId) ? action.itemIds.get(i.itemId) ?? i.itemId : i.itemId,
        })),
      }));

      return {
        baseline: clone(rekeyed),
        working: rekeyed,
        deletedSections: [],
        deletedItems: [],
      };
    }

    default:
      return state;
  }
};
