import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getUnmatchedPaymentReview,
  refundUnmatchedPayment,
  resolveUnmatchedPayment,
  type UnmatchedPaymentReview,
} from "../api/unmatchedPaymentsApi";
import { serverMessage } from "../api/client";
import { useReadOnly } from "../hooks/useReadOnly";

const inr = (n: number | null | undefined) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

/** "12:1,40:2" from the checkout notes, as readable lines. */
const itemsFrom = (notes: string | null): string | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as Record<string, string>;
    const parts = [
      parsed.items ? `Items (variant × qty): ${parsed.items.split(",").map((p) => p.replace(":", " × ")).join(", ")}` : null,
      parsed.couponCode ? `Coupon: ${parsed.couponCode}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  } catch {
    return notes;
  }
};

/**
 * One captured payment with no order: what Razorpay still holds, and the two
 * ways to settle it. Either one lets the customer check out again.
 */
export default function UnmatchedPaymentPanel({
  attemptId,
  onClose,
  onDone,
}: {
  attemptId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const readOnly = useReadOnly();
  const [review, setReview] = useState<UnmatchedPaymentReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    setError(null);
    getUnmatchedPaymentReview(attemptId)
      .then((res) => setReview(res.data))
      .catch((err) => setError(serverMessage(err, "The payment could not be loaded.")));
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
      onClose();
    } catch (err) {
      setError(serverMessage(err, failure));
      load();
    } finally {
      setBusy(false);
    }
  };

  const p = review?.payment;
  const items = itemsFrom(p?.notes ?? null);

  return (
    <div className="fixed inset-0 z-99999 flex justify-end" role="dialog" aria-modal="true" aria-label="Payment with no order">
      <div className="absolute inset-0 bg-black/40" onClick={() => !busy && onClose()} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">Payment with no order</h2>
            {p && (
              <p className="mt-0.5 text-xs text-gray-500">
                {p.razorpayPaymentId} · captured {when(p.capturedAt)}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
            Close
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {!review && !error && <p className="text-sm text-gray-400">Loading…</p>}

          {review && p && (
            <>
              <section>
                <h3 className="mb-2 shell-label">Customer</h3>
                <p className="text-sm text-gray-900">{p.customer ?? "Not known — the payment carried no customer"}</p>
                {(p.email || p.phone) && (
                  <p className="text-xs text-gray-500">{[p.email, p.phone].filter(Boolean).join(" · ")}</p>
                )}
                {items && <p className="mt-2 text-xs text-gray-600">{items}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  They cannot pay for anything else on the site until this is settled.
                </p>
              </section>

              {p.matchedOrderId != null && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This payment is now on{" "}
                  <Link to={`/orders/${p.matchedOrderId}`} className="font-semibold underline">
                    order #{p.matchedOrderId}
                  </Link>
                  . The order went through a moment after the payment was recorded — mark it resolved.
                </div>
              )}

              <section>
                <h3 className="mb-2 shell-label">Razorpay says</h3>
                {review.razorpayKnown ? (
                  <dl className="text-sm">
                    {[
                      ["Captured", inr(review.razorpayCaptured)],
                      ["Already refunded", inr(review.razorpayRefunded)],
                      ["Would be refunded now", inr(review.refundable)],
                    ].map(([label, value], i) => (
                      <div key={label} className={`flex justify-between py-1 ${i === 2 ? "border-t border-gray-100 font-semibold text-gray-900" : "text-gray-700"}`}>
                        <dt>{label}</dt>
                        <dd className="shell-num">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-amber-700">
                    Could not reach Razorpay{review.razorpayNote ? ` (${review.razorpayNote})` : ""}. Refunding is blocked until it answers.
                  </p>
                )}
              </section>

              {!readOnly && (
                <section className="space-y-3 border-t border-gray-100 pt-4">
                  {resolving ? (
                    <div className="space-y-2">
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="How was it settled? e.g. Order #123 created by hand"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !note.trim()}
                          onClick={() => run(() => resolveUnmatchedPayment(attemptId, note.trim()), "It could not be marked resolved.")}
                          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 shell-press"
                        >
                          {busy ? "Saving…" : "Mark resolved"}
                        </button>
                        <button type="button" onClick={() => setResolving(false)} className="px-3 text-sm text-gray-500 hover:text-gray-700">
                          Back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {p.matchedOrderId == null && review.razorpayKnown && review.refundable > 0 && (
                        <label className="flex items-start gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
                          I have checked there is no order for this, and {inr(review.refundable)} should go back.
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {p.matchedOrderId == null && (
                          <button
                            type="button"
                            disabled={busy || !confirmed || !review.razorpayKnown || review.refundable <= 0}
                            onClick={() => run(() => refundUnmatchedPayment(attemptId), "The refund could not be sent.")}
                            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 shell-press"
                          >
                            {busy ? "Refunding…" : `Approve and refund ${inr(review.refundable)}`}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setResolving(true)}
                          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shell-press"
                        >
                          Settled another way
                        </button>
                      </div>
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
