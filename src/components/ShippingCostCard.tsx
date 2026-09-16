import { useCallback, useEffect, useState } from "react";
import {
  getShippingCost,
  setForwardCost,
  setPickupCost,
  setRtoCost,
  type CostLeg,
  type ShippingCost,
} from "../api/shippingCostApi";
import { serverMessage } from "../api/client";
import { rupees } from "../lib/format";

/**
 * What this order cost to ship, leg by leg. Shipping is a cost of the order,
 * not the product, and it feeds the profit on the Analytics page.
 */
export default function ShippingCostCard({
  orderId,
  readOnly,
  refreshKey,
}: {
  orderId: number;
  readOnly: boolean;
  /** Changes when the order does, e.g. its status, so a new leg shows up. */
  refreshKey?: string;
}) {
  const [cost, setCost] = useState<ShippingCost | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getShippingCost(orderId)
      .then((res) => setCost(res.data))
      .catch((err) => setError(serverMessage(err, "Shipping cost could not be loaded.")));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (error) {
    return (
      <div className="shell-panel p-6 text-sm text-gray-500">
        {error}{" "}
        <button type="button" onClick={load} className="font-semibold text-brand-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }
  if (!cost) return null;

  const nothingYet = !cost.shipped && !cost.rto && cost.pickups.length === 0;

  return (
    <div className="shell-panel p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">Shipping cost</h2>
        {!nothingYet && <span className="text-sm font-bold text-gray-900 shell-num">{rupees(cost.total)}</span>}
      </div>

      {nothingYet ? (
        <p className="text-sm text-gray-400">Recorded once the order ships.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {cost.forward && (
            <LegRow
              label="To the customer"
              hint={
                cost.route === "SHIPROCKET"
                  ? "As Shiprocket quoted it at booking. Correct it to the invoice if it differs."
                  : "Enter what this delivery cost."
              }
              leg={cost.forward}
              readOnly={readOnly}
              onSave={(amount) => setForwardCost(orderId, amount).then((r) => setCost(r.data))}
            />
          )}
          {cost.rto && (
            <LegRow
              label="Back to us (RTO)"
              hint={
                cost.rto.source === "ESTIMATE"
                  ? "Estimated as the forward charge. Enter the real figure from the Shiprocket invoice."
                  : "Clear it to go back to the estimate."
              }
              leg={cost.rto}
              readOnly={readOnly}
              onSave={(amount) => setRtoCost(orderId, amount).then((r) => setCost(r.data))}
            />
          )}
          {cost.pickups.map((p) => (
            <LegRow
              key={p.reversePickupId}
              label={`Collection for ${p.kind === "EXCHANGE" ? "an exchange" : "a return"}`}
              hint={p.source === "NOT_ENTERED" ? "Not recorded when it was booked. Enter it from the invoice." : undefined}
              leg={p}
              readOnly={readOnly}
              onSave={(amount) => setPickupCost(orderId, p.reversePickupId, amount).then((r) => setCost(r.data))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LegRow({
  label,
  hint,
  leg,
  readOnly,
  onSave,
}: {
  label: string;
  hint?: string;
  leg: CostLeg;
  readOnly: boolean;
  onSave: (amount: number | null) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDraft(leg.source === "RECORDED" ? String(leg.amount) : "");
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const trimmed = draft.trim();
    const amount = trimmed === "" ? null : Number(trimmed);
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
      setError("Enter an amount of 0 or more, or leave it empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(amount);
      setEditing(false);
    } catch (err) {
      setError(serverMessage(err, "The cost could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-gray-700">{label}</p>
        {!editing && (
          <div className="flex items-baseline gap-2">
            {leg.source === "NOT_ENTERED" ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Not entered</span>
            ) : (
              <span className="text-sm font-semibold text-gray-900 shell-num">
                {rupees(leg.amount)}
                {leg.source === "ESTIMATE" && <span className="ml-1 text-[11px] font-normal text-gray-500">est.</span>}
              </span>
            )}
            {!readOnly && (
              <button type="button" onClick={start} className="text-xs font-semibold text-brand-600 hover:underline">
                Edit
              </button>
            )}
          </div>
        )}
      </div>
      {hint && !editing && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
      {editing && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">₹</span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label={`${label} cost`}
            className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50 shell-press"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
