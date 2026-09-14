import React from "react";
import { useReadOnly } from "../../hooks/useReadOnly";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const PageHeader: React.FC<Props> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const readOnly = useReadOnly();

  return (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-[27px] font-extrabold leading-tight tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {!readOnly && actionLabel && onAction && (
      <button
        onClick={onAction}
        className="shell-press flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
      >
        <span className="text-xl leading-none">+</span>
        <span className="text-sm font-semibold">{actionLabel}</span>
      </button>
    )}
  </div>
);
};
