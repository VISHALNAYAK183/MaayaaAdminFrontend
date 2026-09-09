import { useState } from "react";
import { cancelOrder } from "../api/adminApi";

interface Props {
  orderId: number;
  /** Shown in the warning, so the operator knows what cancelling costs. */
  currentStatus: string;
  onSuccess: () => void;
}

const PRESETS = [
  "Customer asked to cancel",
  "Wrong size ordered",
  "Item damaged before dispatch",
  "Could not be delivered — returned to us",
  "Out of stock after all",
];

export default function CancelOrderModal({ orderId, currentStatus, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Set when the order is cancelled but the parcel is still booked. The dialog
  // stays open on it: a rider is still coming, and a toast that scrolls away
  // is the same as not saying so at all.
  const [courierWarning, setCourierWarning] = useState<string | null>(null);

  const dispatched = ["SHIPPED", "OUT_FOR_DELIVERY"].includes(currentStatus);

  const submit = async () => {
    const text = reason.trim();
    if (!text) {
      setError("Give a reason — the customer reads it on their order page.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await cancelOrder(orderId, text);

      if (res.data?.courierWarning) {
        setCourierWarning(res.data.courierWarning);
        return;
      }

      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Could not cancel this order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (courierWarning) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-3 space-y-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Order cancelled — but the parcel is still booked
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300">{courierWarning}</p>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          The customer has been refunded and the stock is back. This is the only
          part left, and nothing else will do it for you.
        </p>
        <button
          onClick={onSuccess}
          className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg transition-colors"
        >
          I&rsquo;ll cancel it in Shiprocket
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
        The stock goes back, the coupon is released, and a prepaid order is refunded in full.
        {dispatched && " This parcel has already left — the courier booking is cancelled too where we can, and you are told if we could not."}
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="The customer sees this on their order timeline"
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setReason(p)}
            className="text-[11px] px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? "Cancelling…" : "Cancel this order"}
      </button>
    </div>
  );
}
