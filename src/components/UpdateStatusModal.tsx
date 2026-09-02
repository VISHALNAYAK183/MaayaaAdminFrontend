import { useState } from "react";
import { updateOrderStatus } from "../api/adminApi";

interface Props {
  orderId: number;
  currentStatus: string;
  /** Carries the order's new state, so the caller can update its row at once. */
  onSuccess: (updated?: { orderId: number; status: string }) => void;
}

const NEXT: Record<string, string[]> = {
  PLACED:           ["SHIPPED"],
  SHIPPED:          ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

const STATUS_LABEL: Record<string, string> = {
  SHIPPED:          "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED:        "Delivered",
};

export default function UpdateStatusModal({ orderId, currentStatus, onSuccess }: Props) {
  const allowedNext = NEXT[currentStatus] ?? [];
  const [status, setStatus] = useState(allowedNext[0] ?? "");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!allowedNext.length) return null;

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await updateOrderStatus(orderId, {
        status,
        description: STATUS_LABEL[status] ?? status,
        location: location.trim() || undefined,
      });
      onSuccess(res.data);
    } catch {
      setError("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        Update Status
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          New Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          {allowedNext.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Location <span className="text-gray-400">(optional)</span>
        </label>
        <input
          placeholder="e.g. Mumbai Hub, Delhi Warehouse"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? "Updating…" : `Mark as ${STATUS_LABEL[status] ?? status}`}
      </button>
    </div>
  );
}
