import { useReadOnly } from "../../hooks/useReadOnly";
import { useEffect, useRef, useState } from "react";
import {
  getAdminExchanges,
  approveOnlineQc,
  rejectOnlineQc,
  warehouseQcPass,
  warehouseQcFail,
  shipReplacement,
  completeExchange,
  AdminExchange,
  ExchangeStatus,
} from "../../api/exchangesApi";
import Pagination from "../../components/ui/Pagination";

const PAGE_SIZE = 20;

// Collapse the 14 statuses into 5 lifecycle buckets for the tab bar.
const TABS: Array<{ key: string; label: string; match: ExchangeStatus[] | null }> = [
  { key: "ALL",          label: "All",          match: null },
  { key: "PENDING_QC",   label: "Pending QC",   match: ["REQUESTED"] },
  { key: "PICKUP",       label: "Pickup",       match: ["STOCK_RESERVED", "PICKUP_PENDING", "PICKED_UP", "WAREHOUSE_QC_PENDING"] },
  { key: "REPLACEMENT",  label: "Replacement",  match: ["WAREHOUSE_QC_PASSED", "REPLACEMENT_SHIPPED"] },
  { key: "CLOSED",       label: "Closed",       match: ["COMPLETED", "REFUND_INITIATED", "REJECTED", "ONLINE_QC_REJECTED", "NO_STOCK", "WAREHOUSE_QC_FAILED"] },
];

