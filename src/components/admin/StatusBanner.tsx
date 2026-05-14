import React, { useEffect } from "react";

export type Status = { type: "success" | "error"; msg: string } | null;

interface Props {
  status: Status;
  onClose: () => void;
  autoDismissMs?: number;
}

export const StatusBanner: React.FC<Props> = ({ status, onClose, autoDismissMs = 4000 }) => {
  useEffect(() => {
    if (!status || autoDismissMs <= 0) return;
    const t = setTimeout(onClose, autoDismissMs);
    return () => clearTimeout(t);
  }, [status, autoDismissMs, onClose]);

  if (!status) return null;

  const isSuccess = status.type === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg max-w-md animate-[slideIn_0.2s_ease-out] ${
        isSuccess
          ? "bg-green-50 text-green-800 border-green-200"
          : "bg-red-50 text-red-800 border-red-200"
      }`}
      style={{ animation: "slideInToast 0.2s ease-out" }}
    >
      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold shrink-0">
        {isSuccess ? "✓" : "✕"}
      </span>
      <span className="flex-1">{status.msg}</span>
      <button onClick={onClose} className="opacity-40 hover:opacity-70 text-lg leading-none">
        ×
      </button>
    </div>
  );
};
