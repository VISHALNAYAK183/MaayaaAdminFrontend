import React from "react";

interface Props {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<Props> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center gap-3 py-16">
    {icon && (
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl">
        {icon}
      </div>
    )}
    <div>
      <p className="text-sm font-semibold text-slate-500 text-center">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 text-center">{subtitle}</p>}
    </div>
  </div>
);
