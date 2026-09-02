import { useReadOnly } from "../../hooks/useReadOnly";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getOrderDetails,
  approveOrder,
  rejectOrder,
  getInvoiceByOrder,
  downloadInvoicePdf,
  retryRefund,
} from "../../api/adminApi";
import { CLIENT_API_BASE } from "../../api/client";
import ShipOrderModal from "../../components/ShipOrderModal";
import UpdateStatusModal from "../../components/UpdateStatusModal";
import CancelOrderModal from "../../components/CancelOrderModal";

const resolveImg = (url: string | undefined | null) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  if (url.startsWith("/")) return `${CLIENT_API_BASE}${url}`;
  return null;
};

const STATUS_STYLE: Record<string, string> = {
  REQUESTED:        "bg-yellow-50 text-yellow-700 border-yellow-200",
  PLACED:           "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED:          "bg-purple-50 text-purple-700 border-purple-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:        "bg-slate-100 text-slate-700 border-slate-300",
  REJECTED:         "bg-red-50 text-red-700 border-red-200",
};

const REFUND_STYLE: Record<string, string> = {
  COMPLETED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING:    "bg-amber-50 text-amber-700 border-amber-200",
  FAILED:     "bg-red-50 text-red-700 border-red-200",
};

export default function OrderDetails() {
  const readOnly = useReadOnly();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const lookup = await getInvoiceByOrder(Number(orderId));
      const invoiceId = lookup.data?.invoiceId;
      if (typeof invoiceId !== "number" || !Number.isFinite(invoiceId) || invoiceId <= 0) {
        alert("No invoice exists for this order yet. Approve the order first.");
        return;
      }
      const res = await downloadInvoicePdf(invoiceId);
      const blob = new Blob([res.data as Blob], { type: "application/pdf" });
      if (blob.size === 0) {
        alert("Invoice PDF came back empty — please retry, or contact support if it persists.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: unknown } };
      const status = e?.response?.status;

      // downloadInvoicePdf is responseType:"blob", so an error body comes back
      // as a Blob — `.data.message` would be undefined. Parse the blob as JSON
      // when present.
      let serverMsg: string | undefined;
      const data = e?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          serverMsg = JSON.parse(text)?.message;
        } catch {
          /* not JSON, fall through to status-based messages */
        }
      } else if (data && typeof data === "object" && "message" in data) {
        serverMsg = String((data as { message: unknown }).message);
      }

      if (serverMsg) {
        alert(serverMsg);
      } else if (status === 404) {
        alert("No invoice exists for this order yet. Approve the order first.");
      } else if (status === 401 || status === 403) {
        alert("You don't have permission to download this invoice.");
      } else if (typeof status === "number" && status >= 500) {
        alert(`Server error (${status}) while generating the invoice. Please retry.`);
      } else {
        alert("Failed to download invoice. Please check your connection and retry.");
      }
    } finally {
      setInvoiceLoading(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await getOrderDetails(Number(orderId));
      setData(res.data);
    } catch {
      setError("Failed to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orderId]);

  const handleApprove = async () => {
    if (!window.confirm("Approve this order?")) return;
    setActionLoading(true);
    try {
      await approveOrder(data.order.orderId);
      await load();
    } catch {
      alert("Failed to approve order. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryRefund = async (refundId: number, amount: number) => {
    // The gateway call carries no idempotency key, so this asks for a second
    // refund rather than resuming the first. Worth saying out loud before
    // somebody presses it twice.
    const ok = window.confirm(
      `Ask the gateway again for ₹${Number(amount ?? 0).toLocaleString()}?\n\n` +
        "Only do this if the first attempt was refused. If it actually went " +
        "through and was recorded wrong, this sends the money twice."
    );
    if (!ok) return;
    setActionLoading(true);
    try {
      const res = await retryRefund(Number(orderId), refundId);
      alert(res.data?.message ?? "Refund retried.");
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message ?? "Could not retry the refund. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Reject this order? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await rejectOrder(data.order.orderId);
      await load();
    } catch {
      alert("Failed to reject order. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${70 - i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-sm text-red-700 dark:text-red-400">
        {error || "Order not found."}
      </div>
    );
  }

  const { order, products = [], shipment, timeline = [], refunds = [] } = data;
  const status: string = order.status ?? "";

  const sortedTimeline = [...timeline].sort(
    (a: any, b: any) =>
      new Date(a.event_time ?? a.eventTime ?? 0).getTime() -
      new Date(b.event_time ?? b.eventTime ?? 0).getTime()
  );

  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/orders")}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order #{order.orderId}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Home / Order Management / #{order.orderId}</p>
        </div>
        <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
          {status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Order summary */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Products</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.length === 0 ? (
                <p className="px-6 py-8 text-sm text-center text-gray-400">No products</p>
              ) : (
                products.map((p: any) => {
                  // A line the customer cancelled is not in the parcel and is
                  // not in the total. Showing it like the rest is how the wrong
                  // thing gets packed.
                  const cancelled = String(p.itemStatus ?? "").toUpperCase() === "CANCELLED";
                  return (
                  <div
                    key={p.orderItemId ?? p.productId}
                    className={`px-6 py-4 flex items-center gap-4 ${cancelled ? "opacity-60" : ""}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 overflow-hidden">
                      {resolveImg(p.imageUrl) && <img src={resolveImg(p.imageUrl)!} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${cancelled ? "line-through" : ""}`}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {p.quantity}</p>
                        {cancelled && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-300">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm font-semibold text-gray-900 dark:text-white shrink-0 ${cancelled ? "line-through" : ""}`}>
                      ₹{Number(p.price ?? 0).toLocaleString()}
                    </p>
                  </div>
                  );
                })
              )}
            </div>
            {order.amount != null && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(order.amount).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Refunds — a failed one used to exist only in the database */}
          {refunds.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Refunds</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {refunds.map((r: any) => {
                  const st = String(r.status ?? "").toUpperCase();
                  return (
                    <div key={r.refundId} className="px-6 py-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            ₹{Number(r.amount ?? 0).toLocaleString()}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${REFUND_STYLE[st] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {st}
                          </span>
                          {r.method && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">{r.method}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {st === "COMPLETED"
                            ? `Sent ${fmtDateTime(r.refundedAt)}`
                            : `Raised ${fmtDateTime(r.createdAt)}`}
                        </p>
                        {r.gatewayRefundId && (
                          <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-0.5 break-all">
                            {r.gatewayRefundId}
                          </p>
                        )}
                        {r.failureReason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {r.failureReason}
                          </p>
                        )}
                      </div>
                      {!readOnly && st !== "COMPLETED" && (
                        <button
                          onClick={() => handleRetryRefund(r.refundId, r.amount)}
                          disabled={actionLoading}
                          className="text-xs px-2.5 py-1.5 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium disabled:opacity-50 transition-colors shrink-0"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shipment + timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Shipment timeline</h2>
              {shipment?.tracking_url && (
                <a
                  href={shipment.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Track ↗
                </a>
              )}
            </div>

            {shipment && (
              <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Carrier</p>
                  <p className="font-medium text-gray-900 dark:text-white">{shipment.carrier ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Tracking #</p>
                  <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                    {shipment.tracking_number ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Est. delivery</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {shipment.estimated_delivery_date
                      ? new Date(shipment.estimated_delivery_date).toLocaleDateString("en-IN", {
                          year: "numeric", month: "short", day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Shipment status</p>
                  <p className="font-medium text-gray-900 dark:text-white">{shipment.status ?? "—"}</p>
                </div>
              </div>
            )}

            <div className="px-6 py-5">
              {sortedTimeline.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No shipment events yet
                </p>
              ) : (
                <ol className="space-y-0">
                  {sortedTimeline.map((evt: any, idx: number) => {
                    const isLast = idx === sortedTimeline.length - 1;
                    return (
                      <li key={`${evt.status}-${idx}`} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full border-2 ${
                              isLast
                                ? "bg-emerald-500 border-emerald-500"
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500"
                            }`}
                          />
                          {!isLast && (
                            <div className="w-0.5 flex-1 min-h-[2rem] bg-gray-200 dark:bg-gray-700" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {(evt.status ?? "").replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {fmtDateTime(evt.event_time ?? evt.eventTime)}
                            </p>
                          </div>
                          {evt.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{evt.description}</p>
                          )}
                          {evt.location && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              📍 {evt.location}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Actions panel */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>

            {readOnly && (
              <p className="text-sm text-gray-400 text-center py-2">
                Your role has read-only access.
              </p>
            )}

            {/* REQUESTED — the confirmation call */}
            {!readOnly && status === "REQUESTED" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This is a cash order over the confirmation threshold. Call the customer before
                  dispatching it — their number is on the order list.
                </p>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? "Processing…" : "Confirmed on call"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  Could not confirm — cancel
                </button>
              </div>
            )}

            {/* PLACED — Ship */}
            {!readOnly && status === "PLACED" && (
              <ShipOrderModal orderId={order.orderId} onSuccess={load} />
            )}

            {/* SHIPPED / OUT_FOR_DELIVERY — Update status */}
            {!readOnly && ["SHIPPED", "OUT_FOR_DELIVERY"].includes(status) && (
              <UpdateStatusModal
                key={status}
                orderId={order.orderId}
                currentStatus={status}
                onSuccess={load}
              />
            )}

            {/* Cancel — everything between placement and delivery. A REQUESTED
                order is called off above with "Could not confirm"; a delivered
                one is a return. */}
            {!readOnly && ["PLACED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(status) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Cancel Order
                </p>
                <CancelOrderModal
                  key={status}
                  orderId={order.orderId}
                  currentStatus={status}
                  onSuccess={load}
                />
              </div>
            )}

            {!readOnly && ["DELIVERED", "REJECTED", "CANCELLED"].includes(status) && (
              <p className="text-sm text-gray-400 text-center py-2">No further actions available.</p>
            )}

            {status && status !== "REQUESTED" && status !== "REJECTED" && (
              <button
                onClick={handleDownloadInvoice}
                disabled={invoiceLoading}
                className="mt-3 w-full py-2.5 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {invoiceLoading ? "Generating…" : "Download Invoice"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
