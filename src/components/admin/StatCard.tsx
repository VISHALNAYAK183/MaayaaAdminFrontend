import React from "react";

interface Props {
  label: string;
  value: React.ReactNode;
}

export const StatCard: React.FC<Props> = ({ label, value }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
      {label}
    </p>
    <div className="text-2xl font-extrabold text-slate-900">{value}</div>
  </div>
);
