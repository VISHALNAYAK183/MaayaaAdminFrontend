import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  approveCancellationRefund,
  declineCancellationRefund,
  getCancellationReview,
  getReturnReview,
  type RefundReview,
} from "../api/refundReviewApi";
import { approveRefund } from "../api/returnsApi";
import { serverMessage } from "../api/client";
import { useReadOnly } from "../hooks/useReadOnly";

/** Paise matter when comparing money, so this page shows them. */
const inr = (n: number | null | undefined) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ITEM_STATUS: Record<string, string> = {
  KEPT: "Kept",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  RETURNED_REFUNDED: "Returned, refunded",
};

const METHOD: Record<string, string> = {
  RAZORPAY: "Card / UPI",
  STORE_CREDIT: "Store credit",
  BANK: "Bank transfer",
  "BANK+CREDIT": "Bank + credit",
  "RAZORPAY+CREDIT": "Card + credit",
  COD: "Cash on delivery",
  CASH_ON_DELIVERY: "Cash on delivery",
};

type Target = { kind: "CANCELLATION"; orderId: number } | { kind: "RETURN"; returnId: number };

/**
 * Everything to compare before a refund is approved: what was bought, how the
 * order was priced and paid, what has gone back already, where this refund goes,
 * and the checks. Approve stays disabled while any check that blocks fails; the
 * server runs the same checks again.
 */
