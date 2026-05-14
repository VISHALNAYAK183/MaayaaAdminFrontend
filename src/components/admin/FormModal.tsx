import React, { useEffect } from "react";
import { SpinnerIcon, CheckIcon } from "./icons";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  submitLabel: string;
  submittingLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  children: React.ReactNode;
}

const widthCls: Record<NonNullable<Props["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
};

export const FormModal: React.FC<Props> = ({
  open,
  title,
  onClose,
  onSubmit,
  loading = false,
  submitLabel,
  submittingLabel,
  maxWidth = "lg",
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${widthCls[maxWidth]} flex flex-col max-h-[90vh]`}
      >
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">{children}</div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-white rounded-b-2xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all"
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  {submittingLabel ?? "Saving..."}
                </>
              ) : (
                <>
                  <CheckIcon />
                  {submitLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
