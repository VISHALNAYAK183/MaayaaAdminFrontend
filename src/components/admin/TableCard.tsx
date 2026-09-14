import React from "react";
import { SearchIcon } from "./icons";

interface Props {
  title: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  showingCount?: number;
  totalCount?: number;
  itemLabel?: string;
  searchTerm?: string;
  children: React.ReactNode;
}

export const TableCard: React.FC<Props> = ({
  title,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  showingCount,
  totalCount,
  itemLabel = "items",
  searchTerm,
  children,
}) => (
  <div className="shell-panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
      <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">{title}</h2>
      {onSearchChange && (
        <div className="relative w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 placeholder:text-gray-400"
          />
        </div>
      )}
    </div>

    <div className="overflow-x-auto">{children}</div>

    {showingCount !== undefined && totalCount !== undefined && showingCount > 0 && (
      <div className="border-t border-gray-200 px-5 py-3">
        <p className="text-xs text-gray-500">
          Showing <span className="font-semibold text-slate-600">{showingCount}</span> of{" "}
          <span className="font-semibold text-slate-600">{totalCount}</span> {itemLabel}
          {searchTerm && (
            <>
              {" "}
              matching{" "}
              <span className="font-semibold text-slate-600">"{searchTerm}"</span>
            </>
          )}
        </p>
      </div>
    )}
  </div>
);

export const TableLoadingRow: React.FC<{ colSpan: number; label?: string }> = ({
  colSpan,
  label = "Loading...",
}) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
    </td>
  </tr>
);

export const TableEmptyRow: React.FC<{
  colSpan: number;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ colSpan, icon, title, subtitle }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        {icon && (
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    </td>
  </tr>
);
