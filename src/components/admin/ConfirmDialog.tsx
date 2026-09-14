import React, { useEffect } from "react";
import { AlertIcon, PageIcon } from "../../layout/shellIcons";

interface Props {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const confirmCls =
    tone === "danger"
      ? "bg-error-600 hover:bg-error-700 text-white"
      : "bg-slate-900 hover:bg-slate-700 text-white";

  const iconCls =
    tone === "danger" ? "bg-error-50 text-error-700" : "bg-gray-100 text-gray-700";

  return (
    <div
      className="shell-scrim fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="shell-pop shell-palette w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 flex items-start gap-4">
          <div className={`grid size-11 shrink-0 place-items-center rounded-full ${iconCls}`}>
            {tone === "danger" ? <AlertIcon className="size-5" /> : <PageIcon className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-base font-semibold text-gray-900">{title}</h3>
            <div className="text-sm text-slate-600 leading-relaxed">{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors shell-press"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors shell-press ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
