import React from "react";

interface Props {
  icon: string;
  title: string;
  desc?: string;
}

export const SectionHeader: React.FC<Props> = ({ icon, title, desc }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-lg bg-slate-50 border border-slate-200 rounded-xl">
      {icon}
    </div>
    <div>
      <div className="text-sm font-bold text-slate-800">{title}</div>
      {desc && <div className="text-xs text-slate-400 mt-0.5">{desc}</div>}
    </div>
  </div>
);
