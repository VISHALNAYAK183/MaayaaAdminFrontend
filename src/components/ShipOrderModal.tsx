import { useCallback, useEffect, useState } from "react";
import { getShipOptions, shipOrder } from "../api/adminApi";
import type { DeliveryRoute, ShipOptions } from "../types/order";

interface Props {
  orderId: number;
  /** Carries the order's new state, so the caller can update its row at once. */
  onSuccess: (updated?: { orderId: number; status: string }) => void;
}

const inputClass =
  "w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg " +
  "bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none " +
  "focus:ring-2 focus:ring-blue-500 transition-colors";

const labelClass =
  "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";

/** "Fri, 5 Sep" — every address this ships to is Indian. */
const formatDate = (value: string | null) => {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

/**
 * What the server actually said went wrong.
 *
 * Every failure here used to read "Failed to ship order. Please try again." —
 * which covers a stale order, a missing address and a route that is not
 * switched on yet, and tells whoever is packing which of them it is: none.
 */
const messageFrom = (err: unknown, fallback: string) => {
  const body = (err as { response?: { data?: { message?: string } } })?.response?.data;
  if (body?.message) return body.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

export default function ShipOrderModal({ orderId, onSuccess }: Props) {
  const [options, setOptions] = useState<ShipOptions | null>(null);
  const [route, setRoute] = useState<DeliveryRoute | null>(null);
  const [form, setForm] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    estimatedDeliveryDate: "",
  });
  const [courierId, setCourierId] = useState<number | null>(null);
  // What is going on the label. Pre-filled from the catalogue where there is
  // something to pre-fill, corrected from the scale either way.
  const [parcel, setParcel] = useState({
    weightKg: "",
    lengthCm: "",
    breadthCm: "",
    heightCm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Which way this one would go, asked before anything is drawn. Until it
  // answers there is no honest form to show: demanding a tracking number for a
  // parcel somebody is about to drive across Udupi is the bug this fixes.
  useEffect(() => {
    let cancelled = false;

    getShipOptions(orderId)
      .then((res) => {
        if (cancelled) return;
        setOptions(res.data);
        setRoute(res.data.suggestedRoute);
        setCourierId(res.data.suggestedCourierId ?? null);

        const guess = res.data.estimatedParcel;
        if (guess) {
          const box = (value: number | null) =>
            value != null && value > 0 ? String(value) : "";
          setParcel({
            weightKg: box(guess.weightKg),
            lengthCm: box(guess.lengthCm),
            breadthCm: box(guess.breadthCm),
            heightCm: box(guess.heightCm),
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(messageFrom(err, "Could not work out how this order should ship."));
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = useCallback(async () => {
    if (!route) return;

    if (route === "SHIPROCKET") {
      if (!(Number(parcel.weightKg) > 0)) {
        setError("Weigh the parcel and enter its weight.");
        return;
      }
      if (!(Number(parcel.lengthCm) > 0)
        || !(Number(parcel.breadthCm) > 0)
        || !(Number(parcel.heightCm) > 0)) {
        setError("Enter the parcel's length, breadth and height.");
        return;
      }
    }

    if (route === "MANUAL") {
      if (!form.carrier.trim()) { setError("Carrier is required."); return; }
      if (!form.trackingNumber.trim()) { setError("Tracking number is required."); return; }
      if (!form.estimatedDeliveryDate) { setError("Estimated delivery date is required."); return; }
    }

    setLoading(true);
    setError("");
    try {
      const res = await shipOrder(
        orderId,
        route === "MANUAL"
          ? { route, ...form }
          : route === "SHIPROCKET"
          ? {
              route,
              courierId: courierId ?? undefined,
              weightKg: Number(parcel.weightKg),
              lengthCm: Number(parcel.lengthCm),
              breadthCm: Number(parcel.breadthCm),
              heightCm: Number(parcel.heightCm),
            }
          : { route }
      );
      onSuccess(res.data);
    } catch (err) {
      setError(messageFrom(err, "Failed to ship order. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [route, form, courierId, parcel, orderId, onSuccess]);

  const errorBox = error && (
    <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
      {error}
    </p>
  );

  if (!options) {
    return (
      <div className="space-y-3">
        {errorBox || (
          <p className="text-sm text-gray-500 dark:text-gray-400">Checking the address…</p>
        )}
      </div>
    );
  }

  const destination = [options.city, options.pinCode].filter(Boolean).join(" ");
  const suggestedLocal = options.suggestedRoute === "LOCAL";
  const unmeasured = options.unmeasuredProducts ?? [];
  // Only a courier list can block a booking now. A product with nothing stored
  // against it just means an empty box to type into, not a stopped parcel.
  const courierBlocked = !options.couriers || options.couriers.length === 0;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {route === "LOCAL" ? "Self Delivery" : "Shipping Details"}
      </p>

      {route === "LOCAL" ? (
        <>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 space-y-1">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              We&rsquo;re delivering this one
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              {destination || "Local zone"} is in the local zone, so it goes out as{" "}
              {options.localCarrier} — no courier, no label, no tracking number.
            </p>
            {formatDate(options.localEta) && (
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                The customer will be told it arrives {formatDate(options.localEta)}.
              </p>
            )}
          </div>

          {errorBox}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "Shipping…" : "Ship — self delivery"}
          </button>

          <button
            type="button"
            onClick={() => { setRoute("MANUAL"); setError(""); }}
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2"
          >
            Send this one by courier instead
          </button>
        </>
      ) : route === "SHIPROCKET" ? (
        <>
          {destination && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Going to {destination}
              {options.cod ? " · cash on delivery" : ""}
            </p>
          )}

          <div>
            <label className={labelClass}>
              Weigh the parcel (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={parcel.weightKg}
              onChange={(e) => { setError(""); setParcel((p) => ({ ...p, weightKg: e.target.value })); }}
              placeholder="0.350"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {options.estimatedParcel?.fromCatalogue
                ? "Pre-filled from the products. Correct it from the scale — the courier reweighs and bills the difference."
                : "Weigh it bagged and tagged. The courier reweighs at their hub and bills the difference."}
            </p>
          </div>

          <div>
            <label className={labelClass}>
              Box size in cm <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {([
                ["lengthCm", "L", "Length in cm"],
                ["breadthCm", "B", "Breadth in cm"],
                ["heightCm", "H", "Height in cm"],
              ] as const).map(([key, mark, label]) => (
                <div key={key} className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={parcel[key]}
                    onChange={(e) => { setError(""); setParcel((p) => ({ ...p, [key]: e.target.value })); }}
                    placeholder={mark}
                    aria-label={label}
                    className={inputClass}
                  />
                  {key !== "heightCm" && (
                    <span className="text-xs text-gray-400 shrink-0">×</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {unmeasured.length > 0 && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Nothing saved against {unmeasured.join(", ")}, so there was nothing to pre-fill.
            </p>
          )}

          {options.courierLookupFailed ? (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {options.courierLookupFailed}
              </p>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Courier</label>
              <select
                value={courierId == null ? "" : String(courierId)}
                onChange={(e) => {
                  setError("");
                  setCourierId(e.target.value === "" ? null : Number(e.target.value));
                }}
                className={inputClass}
              >
                {(options.couriers ?? []).map((c) => (
                  <option key={c.courierId} value={c.courierId}>
                    {c.courierName}
                    {c.rate == null ? "" : ` — ₹${c.rate}`}
                    {c.estimatedDays == null ? "" : `, ${c.estimatedDays} days`}
                    {c.courierId === options.suggestedCourierId ? " (cheapest)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Cheapest that will carry this parcel is picked for you.
                {options.cod ? " Only couriers that collect cash are listed." : ""}
              </p>
            </div>
          )}

          {errorBox}

          <button
            onClick={submit}
            disabled={loading || courierBlocked}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "Booking…" : "Ship — book courier"}
          </button>

          <button
            type="button"
            onClick={() => { setRoute("MANUAL"); setError(""); }}
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2"
          >
            Enter a tracking number by hand instead
          </button>
        </>
      ) : (
        <>
          {destination && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Going to {destination}
              {suggestedLocal ? " — inside the local zone." : "."}
            </p>
          )}

          <div>
            <label className={labelClass}>
              Carrier <span className="text-red-500">*</span>
            </label>
            <input
              placeholder="e.g. Delhivery, Bluedart"
              value={form.carrier}
              onChange={(e) => set("carrier", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Tracking Number <span className="text-red-500">*</span>
            </label>
            <input
              placeholder="e.g. 1234567890"
              value={form.trackingNumber}
              onChange={(e) => set("trackingNumber", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Tracking URL</label>
            <input
              placeholder="https://track.carrier.com/..."
              value={form.trackingUrl}
              onChange={(e) => set("trackingUrl", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Estimated Delivery <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={form.estimatedDeliveryDate}
              onChange={(e) => set("estimatedDeliveryDate", e.target.value)}
              className={inputClass}
            />
          </div>

          {errorBox}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "Shipping…" : "Mark as Shipped"}
          </button>

          {suggestedLocal && (
            <button
              type="button"
              onClick={() => { setRoute("LOCAL"); setError(""); }}
              className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2"
            >
              Deliver it ourselves after all
            </button>
          )}
        </>
      )}
    </div>
  );
}
