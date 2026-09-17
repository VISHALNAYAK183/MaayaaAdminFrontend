import { CLIENT_API_BASE } from "../../api/client";
import { useReadOnly } from "../../hooks/useReadOnly";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  getAdminReturns,
  approveReturn,
  rejectReturn,
  markPickedUp,
  markInspected,
  rejectRefund,
  completeRefund,
  AdminReturn,
  AdminReturnStatus,
} from "../../api/returnsApi";
import Pagination from "../../components/ui/Pagination";
import RefundReviewPanel from "../../components/RefundReviewPanel";


/**
 * Return photos are stored by the storefront under /uploads and served by it,
 * not by this panel. A bare path here would resolve against the admin origin
 * and 404. Product images are already absolute, which is why they need none of
 * this.
 */
const photoSrc = (url: string) =>
  url.startsWith("http") ? url : `${CLIENT_API_BASE}${url}`;

const PAGE_SIZE = 20;

const TABS: Array<AdminReturnStatus | "ALL"> = [
  "ALL",
  "REQUESTED",
  "APPROVED",
  // The two middle states had no tab either, so a return in transit or on the
  // QC bench could only be found under ALL.
  "PICKED_UP",
  "INSPECTED",
  "REFUND_APPROVED",
  "REFUNDED",
  "REJECTED",
];

const STATUS_STYLE: Record<string, string> = {
  REQUESTED:       "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED:        "bg-blue-50 text-blue-700 border-blue-200",
  PICKED_UP:       "bg-indigo-50 text-indigo-700 border-indigo-200",
  INSPECTED:       "bg-cyan-50 text-cyan-700 border-cyan-200",
  REFUND_APPROVED: "bg-purple-50 text-purple-700 border-purple-200",
  REFUNDED:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:        "bg-red-50 text-red-700 border-red-200",
};

