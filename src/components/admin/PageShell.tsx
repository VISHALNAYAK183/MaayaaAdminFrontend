import React from "react";

export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="font-sans">{children}</div>
);
