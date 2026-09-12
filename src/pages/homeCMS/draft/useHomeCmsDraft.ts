import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { getAllSections, getSectionItems, type HomeSection } from "../../../api/homeCms";
import { draftReducer, EMPTY_DRAFT } from "./draftState";
import { planPublish, type PublishOp } from "./diff";
import { runPublish } from "./publish";
import {
  byPosition,
  nextLocalId,
  toDraftSection,
  toStatusWord,
  type DraftId,
  type DraftItem,
  type DraftSection,
} from "./types";

/**
 * The Home CMS editing session.
 *
 * Every mutator below is synchronous and local. Nothing reaches the storefront
 * until `publish()` — which matters more here than it would elsewhere, because
 * this panel's dev config points at the production backends: before this,
 * typing in a title field edited the live home page a keystroke at a time.
 */

// ── Input coercion ────────────────────────────────────────────────────────────
// The existing cards hand back form values: numbers as strings, empties as "".
// Normalising once here keeps the draft comparable — "3" and 3 are the same
// position, and a diff that cannot see that would republish the whole page.

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

type ItemInput = Partial<Record<keyof DraftItem, unknown>>;
type SectionInput = Partial<Record<keyof DraftSection, unknown>>;

const normalizeItem = (input: ItemInput): Partial<DraftItem> => {
  const out: Partial<DraftItem> = {};
  if ("image" in input) out.image = text(input.image);
  if ("heading" in input) out.heading = text(input.heading);
  if ("subheading" in input) out.subheading = text(input.subheading);
  if ("ctaText" in input) out.ctaText = text(input.ctaText);
  if ("link" in input) out.link = text(input.link);
  if ("productId" in input) out.productId = num(input.productId);
  if ("categoryId" in input) out.categoryId = num(input.categoryId);
  if ("reviewId" in input) out.reviewId = num(input.reviewId);
  if ("position" in input) out.position = num(input.position) ?? 0;
  return out;
};

const normalizeSection = (input: SectionInput): Partial<DraftSection> => {
  const out: Partial<DraftSection> = {};
  if ("type" in input) out.type = String(input.type ?? "");
  if ("title" in input) out.title = text(input.title) ?? "";
  if ("subtitle" in input) out.subtitle = text(input.subtitle) ?? "";
  if ("position" in input) out.position = num(input.position) ?? 0;
  if ("gender" in input) out.gender = String(input.gender ?? "");
  if ("status" in input) out.status = toStatusWord(input.status);
  return out;
};

const blankItem = (input: ItemInput): Omit<DraftItem, "itemId"> => ({
  image: null,
  heading: null,
  subheading: null,
  ctaText: null,
  link: null,
  productId: null,
  categoryId: null,
  reviewId: null,
  position: 0,
  ...normalizeItem(input),
});

// ── Loading ───────────────────────────────────────────────────────────────────

const loadSections = async (): Promise<DraftSection[]> => {
  const res = await getAllSections();
  const raw: HomeSection[] = res.data ?? [];

  const withItems = await Promise.all(
    raw.map(async (s) => {
      try {
        const items = await getSectionItems(s.sectionId);
        return toDraftSection(s, items.data ?? []);
      } catch {
        // One section's items failing is not a reason to lose the page; the
        // section shows empty and the rest of the draft still loads.
        return toDraftSection(s, []);
      }
    })
  );

  return byPosition(withItems);
};

export interface PublishReport {
  ok: boolean;
  applied: number;
  total: number;
  message: string;
}