const STATUS_STYLE: Record<ExchangeStatus, string> = {
  REQUESTED:           "bg-yellow-50 text-yellow-700 border-yellow-200",
  ONLINE_QC_APPROVED:  "bg-blue-50 text-blue-700 border-blue-200",
  ONLINE_QC_REJECTED:  "bg-red-50 text-red-700 border-red-200",
  STOCK_RESERVED:      "bg-indigo-50 text-indigo-700 border-indigo-200",
  NO_STOCK:            "bg-orange-50 text-orange-700 border-orange-200",
  PICKUP_PENDING:      "bg-indigo-50 text-indigo-700 border-indigo-200",
  PICKED_UP:           "bg-purple-50 text-purple-700 border-purple-200",
  WAREHOUSE_QC_PENDING:"bg-purple-50 text-purple-700 border-purple-200",
  WAREHOUSE_QC_PASSED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  WAREHOUSE_QC_FAILED: "bg-red-50 text-red-700 border-red-200",
  REPLACEMENT_SHIPPED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED:           "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUND_INITIATED:    "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED:            "bg-red-50 text-red-700 border-red-200",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const variantLabel = (size: string | null, color: string | null, fallbackId: number | null) => {
  const parts: string[] = [];
  if (size)  parts.push(`Size ${size}`);
  if (color) parts.push(color);
  if (parts.length) return parts.join(" / ");
  return fallbackId != null ? `#${fallbackId}` : "—";
};

type QcAction = "onlineApprove" | "onlineReject" | "warehousePass" | "warehouseFail";

const QC_LABEL: Record<QcAction, string> = {
  onlineApprove:  "Approve Online QC",
  onlineReject:   "Reject Online QC",
  warehousePass:  "Warehouse QC Pass",
  warehouseFail:  "Warehouse QC Fail",
};

export default function ExchangesList() {
  const readOnly = useReadOnly();
  const [exchanges, setExchanges] = useState<AdminExchange[]>([]);
  const [tab, setTab] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminExchange | null>(null);

  // QC comment dialog state
  const [qcDialog, setQcDialog] = useState<{ id: number; action: QcAction } | null>(null);
  const [qcComment, setQcComment] = useState("");

  // Out-of-order response guard.
  const fetchSeq = useRef(0);

  const fetchExchanges = async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const tabDef = TABS.find((t) => t.key === tab);
      // tabDef.match === null means the "All" tab — send no status filter.
      const res = await getAdminExchanges(
        page,
        PAGE_SIZE,
        tabDef?.match ?? undefined,
      );
      if (seq !== fetchSeq.current) return;
      setExchanges(res.data.content);
      setTotalPages(Math.max(1, res.data.totalPages));
      setTotalElements(res.data.totalElements);
    } catch {
      if (seq !== fetchSeq.current) return;
      setExchanges([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  };

  useEffect(() => { setPage(0); }, [tab]);

  useEffect(() => {
    fetchExchanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  // Server already filtered by the tab's status list — rows are visible directly.
  const visible = exchanges;

  const openQcDialog = (id: number, action: QcAction) => {
    setQcComment("");
    setQcDialog({ id, action });
  };

  const submitQc = async () => {
    if (!qcDialog) return;
    if (!qcComment.trim()) {
      alert("Please enter a comment");
      return;
    }
    setActionLoading(qcDialog.id);
    try {
      const fn =
        qcDialog.action === "onlineApprove" ? approveOnlineQc :
        qcDialog.action === "onlineReject"  ? rejectOnlineQc  :
        qcDialog.action === "warehousePass" ? warehouseQcPass :
        warehouseQcFail;
      await fn(qcDialog.id, qcComment.trim());
      await fetchExchanges();
      setSelected(null);
      setQcDialog(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const runSimple = async (id: number, action: "ship" | "complete", confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setActionLoading(id);
    try {
      if (action === "ship") await shipReplacement(id);
      else                   await completeExchange(id);
      await fetchExchanges();
      setSelected(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Status-gated action buttons. Mirrors AdminExchangeService transition checks.
  const renderActions = (e: AdminExchange) => {
    const busy = actionLoading === e.exchangeId;
    const btn = "text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors";

    if (readOnly) return null;

    if (e.exchangeStatus === "REQUESTED") {
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => openQcDialog(e.exchangeId, "onlineApprove")}
            disabled={busy}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
          >
            {busy ? "…" : "Online QC Approve"}
          </button>
          <button
            onClick={() => openQcDialog(e.exchangeId, "onlineReject")}
            disabled={busy}
            className={`${btn} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`}
          >
            Online QC Reject
          </button>
        </div>
      );
    }

    if (
      e.exchangeStatus === "STOCK_RESERVED" ||
      e.exchangeStatus === "PICKUP_PENDING" ||
      e.exchangeStatus === "PICKED_UP" ||
      e.exchangeStatus === "WAREHOUSE_QC_PENDING"
    ) {
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => openQcDialog(e.exchangeId, "warehousePass")}
            disabled={busy}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
          >
            {busy ? "…" : "Warehouse QC Pass"}
          </button>
          <button
            onClick={() => openQcDialog(e.exchangeId, "warehouseFail")}
            disabled={busy}
            className={`${btn} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`}
          >
            Warehouse QC Fail
          </button>
        </div>
      );
    }

    if (e.exchangeStatus === "WAREHOUSE_QC_PASSED") {
      return (
        <button
          onClick={() => runSimple(e.exchangeId, "ship", "Mark replacement as shipped?")}
          disabled={busy}
          className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}
        >
          {busy ? "…" : "Ship Replacement"}
        </button>
      );
    }

    if (e.exchangeStatus === "REPLACEMENT_SHIPPED") {
      return (
        <button
          onClick={() => runSimple(e.exchangeId, "complete", "Mark exchange as completed?")}
          disabled={busy}
          className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}
        >
          {busy ? "…" : "Complete Exchange"}
        </button>
      );
    }

    return <span className="text-xs text-gray-400">—</span>;
  };

  return (
    <div>
      {/* QC Comment dialog */}
      {qcDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setQcDialog(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {QC_LABEL[qcDialog.action]} — Exchange #{qcDialog.id}
              </h3>
              <button onClick={() => setQcDialog(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                ✕
              </button>
            </div>

            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comment *
            </label>
            <textarea
              value={qcComment}
              onChange={(ev) => setQcComment(ev.target.value)}
              rows={4}
              maxLength={500}
              placeholder={
                qcDialog.action === "onlineApprove" ? "Damage visible in images; approving exchange" :
                qcDialog.action === "onlineReject"  ? "Issue not visible in images" :
                qcDialog.action === "warehousePass" ? "Product condition good; replacement will ship" :
                                                     "Used product returned; failing QC"
              }
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">{qcComment.length}/500</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setQcDialog(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submitQc}
                disabled={actionLoading === qcDialog.id}
                className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 disabled:opacity-50"
              >
                {actionLoading === qcDialog.id ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && !qcDialog && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-lg mx-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Exchange #{selected.exchangeId} — Order #{selected.orderId ?? "—"}
              </h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                ✕
              </button>
            </div>

            {selected.productName && (
              <div className="flex gap-3 mb-4">
                {selected.productImage && (
                  <img
                    src={selected.productImage}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                )}
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{selected.productName}</p>
                  {selected.orderItemId != null && (
                    <p className="text-xs text-gray-400">Order item #{selected.orderItemId}</p>
                  )}
                </div>
              </div>
            )}

            <dl className="text-sm grid grid-cols-2 gap-y-2 gap-x-4">
              {(selected.userName || selected.userEmail) && (
                <>
                  <dt className="text-gray-500">Customer</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {selected.userName ?? (selected.userId != null ? `#${selected.userId}` : "—")}
                    {selected.userEmail && (
                      <span className="block text-[11px] text-gray-400 truncate">{selected.userEmail}</span>
                    )}
                  </dd>
                </>
              )}
              <dt className="text-gray-500">Old variant</dt>
              <dd className="text-gray-900 dark:text-white">
                {variantLabel(selected.oldVariantSize, selected.oldVariantColor, selected.oldVariantId)}
              </dd>
              <dt className="text-gray-500">New variant</dt>
              <dd className="text-gray-900 dark:text-white">
                {variantLabel(selected.newVariantSize, selected.newVariantColor, selected.newVariantId)}
              </dd>
              <dt className="text-gray-500">Reason</dt>
              <dd className="text-gray-900 dark:text-white">{selected.reason ?? "—"}</dd>
              <dt className="text-gray-500">Comments</dt>
              <dd className="text-gray-900 dark:text-white">{selected.comments ?? "—"}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[selected.exchangeStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {selected.exchangeStatus.replace(/_/g, " ")}
                </span>
              </dd>
              <dt className="text-gray-500">Requested</dt>
              <dd className="text-gray-900 dark:text-white">{formatDate(selected.requestedAt)}</dd>

              {selected.onlineQcStatus && (
                <>
                  <dt className="text-gray-500">Online QC</dt>
                  <dd className="text-gray-900 dark:text-white">{selected.onlineQcStatus}</dd>
                </>
              )}
              {selected.onlineQcComment && (
                <>
                  <dt className="text-gray-500">Online comment</dt>
                  <dd className="text-gray-900 dark:text-white">{selected.onlineQcComment}</dd>
                </>
              )}
              {selected.warehouseQcStatus && (
                <>
                  <dt className="text-gray-500">Warehouse QC</dt>
                  <dd className="text-gray-900 dark:text-white">{selected.warehouseQcStatus}</dd>
                </>
              )}
              {selected.warehouseQcComment && (
                <>
                  <dt className="text-gray-500">Warehouse comment</dt>
                  <dd className="text-gray-900 dark:text-white">{selected.warehouseQcComment}</dd>
                </>
              )}
            </dl>

            <div className="mt-5 flex justify-end">{renderActions(selected)}</div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exchanges</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Home / Exchanges</p>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              {["Exchange", "Product", "Customer", "Old → New", "Reason", "Status", "Requested", "Actions"].map((h) => (
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
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="py-4 px-5">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                  No exchanges in this view
                </td>
              </tr>
            ) : (
              visible.map((e) => (
                <tr key={e.exchangeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-4 px-5 text-sm font-mono text-gray-700 dark:text-gray-300">
                    <button onClick={() => setSelected(e)} className="hover:underline">
                      #{e.exchangeId}
                    </button>
                    {e.orderId != null && (
                      <span className="block text-[11px] text-gray-400">order #{e.orderId}</span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2 max-w-[220px]">
                      {e.productImage && (
                        <img
                          src={e.productImage}
                          alt=""
                          className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-700 shrink-0"
                        />
                      )}
                      <div className="text-sm text-gray-900 dark:text-white truncate">
                        {e.productName ?? "—"}
                        {e.orderItemId != null && (
                          <span className="block text-[11px] text-gray-400">item #{e.orderItemId}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700 dark:text-gray-300">
                    <div className="truncate max-w-[180px]">{e.userName ?? (e.userId != null ? `#${e.userId}` : "—")}</div>
                    {e.userEmail && (
                      <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{e.userEmail}</div>
                    )}
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700 dark:text-gray-300">
                    <span>{variantLabel(e.oldVariantSize, e.oldVariantColor, e.oldVariantId)}</span>
                    <span className="mx-1 text-gray-400">→</span>
                    <span>{variantLabel(e.newVariantSize, e.newVariantColor, e.newVariantId)}</span>
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                    {e.reason ?? "—"}
                  </td>
                  <td className="py-4 px-5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[e.exchangeStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {e.exchangeStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(e.requestedAt)}
                  </td>
                  <td className="py-4 px-5">{renderActions(e)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Showing {visible.length} of {totalElements} matching exchange{totalElements === 1 ? "" : "s"}
      </p>
    </div>
  );
}
