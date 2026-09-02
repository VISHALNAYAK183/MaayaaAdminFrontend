import { useState } from "react";
import { addShipmentEvent } from "../api/adminApi";

interface Props {
  orderId: number;
  onSuccess: () => void;
}

type Kind = "IN_TRANSIT" | "DELAYED" | "DELIVERY_ATTEMPTED";

const KINDS: { value: Kind; label: string; placeholder: string }[] = [
  { value: "IN_TRANSIT",         label: "In transit",         placeholder: "Reached Hyderabad hub" },
  { value: "DELAYED",            label: "Delayed",            placeholder: "Held up by heavy rain, moving tomorrow" },
  { value: "DELIVERY_ATTEMPTED", label: "Delivery attempted", placeholder: "Nobody home, we'll try again tomorrow" },
];

export default function TrackingUpdateModal({ orderId, onSuccess }: Props) {
  const [kind, setKind] = useState<Kind>("IN_TRANSIT");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const current = KINDS.find((k) => k.value === kind)!;

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await addShipmentEvent(orderId, {
        kind,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
      });
      setDescription("");
      setLocation("");
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Could not add the update. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Adds a line to the customer's tracking timeline. The order stays where it is.
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Update
        </label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          What to tell them <span className="text-gray-400">(optional)</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={current.placeholder}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Location <span className="text-gray-400">(optional)</span>
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Hyderabad hub"
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
        {loading ? "Adding…" : "Add tracking update"}
      </button>
    </div>
  );
}
