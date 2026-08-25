import React from "react";
import { EditIcon, TrashIcon } from "./icons";
import { useReadOnly } from "../../hooks/useReadOnly";

interface Props {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}

export const RowActions: React.FC<Props> = ({ onEdit, onDelete, extra }) => {
  // `extra` is left alone: callers use it for read-only affordances such as
  // "view details", which a viewer still needs.
  const readOnly = useReadOnly();

  return (
  <div className="flex items-center gap-2">
    {extra}
    {!readOnly && onEdit && (
      <button
        onClick={onEdit}
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Edit"
      >
        <EditIcon />
      </button>
    )}
    {!readOnly && onDelete && (
      <button
        onClick={onDelete}
        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete"
      >
        <TrashIcon />
      </button>
    )}
  </div>
  );
};
