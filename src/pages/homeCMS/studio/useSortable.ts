import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

/**
 * One sortable row.
 *
 * Reordering happens on hover rather than on drop, so the list rearranges under
 * the cursor and the preview keeps up with it — the whole point of the studio is
 * seeing the result, and a list that only settles after you let go makes you
 * drop first and look second.
 *
 * The drag starts from a handle, not the row: the row is also a click target for
 * selecting a section, and a row that is both would make every click a
 * near-miss drag.
 */

interface Options {
  /** Distinct per list — items must not be dragged between sections. */
  type: string;
  index: number;
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}

interface DragItem {
  index: number;
}

export const useSortable = ({ type, index, onMove, disabled }: Options) => {
  const rowRef = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag] = useDrag({
    type,
    item: () => ({ index }),
    canDrag: !disabled,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: type,
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    hover: (dragged, monitor) => {
      const node = rowRef.current;
      if (!node || dragged.index === index) return;

      const box = node.getBoundingClientRect();
      const middle = (box.bottom - box.top) / 2;
      const pointer = monitor.getClientOffset();
      if (!pointer) return;
      const offset = pointer.y - box.top;

      // Only swap once the cursor is past the midpoint of the row it is over.
      // Without this the list flickers back and forth while the cursor sits on
      // the boundary between two rows.
      if (dragged.index < index && offset < middle) return;
      if (dragged.index > index && offset > middle) return;

      onMove(dragged.index, index);

      // The dragged item now lives at the new index; telling the monitor keeps
      // the next hover comparison honest.
      dragged.index = index;
    },
  });

  return {
    isDragging,
    isOver,
    /** Put on the row: it is the drop target and the geometry we measure. */
    rowRef: (node: HTMLDivElement | null) => {
      rowRef.current = node;
      drop(node);
    },
    /** Put on the grip. */
    handleRef: (node: HTMLButtonElement | null) => {
      drag(node);
    },
  };
};

/** Pure list move, used to build the new id order handed to the draft. */
export const moved = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
};
