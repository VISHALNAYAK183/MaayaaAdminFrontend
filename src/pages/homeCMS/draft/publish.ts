import {
  addHomeSection,
  addSectionItem,
  deleteHomeSection,
  deleteSectionItem,
  updateHomeSection,
  updateSectionItem,
} from "../../../api/homeCms";
import { describeOp, type PublishOp } from "./diff";
import { isUnsaved } from "./types";

/**
 * Runs a publish plan against the API.
 *
 * Sequentially and stopping at the first failure, which is deliberate: the two
 * backends have no endpoint that writes a whole layout at once, so the closest
 * thing to atomicity available here is to stop digging. What did land is
 * reported back (`sectionIds` / `itemIds`) so the draft can re-anchor on it and
 * a retry finishes the job instead of duplicating the front half of it.
 */

export interface PublishResult {
  applied: number;
  total: number;
  /** Local id → database id, for rows this run created. */
  sectionIds: Map<string, number>;
  itemIds: Map<string, number>;
  failure?: { op: PublishOp; message: string };
}

const messageOf = (error: unknown): string => {
  const axiosLike = error as { response?: { data?: { message?: string } }; message?: string };
  return (
    axiosLike?.response?.data?.message ||
    axiosLike?.message ||
    "Unknown error"
  );
};

export const runPublish = async (
  ops: PublishOp[],
  onProgress?: (done: number, total: number) => void
): Promise<PublishResult> => {
  const sectionIds = new Map<string, number>();
  const itemIds = new Map<string, number>();

  let applied = 0;

  for (const op of ops) {
    try {
      switch (op.kind) {
        case "create-section": {
          const res = await addHomeSection(op.data);
          sectionIds.set(op.localId, res.data.sectionId);
          break;
        }

        case "update-section":
          await updateHomeSection(op.sectionId, op.data);
          break;

        case "create-item": {
          // A section created earlier in this same run: its real id only exists
          // in the map above.
          const sectionId = isUnsaved(op.sectionRef)
            ? sectionIds.get(op.sectionRef)
            : (op.sectionRef as number);

          if (sectionId == null) {
            throw new Error("its section was not created");
          }

          const res = await addSectionItem(sectionId, op.data);
          itemIds.set(op.localId, res.data.itemId);
          break;
        }

        case "update-item":
          await updateSectionItem(op.itemId, op.data);
          break;

        case "delete-item":
          await deleteSectionItem(op.itemId);
          break;

        case "delete-section":
          await deleteHomeSection(op.sectionId);
          break;
      }

      applied += 1;
      onProgress?.(applied, ops.length);
    } catch (error) {
      return {
        applied,
        total: ops.length,
        sectionIds,
        itemIds,
        failure: { op, message: `${describeOp(op)} failed: ${messageOf(error)}` },
      };
    }
  }

  return { applied, total: ops.length, sectionIds, itemIds };
};
