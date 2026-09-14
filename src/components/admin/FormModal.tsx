import { useReadOnly } from "../../hooks/useReadOnly";
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

  // Before the early return: a hook must run on every render, open or not.
  const readOnly = useReadOnly();

  if (!open) return null;

  return (
    <div
      className="shell-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`shell-pop shell-palette flex max-h-[90vh] w-full flex-col ${widthCls[maxWidth]}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="shell-press grid size-8 place-items-center rounded-full text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">{children}</div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors shell-press"
            >
              Cancel
            </button>
            {!readOnly && (
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shell-press"
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
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
