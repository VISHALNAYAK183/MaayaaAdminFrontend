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
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
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
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300 transition-all"
          />
        </div>
      )}
    </div>

    <div className="overflow-x-auto">{children}</div>

    {showingCount !== undefined && totalCount !== undefined && showingCount > 0 && (
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-slate-400">
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