export const useHomeCmsDraft = () => {
  const [state, dispatch] = useReducer(draftReducer, EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      dispatch({ type: "load", sections: await loadSections() });
    } catch {
      setLoadError("Failed to load sections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const plan: PublishOp[] = useMemo(() => planPublish(state), [state]);
  const isDirty = plan.length > 0;

  // Covers a reload, a closed tab and a click out to another site. In-app
  // navigation is not covered: this router is not a data router, so there is no
  // useBlocker to hang a prompt on.
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // ── Mutators ────────────────────────────────────────────────────────────────

  /** Returns the new section's local id, so the caller can select it. */
  const addSection = useCallback((input: SectionInput): DraftId => {
    const normalized = normalizeSection(input);
    const sectionId = nextLocalId("section");
    dispatch({
      type: "addSection",
      section: {
        sectionId,
        items: [],
        type: normalized.type ?? "HERO",
        title: normalized.title ?? "",
        subtitle: normalized.subtitle ?? "",
        position: normalized.position ?? 0,
        gender: normalized.gender ?? "MALE",
        // New sections start hidden. The backend reads a missing status as
        // live, so anything less explicit than this puts half-built sections
        // straight onto the storefront.
        status: normalized.status ?? "DRAFT",
      },
    });
    return sectionId;
  }, []);

  const updateSection = useCallback((id: DraftId, patch: SectionInput) => {
    dispatch({ type: "updateSection", id, patch: normalizeSection(patch) });
  }, []);

  const deleteSection = useCallback((id: DraftId) => {
    dispatch({ type: "deleteSection", id });
  }, []);

  const addItem = useCallback((sectionId: DraftId, input: ItemInput) => {
    dispatch({ type: "addItem", sectionId, item: blankItem(input) });
  }, []);

  const updateItem = useCallback((sectionId: DraftId, itemId: DraftId, patch: ItemInput) => {
    dispatch({ type: "updateItem", sectionId, itemId, patch: normalizeItem(patch) });
  }, []);

  const deleteItem = useCallback((sectionId: DraftId, itemId: DraftId) => {
    dispatch({ type: "deleteItem", sectionId, itemId });
  }, []);

  const reorderSections = useCallback((orderedIds: DraftId[]) => {
    dispatch({ type: "reorderSections", orderedIds });
  }, []);

  const reorderItems = useCallback((sectionId: DraftId, orderedIds: DraftId[]) => {
    dispatch({ type: "reorderItems", sectionId, orderedIds });
  }, []);

  const discard = useCallback(() => dispatch({ type: "discard" }), []);

  // ── Publish ─────────────────────────────────────────────────────────────────

  const publish = useCallback(async (): Promise<PublishReport> => {
    if (!plan.length) {
      return { ok: true, applied: 0, total: 0, message: "Nothing to publish." };
    }

    setPublishing(true);
    try {
      const result = await runPublish(plan);

      // Re-anchor on what the server now holds. Where that read fails but every
      // write landed, the screen is a true record of the server and can serve
      // as the baseline itself — the one thing that must not survive either way
      // is a local id on a row that now exists for real.
      try {
        const fresh = await loadSections();
        dispatch({
          type: "rebase",
          sections: fresh,
          sectionIds: result.sectionIds,
          itemIds: result.itemIds,
        });
      } catch {
        if (!result.failure) {
          dispatch({
            type: "commitLocal",
            sectionIds: result.sectionIds,
            itemIds: result.itemIds,
          });
          return {
            ok: true,
            applied: result.applied,
            total: result.total,
            message: `Published ${result.applied} change${result.applied === 1 ? "" : "s"}, but the page could not be refreshed.`,
          };
        }

        return {
          ok: false,
          applied: result.applied,
          total: result.total,
          message: `${result.failure.message} The page could not be refreshed either — reload before editing further.`,
        };
      }

      if (result.failure) {
        return {
          ok: false,
          applied: result.applied,
          total: result.total,
          message: `${result.failure.message} ${result.applied} of ${result.total} change${result.total === 1 ? "" : "s"} were published; the rest are still pending.`,
        };
      }

      return {
        ok: true,
        applied: result.applied,
        total: result.total,
        message: `Published ${result.applied} change${result.applied === 1 ? "" : "s"}.`,
      };
    } finally {
      setPublishing(false);
    }
  }, [plan]);

  return {
    sections: state.working,
    loading,
    loadError,
    publishing,
    isDirty,
    plan,
    pendingCount: plan.length,
    addSection,
    updateSection,
    deleteSection,
    addItem,
    updateItem,
    deleteItem,
    reorderSections,
    reorderItems,
    discard,
    publish,
    reload,
  };
};
