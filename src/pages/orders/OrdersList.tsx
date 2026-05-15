import { useEffect, useState } from "react";
import { getOrders } from "../../api/adminApi";
import { useNavigate } from "react-router-dom";

const STATUSES = ["REQUESTED", "PLACED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "REJECTED"];

const STATUS_STYLE: Record<string, string> = {
  REQUESTED:        "bg-yellow-50 text-yellow-700 border-yellow-200",
  PLACED:           "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED:          "bg-purple-50 text-purple-700 border-purple-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:         "bg-red-50 text-red-700 border-red-200",
};

export default function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState("PLACED");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setPage(0);
  }, [status]);

  useEffect(() => {
    fetchOrders();
  }, [status, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrders(status, page);
      // Backend returns { content: [...], total_pages: N, ... }
      const body = res.data as any;
      setOrders(Array.isArray(body) ? body : (body.content ?? []));
      setTotalPages(body.total_pages ?? 1);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Home / Orders</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              status === s
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              {["Order ID", "Amount", "Status", "Action"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 px-5">
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
                  No {status.replace(/_/g, " ").toLowerCase()} orders
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
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {o.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <button
                      onClick={() => navigate(`/orders/${o.order_id}`)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
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
