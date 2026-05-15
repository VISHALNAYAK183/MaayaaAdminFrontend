import { useState } from "react";
import { shipOrder } from "../api/adminApi";

interface Props {
  orderId: number;
  onSuccess: () => void;
}

export default function ShipOrderModal({ orderId, onSuccess }: Props) {
  const [form, setForm] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    estimatedDeliveryDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    if (!form.carrier.trim()) return "Carrier is required.";
    if (!form.trackingNumber.trim()) return "Tracking number is required.";
    if (!form.estimatedDeliveryDate) return "Estimated delivery date is required.";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      await shipOrder(orderId, form);
      onSuccess();
    } catch {
      setError("Failed to ship order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        Shipping Details
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Carrier <span className="text-red-500">*</span>
        </label>
        <input
          placeholder="e.g. Delhivery, Bluedart"
          value={form.carrier}
          onChange={(e) => set("carrier", e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tracking Number <span className="text-red-500">*</span>
        </label>
        <input
          placeholder="e.g. 1234567890"
          value={form.trackingNumber}
          onChange={(e) => set("trackingNumber", e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tracking URL
        </label>
        <input
          placeholder="https://track.carrier.com/..."
          value={form.trackingUrl}
          onChange={(e) => set("trackingUrl", e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Estimated Delivery <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          min={new Date().toISOString().split("T")[0]}
          value={form.estimatedDeliveryDate}
          onChange={(e) => set("estimatedDeliveryDate", e.target.value)}
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
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? "Shipping…" : "Mark as Shipped"}
      </button>
    </div>
  );
}
