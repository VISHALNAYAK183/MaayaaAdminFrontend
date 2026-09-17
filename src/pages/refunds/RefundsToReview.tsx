import { useCallback, useEffect, useState } from "react";
import { getRefundQueue, type RefundQueueItem } from "../../api/refundReviewApi";
import { getUnmatchedPayments, type UnmatchedPayment } from "../../api/unmatchedPaymentsApi";
import { serverMessage } from "../../api/client";
import RefundReviewPanel from "../../components/RefundReviewPanel";
import UnmatchedPaymentPanel from "../../components/UnmatchedPaymentPanel";
import { ago, rupees } from "../../lib/format";

/** Every refund waiting for somebody to compare the money, oldest first. */
export default function RefundsToReview() {
  const [items, setItems] = useState<RefundQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<RefundQueueItem | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedPayment[]>([]);
  const [openPayment, setOpenPayment] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    getRefundQueue()
      .then((res) => setItems(res.data))
      .catch((err) => setError(serverMessage(err, "Refunds could not be loaded.")));
    // Its own request, so a failure here does not hide the refunds above.
    getUnmatchedPayments()
      .then((res) => setUnmatched(res.data))
      .catch(() => setUnmatched([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Refunds to review</h1>
        <p className="mt-1 text-sm text-gray-500">
          Nothing is refunded until someone compares what was paid with what goes back, and approves it
        </p>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="shell-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="whitespace-nowrap text-left shell-label">
                <th className="px-4 py-3 font-medium">Waiting since</th>
                <th className="px-4 py-3 font-medium">Why</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 text-right font-medium">Refund</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items == null ? (
                !error && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading…</td>
                  </tr>
                )
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">No refunds waiting. Everything has been reviewed.</td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={`${it.kind}-${it.returnId ?? it.orderId}`} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{ago(it.since) ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${it.kind === "CANCELLATION" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                        {it.kind === "CANCELLATION" ? "Cancellation" : `Return #${it.returnId}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 shell-num">#{it.orderId}</td>
                    <td className="px-4 py-3 text-gray-700">{it.customer ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 shell-num">{rupees(it.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpen(it)}
                        className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 shell-press"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {unmatched.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">Payments with no order</h2>
          <p className="mt-1 mb-3 text-sm text-gray-500">
            Razorpay took the money but the order was never created. Each customer here cannot pay again until it is settled.
          </p>
          <div className="shell-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="whitespace-nowrap text-left shell-label">
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unmatched.map((p) => (
                    <tr key={p.attemptId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{ago(p.capturedAt) ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="shell-num">{p.razorpayPaymentId ?? "—"}</span>
                        {p.matchedOrderId != null && (
                          <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            On order #{p.matchedOrderId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.customer ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 shell-num">{rupees(p.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenPayment(p.attemptId)}
                          className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 shell-press"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {openPayment != null && (
        <UnmatchedPaymentPanel attemptId={openPayment} onClose={() => setOpenPayment(null)} onDone={load} />
      )}

      {open && (
        <RefundReviewPanel
          target={open.kind === "CANCELLATION" ? { kind: "CANCELLATION", orderId: open.orderId as number } : { kind: "RETURN", returnId: open.returnId as number }}
          onClose={() => setOpen(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