export default function RefundReviewPanel({
  target,
  onClose,
  onDone,
}: {
  target: Target;
  onClose: () => void;
  /** Called after an approval or decline, to reload the list behind the panel. */
  onDone: () => void;
}) {
  const readOnly = useReadOnly();
  const [review, setReview] = useState<RefundReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // By value, so a parent re-render handing over a new object does not reload.
  const kind = target.kind;
  const id = target.kind === "CANCELLATION" ? target.orderId : target.returnId;

  const load = useCallback(() => {
    setError(null);
    const request = kind === "CANCELLATION" ? getCancellationReview(id) : getReturnReview(id);
    request.then((res) => setReview(res.data)).catch((err) => setError(serverMessage(err, "The refund could not be loaded.")));
  }, [kind, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const approve = async () => {
    if (!review) return;
    setBusy(true);
    setError(null);
    try {
      if (review.kind === "CANCELLATION") await approveCancellationRefund(review.orderId);
      else await approveRefund(review.returnId as number);
      onDone();
      onClose();
    } catch (err) {
      setError(serverMessage(err, "The refund could not be approved."));
      load();
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!review || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await declineCancellationRefund(review.orderId, reason.trim());
      onDone();
      onClose();
    } catch (err) {
      setError(serverMessage(err, "The refund could not be declined."));
    } finally {
      setBusy(false);
    }
  };

  const failing = review?.checks.filter((c) => !c.ok) ?? [];

  return (
    <div className="fixed inset-0 z-99999 flex justify-end" role="dialog" aria-modal="true" aria-label="Review refund">
      <div className="absolute inset-0 bg-black/40" onClick={() => !busy && onClose()} />
      <div className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">
              Review refund
              {review && (
                <>
                  {" · "}
                  <Link to={`/orders/${review.orderId}`} className="text-brand-600 hover:underline">
                    Order #{review.orderId}
                  </Link>
                </>
              )}
            </h2>
            {review && (
              <p className="mt-0.5 text-xs text-gray-500">
                {review.kind === "CANCELLATION" ? "Cancellation" : `Return #${review.returnId}`} ·{" "}
                {review.customer ?? "Unknown customer"}
                {review.phone ? ` · ${review.phone}` : ""} · ordered {day(review.orderDate)}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-full px-2 text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Close">
            ×
          </button>
        </div>

        {error && <p className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6">{error}</p>}

        {!review ? (
          !error && <p className="px-6 py-16 text-center text-sm text-gray-400">Loading the figures…</p>
        ) : (
          <div className="space-y-6 px-5 py-5 sm:px-6">
            <Section title="1. What was bought">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="whitespace-nowrap text-left shell-label">
                      <th className="py-2 pr-3 font-medium">Item</th>
                      <th className="py-2 pr-3 text-right font-medium" title="Today's MRP">MRP (current)</th>
                      <th className="py-2 pr-3 text-right font-medium">Sold at</th>
                      <th className="py-2 pr-3 text-right font-medium">Qty</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {review.items.map((it) => (
                      <tr key={it.orderItemId} className={it.beingRefunded ? "bg-amber-50" : undefined}>
                        <td className="py-2 pr-3 text-gray-900">
                          {it.product ?? "Item"}
                          <span className="block text-xs text-gray-500">{[it.size, it.colour].filter(Boolean).join(" · ") || "—"}</span>
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-right text-gray-500 shell-num">{inr(it.mrp)}</td>
                        <td className="whitespace-nowrap py-2 pr-3 text-right text-gray-900 shell-num">{inr(it.sellingPrice)}</td>
                        <td className="py-2 pr-3 text-right shell-num">{it.quantity}</td>
                        <td className="whitespace-nowrap py-2 text-xs text-gray-600">
                          {ITEM_STATUS[it.status] ?? it.status}
                          {it.beingRefunded && <span className="ml-1 font-semibold text-amber-700">· this refund</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="2. How the order was priced">
              <Rows
                rows={[
                  ["Items at selling price", inr(review.pricing.itemsTotal)],
                  [review.pricing.couponCode ? `Coupon ${review.pricing.couponCode}` : "Coupon", review.pricing.couponDiscount > 0 ? `− ${inr(review.pricing.couponDiscount)}` : "none"],
                  ["COD fee", review.pricing.codFee > 0 ? inr(review.pricing.codFee) : "none"],
                  ["Order total at checkout", inr(review.pricing.paidAtCheckout), true],
                  ...(Math.abs(review.pricing.orderTotalNow - review.pricing.paidAtCheckout) > 0.009
                    ? ([["Order total now, after cancelled items", inr(review.pricing.orderTotalNow)]] as Row[])
                    : []),
                ]}
              />
            </Section>

            <Section title="3. How it was paid">
              <Rows
                rows={[
                  ["Method", METHOD[review.paid.method ?? ""] ?? review.paid.method ?? "—"],
                  ...(review.paid.byCard > 0 ? ([["Card / UPI", inr(review.paid.byCard)]] as Row[]) : []),
                  ...(review.paid.byCredit > 0 ? ([["Store credit", inr(review.paid.byCredit)]] as Row[]) : []),
                  ...(review.paid.inCash > 0 ? ([["Cash at the door", inr(review.paid.inCash)]] as Row[]) : []),
                  ["Total paid", inr(review.paid.total), true],
                ]}
              />
              {review.paid.razorpayPaymentId && (
                <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${review.paid.razorpayKnown ? "bg-gray-50 text-gray-600" : "bg-amber-50 text-amber-800"}`}>
                  {review.paid.razorpayKnown
                    ? `Razorpay (${review.paid.razorpayPaymentId}) says: captured ${inr(review.paid.razorpayCaptured)}, already refunded ${inr(review.paid.razorpayRefunded)}.`
                    : `Could not ask Razorpay about ${review.paid.razorpayPaymentId}${review.paid.razorpayNote ? ` (${review.paid.razorpayNote})` : ""}. Check it in the Razorpay dashboard.`}
                </p>
              )}
            </Section>

            <Section title="4. Refunds so far">
              {review.refundsSoFar.length === 0 ? (
                <p className="text-sm text-gray-500">None.</p>
              ) : (
                <ul className="divide-y divide-gray-100 text-sm">
                  {review.refundsSoFar.map((r) => (
                    <li key={r.refundId} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                      <span className="text-gray-700">
                        {day(r.at)} · {METHOD[r.method ?? ""] ?? r.method ?? "—"}
                        {r.returnId ? ` · return #${r.returnId}` : ""}
                        <span className="ml-2 text-xs text-gray-500">{(r.status ?? "").toLowerCase()}</span>
                      </span>
                      <span className="shell-num">{inr(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="5. This refund">
              <Rows
                rows={[
                  ...(review.thisRefund.toCredit > 0 ? ([["Back to store credit", inr(review.thisRefund.toCredit)]] as Row[]) : []),
                  ...(review.thisRefund.toCard > 0 ? ([["Back to card / UPI", inr(review.thisRefund.toCard)]] as Row[]) : []),
                  ...(review.thisRefund.toBank > 0 ? ([["By bank transfer", inr(review.thisRefund.toBank)]] as Row[]) : []),
                  ["This refund", inr(review.thisRefund.total), true],
                  ["Left to refund on this order afterwards", inr(review.leftAfter)],
                ]}
              />
              {review.thisRefund.notes.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
                  {review.thisRefund.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="6. Checks">
              <ul className="space-y-2">
                {review.checks.map((c) => (
                  <li key={c.label} className="flex gap-2 text-sm">
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        c.ok ? "bg-green-100 text-green-700" : c.blocking ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.ok ? "✓" : c.blocking ? "✕" : "!"}
                    </span>
                    <span>
                      <span className="font-medium text-gray-900">{c.label}</span>
                      <span className="sr-only">{c.ok ? " passed" : c.blocking ? " failed" : " warning"}</span>
                      {c.detail && <span className="block text-xs text-gray-500">{c.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            {!readOnly && (
              <div className="sticky bottom-0 -mx-5 space-y-3 border-t border-gray-100 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
                {!review.approvable ? (
                  <p className="text-sm text-red-700">
                    This refund cannot be approved until the failed {failing.filter((c) => c.blocking).length === 1 ? "check is" : "checks are"} sorted out.
                  </p>
                ) : (
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
                    I have compared these figures, and {inr(review.thisRefund.total)} is right.
                  </label>
                )}
                {declining ? (
                  <div className="space-y-2">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why is this refund not being paid? e.g. refunded by hand in Razorpay"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={decline} disabled={busy || !reason.trim()} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 shell-press">
                        {busy ? "Declining…" : "Decline refund"}
                      </button>
                      <button type="button" onClick={() => setDeclining(false)} className="px-3 text-sm text-gray-500 hover:text-gray-700">
                        Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={approve}
                      disabled={busy || !review.approvable || !confirmed}
                      className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 shell-press"
                    >
                      {busy
                        ? "Approving…"
                        : review.thisRefund.toBank > 0
                          ? "Approve refund"
                          : `Approve and send ${inr(review.thisRefund.total)}`}
                    </button>
                    {review.kind === "CANCELLATION" && (
                      <button type="button" onClick={() => setDeclining(true)} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shell-press">
                        Decline
                      </button>
                    )}
                    {review.kind === "RETURN" && review.thisRefund.toBank > 0 && (
                      <span className="text-xs text-gray-500">
                        Paid by hand: send it, then mark it paid from Returns &amp; refunds. If the customer picks store credit instead, it is sent within a few minutes.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Row = [string, string, boolean?];

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="text-sm">
      {rows.map(([label, value, strong]) => (
        <div key={label} className={`flex items-baseline justify-between gap-3 py-1 ${strong ? "border-t border-gray-100 font-semibold text-gray-900" : "text-gray-700"}`}>
          <dt>{label}</dt>
          <dd className="whitespace-nowrap shell-num">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 shell-label">{title}</h3>
      {children}
    </section>
  );
}
