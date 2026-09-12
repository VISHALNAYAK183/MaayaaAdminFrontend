import type { AddItemPayload, AddSectionPayload } from "../../../api/homeCms";
import type { DraftState } from "./draftState";
import { isUnsaved, type DraftId, type DraftItem, type DraftSection } from "./types";

/**
 * Turns a draft into the ordered list of writes that would publish it.
 *
 * Order is not cosmetic — it is the only thing keeping the plan referentially
 * sound: a section has to exist before its items can be hung off it, and
 * deletes come last so a failure halfway through leaves rows behind rather than
 * taking rows away.
 *
 * Payloads are always complete records, never patches. Both backend services
 * overwrite every column from the DTO, so a partial update is how a section
 * loses its subtitle and an item loses its link.
 */

export type PublishOp =
  | { kind: "create-section"; localId: string; label: string; data: AddSectionPayload }
  | { kind: "update-section"; sectionId: number; label: string; data: AddSectionPayload }
  | { kind: "create-item"; sectionRef: DraftId; localId: string; label: string; data: AddItemPayload }
  | { kind: "update-item"; itemId: number; label: string; data: AddItemPayload }
  | { kind: "delete-item"; itemId: number; label: string }
  | { kind: "delete-section"; sectionId: number; label: string };

const sectionPayload = (s: DraftSection): AddSectionPayload => ({
  type: s.type,
  title: s.title,
  subtitle: s.subtitle,
  position: s.position,
  gender: s.gender,
  status: s.status,
});

const itemPayload = (i: DraftItem): AddItemPayload => ({
  image: i.image,
  heading: i.heading,
  subheading: i.subheading,
  ctaText: i.ctaText,
  link: i.link,
  productId: i.productId,
  categoryId: i.categoryId,
  reviewId: i.reviewId,
  position: i.position,
});

const SECTION_FIELDS = ["type", "title", "subtitle", "position", "gender", "status"] as const;
const ITEM_FIELDS = [
  "image", "heading", "subheading", "ctaText", "link",
  "productId", "categoryId", "reviewId", "position",
] as const;

const sectionChanged = (a: DraftSection, b: DraftSection) =>
  SECTION_FIELDS.some((f) => a[f] !== b[f]);

const itemChanged = (a: DraftItem, b: DraftItem) =>
  ITEM_FIELDS.some((f) => a[f] !== b[f]);

const describe = (s: DraftSection) => s.title?.trim() || s.type;

export const planPublish = (state: DraftState): PublishOp[] => {
  const { baseline, working, deletedSections, deletedItems } = state;

  const baseSections = new Map(baseline.map((s) => [s.sectionId, s]));

  const creates: PublishOp[] = [];
  const updates: PublishOp[] = [];
  const itemCreates: PublishOp[] = [];
  const itemUpdates: PublishOp[] = [];

  for (const section of working) {
    const label = describe(section);

    if (isUnsaved(section.sectionId)) {
      creates.push({
        kind: "create-section",
        localId: section.sectionId,
        label,
        data: sectionPayload(section),
      });

      for (const item of section.items) {
        itemCreates.push({
          kind: "create-item",
          sectionRef: section.sectionId,
          localId: String(item.itemId),
          label,
          data: itemPayload(item),
        });
      }
      continue;
    }

    const before = baseSections.get(section.sectionId);
    if (before && sectionChanged(before, section)) {
      updates.push({
        kind: "update-section",
        sectionId: section.sectionId as number,
        label,
        data: sectionPayload(section),
      });
    }

    const baseItems = new Map((before?.items ?? []).map((i) => [i.itemId, i]));

    for (const item of section.items) {
      if (isUnsaved(item.itemId)) {
        itemCreates.push({
          kind: "create-item",
          sectionRef: section.sectionId,
          localId: item.itemId,
          label,
          data: itemPayload(item),
        });
        continue;
      }

      const itemBefore = baseItems.get(item.itemId);
      if (itemBefore && itemChanged(itemBefore, item)) {
        itemUpdates.push({
          kind: "update-item",
          itemId: item.itemId as number,
          label,
          data: itemPayload(item),
        });
      }
    }
  }

  // Deleting a section leaves its items orphaned but unreachable — the section
  // is what the storefront reads, and it is gone. Emitting a delete per item as
  // well would be a pile of writes that change nothing anyone can see.
  const doomedSections = new Set(deletedSections);
  const itemsInDoomedSections = new Set(
    baseline
      .filter((s) => doomedSections.has(s.sectionId as number))
      .flatMap((s) => s.items.map((i) => i.itemId))
  );

  const itemDeletes: PublishOp[] = deletedItems
    .filter((id) => !itemsInDoomedSections.has(id))
    .map((itemId) => ({ kind: "delete-item", itemId, label: `item ${itemId}` }));

  const sectionDeletes: PublishOp[] = deletedSections.map((sectionId) => ({
    kind: "delete-section",
    sectionId,
    label: describe(baseSections.get(sectionId) ?? ({ type: `section ${sectionId}` } as DraftSection)),
  }));

  return [...creates, ...updates, ...itemCreates, ...itemUpdates, ...itemDeletes, ...sectionDeletes];
};

/** One line per op, for the confirm step and the failure report. */
export const describeOp = (op: PublishOp): string => {
  switch (op.kind) {
    case "create-section": return `Add section "${op.label}"`;
    case "update-section": return `Update section "${op.label}"`;
    case "create-item": return `Add item to "${op.label}"`;
    case "update-item": return `Update item in "${op.label}"`;
    case "delete-item": return `Delete ${op.label}`;
    case "delete-section": return `Delete section "${op.label}"`;
  }
};