type Action =
  | "approve"
  | "reject"
  | "pickedUp"
  | "qcPass"
  | "qcFail"
  | "refundReject"
  | "refundComplete";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ReturnsList() {
  const readOnly = useReadOnly();
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<typeof TABS[number]>(() => {
    const wanted = searchParams.get("status") as typeof TABS[number] | null;
    return wanted && TABS.includes(wanted) ? wanted : "ALL";
  });
  // The bell and the landing page link here with a filter already chosen.
  useEffect(() => {
    const wanted = searchParams.get("status") as typeof TABS[number] | null;
    if (wanted && TABS.includes(wanted)) setTab(wanted);
  }, [searchParams]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminReturn | null>(null);
  // A refund is approved from the review, never from a bare confirm.
  const [reviewing, setReviewing] = useState<number | null>(null);

  // Out-of-order response guard — same pattern as expenses/stock.
  const fetchSeq = useRef(0);

  const fetchReturns = async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const res = await getAdminReturns(
        page,
        PAGE_SIZE,
        tab === "ALL" ? undefined : tab,
      );
      if (seq !== fetchSeq.current) return;
      setReturns(res.data.content);
      setTotalPages(Math.max(1, res.data.totalPages));
      setTotalElements(res.data.totalElements);
      setLoadFailed(false);
    } catch {
      if (seq !== fetchSeq.current) return;
      setLoadFailed(true);
      setReturns([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  };

  // Reset to page 0 whenever the user changes tab — otherwise switching
  // from REFUNDED page 3 to REQUESTED could land on a page that doesn't
  // exist in the new set.
  useEffect(() => { setPage(0); }, [tab]);

  useEffect(() => {
    fetchReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab]);

  // Server already paginates by tab — rows are the visible list directly.
  const visible = returns;

  const runAction = async (returnId: number, action: Action, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setActionLoading(returnId);
    try {
      if (action === "approve")            await approveReturn(returnId);
      else if (action === "reject") {
        // Whatever is typed here is what the customer is told, so a rejection
        // is worth a sentence. Approving usually has nothing to add.
        const why = window.prompt("Why is this return being declined? The customer sees this.");
        if (why === null) { setActionLoading(null); return; }
        await rejectReturn(returnId, why.trim() || undefined);
      }
      else if (action === "pickedUp")      await markPickedUp(returnId);
      else if (action === "qcPass")        await markInspected(returnId, true);
      else if (action === "qcFail") {
        // The note becomes the disposition message the customer is held to,
        // so it is worth asking for rather than defaulting.
        const why = window.prompt("What failed inspection? The customer sees this.");
        if (why === null) { setActionLoading(null); return; }
        await markInspected(returnId, false, why.trim() || undefined);
      }
      else if (action === "refundReject")  await rejectRefund(returnId);
      else if (action === "refundComplete") await completeRefund(returnId);
      await fetchReturns();
      setSelected(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const renderActions = (r: AdminReturn) => {
    const busy = actionLoading === r.returnId;
    const btn = "text-xs px-2.5 py-1.5 rounded-full font-medium disabled:opacity-50 transition-colors shell-press";

    // Nothing here is readable-only, so a viewer gets no actions at all.
    if (readOnly) return null;

    if (r.returnStatus === "REQUESTED") {
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => runAction(r.returnId, "approve", "Approve return request?")}
            disabled={busy}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
          >
            {busy ? "…" : "Approve"}
          </button>
          <button
            onClick={() => runAction(r.returnId, "reject", "Reject return request?")}
            disabled={busy}
            className={`${btn} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`}
          >
            Reject
          </button>
        </div>
      );
    }

    // Approved, waiting on the courier. The refund cannot be approved from
    // here — the server wants the item back and inspected first, which is what
    // these two steps are. They had endpoints and no buttons, so every approved
    // return used to stop dead at this row.
    if (r.returnStatus === "APPROVED") {
      return (
        <button
          onClick={() => runAction(r.returnId, "pickedUp", "Mark this item as collected from the customer?")}
          disabled={busy}
          className={`${btn} bg-gray-900 hover:bg-gray-700 text-white`}
        >
          {busy ? "…" : "Mark picked up"}
        </button>
      );
    }

    // Back with us: warehouse QC decides whether the money goes back.
    if (r.returnStatus === "PICKED_UP") {
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => runAction(r.returnId, "qcPass", "Item passed inspection? The refund can be approved next.")}
            disabled={busy}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
          >
            {busy ? "…" : "QC passed"}
          </button>
          <button
            onClick={() => runAction(r.returnId, "qcFail", "Item failed inspection? This rejects the return — no refund.")}
            disabled={busy}
            className={`${btn} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`}
          >
            QC failed
          </button>
        </div>
      );
    }

    if (r.returnStatus === "INSPECTED") {
      return (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setReviewing(r.returnId)}
            disabled={busy}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
          >
            {busy ? "…" : "Review refund"}
          </button>
          <button
            onClick={() => runAction(r.returnId, "refundReject", "Reject refund? Used when the returned item fails inspection.")}
            disabled={busy}
            className={`${btn} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`}
          >
            Reject Refund
          </button>
        </div>
      );
    }

    if (r.returnStatus === "REFUND_APPROVED") {
      // A cash refund with no destination cannot be paid: the customer picks
      // store credit or gives a UPI id from their order page, and the server
      // refuses until they do. Better a disabled button with the reason on it
      // than an error after the click.
      if (r.awaitingRefundChoice) {
        return (
          <span
            className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
            title="Cash order. The customer has not chosen store credit or given a UPI id or bank account yet."
          >
            Waiting on customer
          </span>
        );
      }
      return (
        <button
          onClick={() => runAction(r.returnId, "refundComplete", "Mark refund as completed? Confirm money has been disbursed.")}
          disabled={busy}
          className={`${btn} bg-gray-900 hover:bg-gray-700 text-white`}
        >
          {busy ? "…" : "Mark Refund Completed"}
        </button>
      );
    }

    return <span className="text-xs text-gray-400">—</span>;
  };

  return (
    <div>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="shell-panel shadow-xl p-6 w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Return #{selected.returnId} — Order #{selected.orderId}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-4 mb-4">
              {selected.productImage && (
                <img
                  src={selected.productImage}
                  alt={selected.productName ?? ""}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-900">{selected.productName ?? "—"}</p>
                {(selected.variantSize || selected.variantColor) && (
                  <p className="text-gray-500">
                    {[selected.variantSize && `Size ${selected.variantSize}`, selected.variantColor]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p className="text-gray-500">
                  Qty {selected.quantity ?? "—"} · ₹{Number(selected.itemPrice ?? 0).toLocaleString()}
                </p>
                <p className="text-gray-500 mt-1">
                  Refund: ₹{Number(selected.refundAmount ?? 0).toLocaleString()}
                </p>

                {/* Where this money is going. A bank refund is paid by hand, so
                    whoever does it needs the destination on the screen rather
                    than in the database. */}
                {/* What the customer photographed. This is the evidence the
                    approve/decline decision is made on, and it used to live in
                    a WhatsApp thread. */}
                {selected.photos && selected.photos.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 shell-label">
                      Customer photos
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {selected.photos.map((url) => (
                        <a
                          key={url}
                          href={photoSrc(url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200"
                          title="Open full size"
                        >
                          <img
                            src={photoSrc(url)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {selected.onlineQcComment && (
                  <p className="mt-2 text-[12px] text-gray-600">
                    <span className="font-semibold">Checked:</span> {selected.onlineQcComment}
                  </p>
                )}

                {selected.refundMode === null && (
                  <p className="mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {selected.awaitingRefundChoice
                      ? "Waiting on the customer to choose where the money goes"
                      : "Not chosen — will go back to the original payment"}
                  </p>
                )}
                {selected.refundMode === "STORE_CREDIT" && (
                  <p className="mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Store credit — issued instantly on completion
                  </p>
                )}
                {selected.refundMode === "ORIGINAL" && (
                  <p className="mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Back to the original payment
                  </p>
                )}
                {selected.refundMode === "BANK" && (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-900">
                    <p className="font-semibold mb-0.5">Pay this out by hand</p>
                    {selected.refundUpi ? (
                      <p>UPI: <span className="font-mono">{selected.refundUpi}</span></p>
                    ) : (
                      <>
                        <p>{selected.refundAccountName ?? "—"}</p>
                        <p className="font-mono">{selected.refundAccountNumber ?? "—"}</p>
                        <p className="font-mono">{selected.refundIfsc ?? "—"}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <dl className="text-sm grid grid-cols-2 gap-y-2 gap-x-4">
              <dt className="text-gray-500">Customer</dt>
              <dd className="text-gray-900">{selected.userName ?? `#${selected.userId}`}</dd>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-900 break-all">{selected.userEmail ?? "—"}</dd>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-900">{selected.userPhone ?? "—"}</dd>
              <dt className="text-gray-500">Reason</dt>
              <dd className="text-gray-900">{selected.reason ?? "—"}</dd>
              <dt className="text-gray-500">Comments</dt>
              <dd className="text-gray-900">{selected.comments ?? "—"}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    STATUS_STYLE[selected.returnStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {selected.returnStatus.replace(/_/g, " ")}
                </span>
              </dd>
              <dt className="text-gray-500">Requested</dt>
              <dd className="text-gray-900">{formatDate(selected.requestedAt)}</dd>
              <dt className="text-gray-500">Approved</dt>
              <dd className="text-gray-900">{formatDate(selected.approvedAt)}</dd>
              <dt className="text-gray-500">Rejected</dt>
              <dd className="text-gray-900">{formatDate(selected.rejectedAt)}</dd>
              <dt className="text-gray-500">Refunded</dt>
              <dd className="text-gray-900">{formatDate(selected.refundedAt)}</dd>
              {/* A failed item is held for a week, then disposed automatically. */}
              {selected.dispositionStatus && (
                <>
                  <dt className="text-gray-500">Held item</dt>
                  <dd className="text-gray-900">
                    {selected.dispositionStatus === "DISPOSED" ? "Disposed" : "Held for the customer"}
                    {selected.dispositionDeadline
                      ? `${selected.dispositionStatus === "DISPOSED" ? " · on" : " · until"} ${formatDate(selected.dispositionDeadline)}`
                      : ""}
                    {selected.dispositionNote && (
                      <span className="block text-xs text-gray-500">{selected.dispositionNote}</span>
                    )}
                  </dd>
                </>
              )}
              {selected.refundStatus && (
                <>
                  <dt className="text-gray-500">Refund Status</dt>
                  <dd className="text-gray-900">{selected.refundStatus}</dd>
                </>
              )}
              {selected.refundTransactionId && (
                <>
                  <dt className="text-gray-500">Txn ID</dt>
                  <dd className="text-gray-900 break-all">{selected.refundTransactionId}</dd>
                </>
              )}
            </dl>

            {/* The collection booked when this return was approved.
                Shown from approval onward, because before that there is
                nothing to collect and "not booked" would be noise. */}
            {["APPROVED", "PICKED_UP", "INSPECTED"].includes(selected.returnStatus) && (
              selected.reversePickupBooked ? (
                <div className="mt-4 rounded-lg border border-gray-200 px-3 py-2.5">
                  <p className="mb-1 shell-label">
                    Collection
                  </p>
                  <p className="text-sm text-gray-900">
                    {selected.reversePickupCarrier ?? "Courier booked"}
                    {selected.reversePickupAwb && (
                      <span className="text-gray-500">
                        {" · "}{selected.reversePickupAwb}
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-amber-900">
                    No collection booked
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    No rider is coming for this one. Arrange the pickup yourself,
                    or approve it again once the courier is reachable.
                  </p>
                </div>
              )
            )}

            <div className="mt-5 flex justify-end">{renderActions(selected)}</div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Returns & Refunds</h1>
        <p className="text-sm text-gray-500 mt-1">
          {totalElements} total
        </p>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-full w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shell-press ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).replace(/_/g, " ").toLowerCase()}
          </button>
        ))}
      </div>

      <div className="shell-panel overflow-hidden">
        <div className="overflow-x-auto">
          {/* Scrolls sideways on a phone - these columns do not fit one,
            and a squashed table is worse than one you swipe. */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Return ID", "Product", "Customer", "Reason", "Refund", "Status", "Requested", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left py-3 px-5 shell-label"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="py-4 px-5">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : loadFailed ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-sm text-gray-500">
                  Returns could not be loaded.{" "}
                  <button type="button" onClick={fetchReturns} className="font-semibold text-brand-600 hover:underline">
                    Try again
                  </button>
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                  No returns in {tab === "ALL" ? "any state" : tab.replace(/_/g, " ").toLowerCase()}
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr
                  key={r.returnId}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-5 text-sm font-mono text-gray-700">
                    <button onClick={() => setSelected(r)} className="hover:underline">
                      #{r.returnId}
                    </button>
                    {r.orderId != null && (
                      <span className="block text-[11px] text-gray-400">order #{r.orderId}</span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2 max-w-[220px]">
                      {r.productImage && (
                        <img
                          src={r.productImage}
                          alt=""
                          className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0"
                        />
                      )}
                      <div className="text-sm text-gray-900 truncate">
                        {r.productName ?? "—"}
                        <span className="block text-[11px] text-gray-400 truncate">
                          {[
                            r.variantSize && `Size ${r.variantSize}`,
                            r.variantColor && r.variantColor,
                            r.quantity != null && `qty ${r.quantity}`,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700">
                    <div className="truncate max-w-[180px]">{r.userName ?? `#${r.userId}`}</div>
                    {r.userEmail && (
                      <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{r.userEmail}</div>
                    )}
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700 max-w-[200px] truncate">
                    {r.reason ?? "—"}
                  </td>
                  <td className="py-4 px-5 text-sm font-semibold text-gray-900">
                    ₹{Number(r.refundAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        STATUS_STYLE[r.returnStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {r.returnStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-xs text-gray-500">
                    {formatDate(r.requestedAt)}
                  </td>
                  <td className="py-4 px-5">{renderActions(r)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {reviewing != null && (
        <RefundReviewPanel
          target={{ kind: "RETURN", returnId: reviewing }}
          onClose={() => setReviewing(null)}
          onDone={() => {
            fetchReturns();
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
