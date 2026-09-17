import { useReadOnly } from "../../hooks/useReadOnly";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  getAdminExchanges,
  approveOnlineQc,
  rejectOnlineQc,
  warehouseQcPass,
  warehouseQcFail,
  shipReplacement,
  markExchangePickedUp,
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
  // NO_STOCK belongs with pickup, not with closed. The server treats it as an
  // exchange still in flight — the item comes back and is inspected, and only
  // then is the refund issued. Filed under Closed it had no tab that showed it
  // and no buttons when it did, so the refund could never be reached: the
  // "no stock, so refund instead" half of the flow was unreachable.
  { key: "PICKUP",       label: "Pickup",       match: ["STOCK_RESERVED", "NO_STOCK", "PICKUP_PENDING", "PICKED_UP", "WAREHOUSE_QC_PENDING"] },
  { key: "REPLACEMENT",  label: "Replacement",  match: ["WAREHOUSE_QC_PASSED", "REPLACEMENT_SHIPPED"] },
  { key: "CLOSED",       label: "Closed",       match: ["COMPLETED", "REFUND_INITIATED", "REJECTED", "ONLINE_QC_REJECTED", "WAREHOUSE_QC_FAILED"] },
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
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<string>(() => {
    const wanted = searchParams.get("tab");
    return wanted && TABS.some((t) => t.key === wanted) ? wanted : "ALL";
  });
  // The bell and the landing page link here with a filter already chosen.
  useEffect(() => {
    const wanted = searchParams.get("tab");
    if (wanted && TABS.some((t) => t.key === wanted)) setTab(wanted);
  }, [searchParams]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminExchange | null>(null);

  // QC comment dialog state
  const [qcDialog, setQcDialog] = useState<{ id: number; action: QcAction } | null>(null);
  const [qcComment, setQcComment] = useState("");

  // Shipping a replacement now takes the same four details the order's own
  // parcel goes out with, so the customer can actually follow it.
  const [shipDialog, setShipDialog] = useState<number | null>(null);
  const [shipForm, setShipForm] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    estimatedDeliveryDate: "",
    bookWithCourier: true,
    weightKg: "",
    lengthCm: "",
    breadthCm: "",
    heightCm: "",
  });

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
      setLoadFailed(false);
    } catch {
      if (seq !== fetchSeq.current) return;
      setLoadFailed(true);
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

  const submitShip = async () => {
    if (shipDialog == null) return;
    setActionLoading(shipDialog);
    try {
      const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
      await shipReplacement(
        shipDialog,
        shipForm.bookWithCourier
          ? {
              bookWithCourier: true,
              weightKg: num(shipForm.weightKg),
              lengthCm: num(shipForm.lengthCm),
              breadthCm: num(shipForm.breadthCm),
              heightCm: num(shipForm.heightCm),
            }
          : {
              carrier: shipForm.carrier.trim() || undefined,
              trackingNumber: shipForm.trackingNumber.trim() || undefined,
              trackingUrl: shipForm.trackingUrl.trim() || undefined,
              estimatedDeliveryDate: shipForm.estimatedDeliveryDate || undefined,
            }
      );
      setShipDialog(null);
      await fetchExchanges();
      setSelected(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const runSimple = async (id: number, action: "pickedUp" | "complete", confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setActionLoading(id);
    try {
      if (action === "pickedUp") await markExchangePickedUp(id);
      else                       await completeExchange(id);
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
    const btn = "text-xs px-2.5 py-1.5 rounded-full font-medium disabled:opacity-50 transition-colors shell-press";

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
      e.exchangeStatus === "NO_STOCK" ||
      e.exchangeStatus === "PICKUP_PENDING" ||
      e.exchangeStatus === "PICKED_UP" ||
      e.exchangeStatus === "WAREHOUSE_QC_PENDING"
    ) {
      return (
        <div className="flex gap-1.5 flex-wrap">
          {/* The collection had nowhere to be recorded, so the customer heard
              nothing between "approved" and "checked". */}
          {!e.pickedUpAt && (
            <button
              onClick={() => runSimple(e.exchangeId, "pickedUp", "Mark this item as collected from the customer?")}
              disabled={busy}
              className={`${btn} bg-gray-900 hover:bg-gray-700 text-white`}
            >
              {busy ? "…" : "Mark picked up"}
            </button>
          )}
          {/* Inspection is of an item we have, so it waits for the pickup. The
              server refuses it before then too. */}
          {(e.pickedUpAt || e.exchangeStatus === "PICKED_UP" || e.exchangeStatus === "WAREHOUSE_QC_PENDING") && (
          <>
          <button
            onClick={() => openQcDialog(e.exchangeId, "warehousePass")}
            disabled={busy}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
            title={
              e.exchangeStatus === "NO_STOCK"
                ? "There is no replacement to send, so passing inspection issues the refund"
                : "Passing inspection releases the replacement to be shipped"
            }
          >
            {busy ? "…" : e.exchangeStatus === "NO_STOCK" ? "QC Pass — refund" : "Warehouse QC Pass"}
          </button>
          <button
            onClick={() => openQcDialog(e.exchangeId, "warehouseFail")}
            disabled={busy}
            className={`${btn} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`}
          >
            Warehouse QC Fail
          </button>
          </>
          )}
        </div>
      );
    }

    if (e.exchangeStatus === "WAREHOUSE_QC_PASSED") {
      return (
        <button
          onClick={() => {
            setShipForm({
              carrier: "",
              trackingNumber: "",
              trackingUrl: "",
              estimatedDeliveryDate: "",
              bookWithCourier: true,
              weightKg: "",
              lengthCm: "",
              breadthCm: "",
              heightCm: "",
            });
            setShipDialog(e.exchangeId);
          }}
          disabled={busy}
          className={`${btn} bg-gray-900 hover:bg-gray-700 text-white`}
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
          className={`${btn} bg-gray-900 hover:bg-gray-700 text-white`}
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
            className="shell-panel shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                {QC_LABEL[qcDialog.action]} — Exchange #{qcDialog.id}
              </h3>
              <button onClick={() => setQcDialog(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                ✕
              </button>
            </div>

            <label className="block text-xs font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-900 resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">{qcComment.length}/500</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setQcDialog(null)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 shell-press"
              >
                Cancel
              </button>
              <button
                onClick={submitQc}
                disabled={actionLoading === qcDialog.id}
                className="text-xs px-3 py-1.5 rounded-full font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 shell-press"
              >
                {actionLoading === qcDialog.id ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {/* Despatching a replacement. The same four fields the order's own parcel
          ships with — all optional, because a courier is sometimes booked
          before the number comes back, and a replacement that has gone out
          should not be blocked on paperwork. */}
      {shipDialog != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShipDialog(null)}
        >
          <div
            className="shell-panel shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Ship replacement
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              The customer sees the tracking on their order page, and gets it by email.
            </p>
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
              {[
                { value: true, label: "Book with Shiprocket" },
                { value: false, label: "Enter details by hand" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setShipForm({ ...shipForm, bookWithCourier: o.value })}
                  className={`flex-1 rounded-md px-2 py-1.5 font-medium ${shipForm.bookWithCourier === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {shipForm.bookWithCourier ? (
              <div className="space-y-2.5">
                <p className="text-xs text-gray-500">
                  Weigh and measure the packed parcel. The cheapest courier to this pin code is booked, and the
                  exchange completes by itself when the courier marks it delivered.
                </p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipForm.weightKg}
                  onChange={(ev) => setShipForm({ ...shipForm, weightKg: ev.target.value })}
                  placeholder="Weight (kg)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900"
                />
                <div className="grid grid-cols-3 gap-2">
                  {(["lengthCm", "breadthCm", "heightCm"] as const).map((k) => (
                    <input
                      key={k}
                      type="number"
                      min="0"
                      step="0.1"
                      value={shipForm[k]}
                      onChange={(ev) => setShipForm({ ...shipForm, [k]: ev.target.value })}
                      placeholder={k === "lengthCm" ? "Length cm" : k === "breadthCm" ? "Breadth cm" : "Height cm"}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900"
                    />
                  ))}
                </div>
              </div>
            ) : (
            <div className="space-y-2.5">
              <input
                value={shipForm.carrier}
                onChange={(ev) => setShipForm({ ...shipForm, carrier: ev.target.value })}
                placeholder="Carrier, e.g. Delhivery"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900"
              />
              <input
                value={shipForm.trackingNumber}
                onChange={(ev) => setShipForm({ ...shipForm, trackingNumber: ev.target.value })}
                placeholder="Tracking number"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900"
              />
              <input
                value={shipForm.trackingUrl}
                onChange={(ev) => setShipForm({ ...shipForm, trackingUrl: ev.target.value })}
                placeholder="Tracking link"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900"
              />
              <label className="block text-xs text-gray-500">
                Expected delivery
                <input
                  type="date"
                  value={shipForm.estimatedDeliveryDate}
                  onChange={(ev) => setShipForm({ ...shipForm, estimatedDeliveryDate: ev.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900"
                />
              </label>
            </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShipDialog(null)}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 shell-press"
              >
                Cancel
              </button>
              <button
                onClick={submitShip}
                disabled={actionLoading === shipDialog}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-900 hover:bg-gray-700 text-white disabled:opacity-50 shell-press"
              >
                {actionLoading === shipDialog ? "…" : "Ship replacement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && !qcDialog && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="shell-panel shadow-xl p-6 w-full max-w-lg mx-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
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
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{selected.productName}</p>
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
                  <dd className="text-gray-900">
                    {selected.userName ?? (selected.userId != null ? `#${selected.userId}` : "—")}
                    {selected.userEmail && (
                      <span className="block text-[11px] text-gray-400 truncate">{selected.userEmail}</span>
                    )}
                  </dd>
                </>
              )}
              <dt className="text-gray-500">Old variant</dt>
              <dd className="text-gray-900">
                {variantLabel(selected.oldVariantSize, selected.oldVariantColor, selected.oldVariantId)}
              </dd>
              <dt className="text-gray-500">New variant</dt>
              <dd className="text-gray-900">
                {variantLabel(selected.newVariantSize, selected.newVariantColor, selected.newVariantId)}
              </dd>
              <dt className="text-gray-500">Reason</dt>
              <dd className="text-gray-900">{selected.reason ?? "—"}</dd>
              <dt className="text-gray-500">Comments</dt>
              <dd className="text-gray-900">{selected.comments ?? "—"}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[selected.exchangeStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {selected.exchangeStatus.replace(/_/g, " ")}
                </span>
              </dd>
              <dt className="text-gray-500">Requested</dt>
              <dd className="text-gray-900">{formatDate(selected.requestedAt)}</dd>

              {selected.pickedUpAt && (
                <>
                  <dt className="text-gray-500">Picked up</dt>
                  <dd className="text-gray-900">{formatDate(selected.pickedUpAt)}</dd>
                </>
              )}

              {/* The replacement parcel, once it exists. */}
              {selected.replacementShippedAt && (
                <>
                  <dt className="text-gray-500">Replacement sent</dt>
                  <dd className="text-gray-900">
                    {formatDate(selected.replacementShippedAt)}
                  </dd>
                  <dt className="text-gray-500">Carrier</dt>
                  <dd className="text-gray-900">
                    {[selected.replacementCarrier, selected.replacementTrackingNumber]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </>
              )}

              {/* A failed item is held for a week. Whoever picks up the phone
                  needs to know the clock is running. */}
              {selected.dispositionStatus && (
                <>
                  <dt className="text-gray-500">Held item</dt>
                  <dd className="text-gray-900">
                    {selected.dispositionStatus.replace(/_/g, " ").toLowerCase()}
                    {/* Disposed automatically once the hold lapses, so the
                        deadline is when it went. */}
                    {selected.dispositionDeadline
                      ? `${selected.dispositionStatus === "DISPOSED" ? " · on" : " · until"} ${formatDate(selected.dispositionDeadline)}`
                      : ""}
                  </dd>
                </>
              )}

              {selected.onlineQcStatus && (
                <>
                  <dt className="text-gray-500">Online QC</dt>
                  <dd className="text-gray-900">{selected.onlineQcStatus}</dd>
                </>
              )}
              {selected.onlineQcComment && (
                <>
                  <dt className="text-gray-500">Online comment</dt>
                  <dd className="text-gray-900">{selected.onlineQcComment}</dd>
                </>
              )}
              {selected.warehouseQcStatus && (
                <>
                  <dt className="text-gray-500">Warehouse QC</dt>
                  <dd className="text-gray-900">{selected.warehouseQcStatus}</dd>
                </>
              )}
              {selected.warehouseQcComment && (
                <>
                  <dt className="text-gray-500">Warehouse comment</dt>
                  <dd className="text-gray-900">{selected.warehouseQcComment}</dd>
                </>
              )}
            </dl>

            {/* The garment coming back, not the replacement going out.
                Shown once stock is reserved, which is when the collection is
                booked - before that there is nothing to collect. */}
            {["STOCK_RESERVED", "PICKUP_PENDING", "PICKED_UP", "WAREHOUSE_QC_PENDING"]
              .includes(selected.exchangeStatus) && (
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
                    No rider is coming for the item being swapped. Arrange the
                    pickup yourself.
                  </p>
                </div>
              )
            )}

            <div className="mt-5 flex justify-end">{renderActions(selected)}</div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Exchanges</h1>
        <p className="text-sm text-gray-500 mt-1">Size and colour swaps</p>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-full w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shell-press ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
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
              {["Exchange", "Product", "Customer", "Old → New", "Reason", "Status", "Requested", "Actions"].map((h) => (
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
                  Exchanges could not be loaded.{" "}
                  <button type="button" onClick={fetchExchanges} className="font-semibold text-brand-600 hover:underline">
                    Try again
                  </button>
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                  No exchanges in this view
                </td>
              </tr>
            ) : (
              visible.map((e) => (
                <tr key={e.exchangeId} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-5 text-sm font-mono text-gray-700">
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
                          className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0"
                        />
                      )}
                      <div className="text-sm text-gray-900 truncate">
                        {e.productName ?? "—"}
                        {e.orderItemId != null && (
                          <span className="block text-[11px] text-gray-400">item #{e.orderItemId}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700">
                    <div className="truncate max-w-[180px]">{e.userName ?? (e.userId != null ? `#${e.userId}` : "—")}</div>
                    {e.userEmail && (
                      <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{e.userEmail}</div>
                    )}
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700">
                    <span>{variantLabel(e.oldVariantSize, e.oldVariantColor, e.oldVariantId)}</span>
                    <span className="mx-1 text-gray-400">→</span>
                    <span>{variantLabel(e.newVariantSize, e.newVariantColor, e.newVariantId)}</span>
                  </td>
                  <td className="py-4 px-5 text-sm text-gray-700 max-w-[200px] truncate">
                    {e.reason ?? "—"}
                  </td>
                  <td className="py-4 px-5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[e.exchangeStatus] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {e.exchangeStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-xs text-gray-500">
                    {formatDate(e.requestedAt)}
                  </td>
                  <td className="py-4 px-5">{renderActions(e)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Showing {visible.length} of {totalElements} matching exchange{totalElements === 1 ? "" : "s"}
      </p>
    </div>
  );
}
