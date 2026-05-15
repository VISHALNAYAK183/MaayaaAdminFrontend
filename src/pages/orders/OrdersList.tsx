import { useEffect, useState } from "react";
import { getOrders, approveOrder, rejectOrder } from "../../api/adminApi";
import { useNavigate } from "react-router-dom";
import ShipOrderModal from "../../components/ShipOrderModal";
import UpdateStatusModal from "../../components/UpdateStatusModal";

const TABS = ["PENDING", "REQUESTED", "PLACED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "REJECTED"];

const TAB_LABEL: Record<string, string> = {
  PENDING:          "All Pending",
  OUT_FOR_DELIVERY: "Out for Delivery",
};

const STATUS_STYLE: Record<string, string> = {
  REQUESTED:        "bg-yellow-50 text-yellow-700 border-yellow-200",
  PLACED:           "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED:          "bg-purple-50 text-purple-700 border-purple-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:         "bg-red-50 text-red-700 border-red-200",
};

type ModalState = { orderId: number; type: "ship" | "updateStatus"; currentStatus: string };

export default function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const navigate = useNavigate();

  useEffect(() => { setPage(0); }, [tab]);
  useEffect(() => { fetchOrders(); }, [tab, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (tab === "PENDING") {
        const [reqRes, placedRes] = await Promise.all([
          getOrders("REQUESTED", 0, 100),
          getOrders("PLACED", 0, 100),
        ]);
        const req = reqRes.data as any;
        const placed = placedRes.data as any;
        const reqOrders = Array.isArray(req) ? req : (req.content ?? []);
        const placedOrders = Array.isArray(placed) ? placed : (placed.content ?? []);
        setOrders([...reqOrders, ...placedOrders].sort((a, b) => b.order_id - a.order_id));
        setTotalPages(1);
      } else {
        const res = await getOrders(tab, page);
        const body = res.data as any;
        setOrders(Array.isArray(body) ? body : (body.content ?? []));
        setTotalPages(body.total_pages ?? 1);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: number) => {
    if (!window.confirm("Approve this order?")) return;
    setActionLoading(orderId);
    try {
      await approveOrder(orderId);
      await fetchOrders();
    } catch {
      alert("Failed to approve order.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId: number) => {
    if (!window.confirm("Reject this order?")) return;
    setActionLoading(orderId);
    try {
      await rejectOrder(orderId);
      await fetchOrders();
    } catch {
      alert("Failed to reject order.");
    } finally {
      setActionLoading(null);
    }
  };

  const openModal = (orderId: number, type: "ship" | "updateStatus", currentStatus: string) =>
    setModal({ orderId, type, currentStatus });

  const closeModal = () => setModal(null);

  const renderActions = (o: any) => {
    const busy = actionLoading === o.order_id;

    if (o.status === "REQUESTED") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleApprove(o.order_id)}
            disabled={busy}
            className="text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {busy ? "…" : "Approve"}
          </button>
          <button
            onClick={() => handleReject(o.order_id)}
            disabled={busy}
            className="text-xs px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => navigate(`/orders/${o.order_id}`)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-1 transition-colors"
          >
            View →
          </button>
        </div>
      );
    }

    if (o.status === "PLACED") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => openModal(o.order_id, "ship", o.status)}
            className="text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Ship
          </button>
          <button
            onClick={() => navigate(`/orders/${o.order_id}`)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-1 transition-colors"
          >
            View →
          </button>
        </div>
      );
    }

    if (o.status === "SHIPPED" || o.status === "OUT_FOR_DELIVERY") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => openModal(o.order_id, "updateStatus", o.status)}
            className="text-xs px-2.5 py-1.5 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors"
          >
            Update Status
          </button>
          <button
            onClick={() => navigate(`/orders/${o.order_id}`)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-1 transition-colors"
          >
            View →
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => navigate(`/orders/${o.order_id}`)}
        className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
      >
        View →
      </button>
    );
  };

  return (
    <div>
      {/* Modal overlay */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {modal.type === "ship" ? "Ship Order" : "Update Status"} — #{modal.orderId}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {modal.type === "ship" ? (
              <ShipOrderModal
                orderId={modal.orderId}
                onSuccess={() => { closeModal(); fetchOrders(); }}
              />
            ) : (
              <UpdateStatusModal
                key={modal.currentStatus}
                orderId={modal.orderId}
                currentStatus={modal.currentStatus}
                onSuccess={() => { closeModal(); fetchOrders(); }}
              />
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Home / Order Management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {TAB_LABEL[t] ?? t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              {["Order ID", "Amount", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 px-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="py-4 px-5">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-gray-400 text-sm">
                  No {(TAB_LABEL[tab] ?? tab.replace(/_/g, " ")).toLowerCase()} orders
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-4 px-5 text-sm font-mono text-gray-700 dark:text-gray-300">
                    #{o.order_id}
                  </td>
                  <td className="py-4 px-5 text-sm font-semibold text-gray-900 dark:text-white">
                    ₹{Number(o.amount ?? 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {o.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-4 px-5">{renderActions(o)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination — hidden on PENDING tab since it's a merged fetch */}
        {tab !== "PENDING" && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-400">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-600 dark:text-gray-300"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-600 dark:text-gray-300"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
