import React from "react";
import { EditIcon, TrashIcon } from "./icons";

interface Props {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}

export const RowActions: React.FC<Props> = ({ onEdit, onDelete, extra }) => (
  <div className="flex items-center gap-2">
    {extra}
    {onEdit && (
      <button
        onClick={onEdit}
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Edit"
      >
        <EditIcon />
      </button>
    )}
    {onDelete && (
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
