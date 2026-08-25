import React from "react";
import { useReadOnly } from "../../hooks/useReadOnly";

interface Props {
  breadcrumbs?: string[];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const PageHeader: React.FC<Props> = ({
  breadcrumbs,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const readOnly = useReadOnly();

  return (
  <div className="flex items-start justify-between mb-6">
    <div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          {breadcrumbs.slice(0, -1).map((c) => (
            <React.Fragment key={c}>
              <span className="text-xs text-slate-400">{c}</span>
              <span className="text-xs text-slate-300">›</span>
            </React.Fragment>
          ))}
          <span className="text-xs text-slate-600 font-semibold">
            {breadcrumbs[breadcrumbs.length - 1]}
          </span>
        </div>
      )}
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {!readOnly && actionLabel && onAction && (
      <button
        onClick={onAction}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        <span className="text-xl leading-none">+</span>
        <span className="text-sm font-semibold">{actionLabel}</span>
      </button>
    )}
  </div>
);
};
