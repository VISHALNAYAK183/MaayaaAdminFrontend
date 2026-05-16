import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getOrderDetails, approveOrder, rejectOrder } from "../../api/adminApi";
import { CLIENT_API_BASE } from "../../api/client";
import ShipOrderModal from "../../components/ShipOrderModal";
import UpdateStatusModal from "../../components/UpdateStatusModal";

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
  REJECTED:         "bg-red-50 text-red-700 border-red-200",
};

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

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

  const { order, products = [], shipment, timeline = [] } = data;
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
                products.map((p: any) => (
                  <div key={p.productId} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 overflow-hidden">
                      {resolveImg(p.imageUrl) && <img src={resolveImg(p.imageUrl)!} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Qty: {p.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                      ₹{Number(p.price ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            {order.amount != null && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(order.amount).toLocaleString()}</span>
              </div>
            )}
          </div>

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

            {/* REQUESTED — Approve / Reject */}
            {status === "REQUESTED" && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? "Processing…" : "Approve Order"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  Reject Order
                </button>
              </div>
            )}

            {/* PLACED — Ship */}
            {status === "PLACED" && (
              <ShipOrderModal orderId={order.orderId} onSuccess={load} />
            )}

            {/* SHIPPED / OUT_FOR_DELIVERY — Update status */}
            {["SHIPPED", "OUT_FOR_DELIVERY"].includes(status) && (
              <UpdateStatusModal
                key={status}
                orderId={order.orderId}
                currentStatus={status}
                onSuccess={load}
              />
            )}

            {["DELIVERED", "REJECTED"].includes(status) && (
              <p className="text-sm text-gray-400 text-center py-2">No further actions available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
