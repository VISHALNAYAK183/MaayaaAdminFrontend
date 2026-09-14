import React from "react";

interface Props {
  label: string;
  value: React.ReactNode;
}

export const StatCard: React.FC<Props> = ({ label, value }) => (
  <div className="shell-panel px-5 py-4">
    <p className="mb-1 shell-label">
      {label}
    </p>
    <div className="shell-num text-[27px] font-semibold leading-tight tracking-tight text-gray-900">{value}</div>
  </div>
);
