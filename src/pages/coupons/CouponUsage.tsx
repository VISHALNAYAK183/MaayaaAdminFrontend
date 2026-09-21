import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  getCouponUsage,
  getCouponUsageCustomers,
  type CouponState,
  type CouponUsageOverview,
  type CouponUsageRow,
  type CustomerCouponRow,
  type UsageFilter,
} from "../../api/couponUsageApi";
import { serverMessage } from "../../api/client";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import Pagination from "../../components/ui/Pagination";
import { ago, count, rupees } from "../../lib/format";

const PAGE_SIZE = 25;

type View = "coupons" | "customers";

const FILTERS: { value: UsageFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "LEFT", label: "Has uses left" },
  { value: "USED_UP", label: "Used up" },
  { value: "NOT_USED", label: "Not used yet" },
];

const STATE_LABEL: Record<CouponState, string> = {
  ACTIVE: "Active",
  SCHEDULED: "Not started",
  EXPIRED: "Expired",
  SWITCHED_OFF: "Switched off",
  DELETED: "Deleted",
};

const STATE_CLASS: Record<CouponState, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-gray-100 text-gray-600",
  SWITCHED_OFF: "bg-amber-100 text-amber-700",
  DELETED: "bg-red-100 text-red-700",
};

/** "2026-09-05" read as a calendar date, so no time zone can move it a day. */
const day = (ymd: string | null) => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const validity = (from: string | null, till: string | null) => {
  const a = day(from);
  const b = day(till);
  if (a && b) return `${a} – ${b}`;
  if (b) return `Until ${b}`;
  if (a) return `From ${a}`;
  return "Any time";
};

const discountText = (c: CouponUsageRow) => {
  const main = c.discountType === "P" ? `${c.value}% off` : `${rupees(c.value)} off`;
  const cap = c.discountType === "P" && c.maxDiscount ? ` up to ${rupees(c.maxDiscount)}` : "";
  return main + cap;
};

const limitText = (c: CouponUsageRow) => {
  if (c.limitVaries) return "Varies";
  if (c.audience === "CHOSEN" && c.assignedCustomers === 0) return "—";
  return c.limitPerCustomer == null ? "No limit" : `${c.limitPerCustomer} each`;
};

const uses = (n: number) => `${count(n)} ${n === 1 ? "use" : "uses"}`;

function StateChip({ state }: { state: CouponState }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_CLASS[state]}`}>
      {STATE_LABEL[state]}
    </span>
  );
}

function LeftChip({ row }: { row: CustomerCouponRow }) {
  if (row.access === "REMOVED") {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600" title="This coupon is for chosen customers, and they were taken off it.">
        No longer assigned
      </span>
    );
  }
  if (row.left == null) {
    return <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">No limit</span>;
  }
  if (row.left === 0) {
    return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Used up</span>;
  }
  return (
    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
      {row.left} left
    </span>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="shell-panel px-5 py-4">
      <p className="mb-1 shell-label">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 shell-num">{value}</p>
      {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

export default function CouponUsage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const view: View = searchParams.get("view") === "customers" ? "customers" : "coupons";
  const couponParam = Number(searchParams.get("coupon"));
  const couponId = Number.isInteger(couponParam) && couponParam > 0 ? couponParam : undefined;
  const filterParam = searchParams.get("filter") as UsageFilter | null;
  const filter: UsageFilter = FILTERS.some((f) => f.value === filterParam) ? (filterParam as UsageFilter) : "ALL";

  /**
   * Changes the address rather than local state, so a view can be shared or
   * bookmarked - and each change is its own history step, so Back walks back
   * through the tabs and coupons you opened instead of leaving the page.
   */
  const setParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // ---- overview: the totals and the per-coupon table ----------------------

  const [overview, setOverview] = useState<CouponUsageOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const loadOverview = useCallback(() => {
    setOverviewError(null);
    getCouponUsage()
      .then((res) => setOverview(res.data))
      .catch((err) => setOverviewError(serverMessage(err, "Coupon usage could not be loaded.")));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const [codeSearch, setCodeSearch] = useState("");
  const couponRows = useMemo(() => {
    const needle = codeSearch.trim().toLowerCase();
    return (overview?.coupons ?? []).filter((c) => !needle || c.code.toLowerCase().includes(needle));
  }, [overview, codeSearch]);

  const selectedCoupon = overview?.coupons.find((c) => c.couponId === couponId);

  // ---- customers: one row per customer and coupon -------------------------

  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedSearch = useDebouncedValue(customerSearch, 300);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<CustomerCouponRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const fetchSeq = useRef(0);

  // A new question starts at the first page.
  useEffect(() => {
    setPage(0);
  }, [couponId, filter, debouncedSearch]);

  const loadCustomers = useCallback(() => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setCustomersError(null);
    getCouponUsageCustomers({ couponId, q: debouncedSearch.trim() || undefined, filter, page, size: PAGE_SIZE })
      .then((res) => {
        if (seq !== fetchSeq.current) return;
        setRows(res.data.content);
        setTotal(res.data.totalElements);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => {
        if (seq !== fetchSeq.current) return;
        setCustomersError(serverMessage(err, "Customers could not be loaded."));
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false);
      });
  }, [couponId, debouncedSearch, filter, page]);

  useEffect(() => {
    if (view === "customers") loadCustomers();
  }, [view, loadCustomers]);

  const summary = overview?.summary;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Coupon usage</h1>
          <p className="mt-1 text-sm text-gray-500">Who used which coupon, and how many uses each customer has left</p>
        </div>
        <Link
          to="/coupons/add"
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shell-press"
        >
          Manage coupons
        </Link>
      </div>

      {overviewError && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{overviewError}</span>
          <button type="button" onClick={loadOverview} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile
          label="Coupons"
          value={summary ? count(summary.coupons) : "—"}
          note={
            summary
              ? `${summary.active} active · ${summary.scheduled} not started · ${summary.expired} expired` +
                (summary.switchedOff ? ` · ${summary.switchedOff} switched off` : "")
              : undefined
          }
        />
        <Tile
          label="Times used"
          value={summary ? count(summary.timesUsed) : "—"}
          note={summary && summary.usesGivenBack > 0 ? `${uses(summary.usesGivenBack)} given back after cancellations` : undefined}
        />
        <Tile label="Customers who used one" value={summary ? count(summary.customers) : "—"} />
        <Tile label="Discount given" value={summary ? rupees(summary.discountGiven) : "—"} note={summary ? "Cancelled orders left out" : undefined} />
      </div>

      <div className="mb-5 flex w-fit gap-1 rounded-full bg-gray-100 p-1">
        {(["coupons", "customers"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setParams({ view: v === "customers" ? "customers" : undefined })}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all shell-press ${
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v === "coupons" ? "By coupon" : "By customer"}
          </button>
        ))}
      </div>

      {view === "coupons" ? (
        <div className="shell-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">Every coupon</h2>
            <input
              value={codeSearch}
              onChange={(e) => setCodeSearch(e.target.value)}
              placeholder="Search by code"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 sm:w-64"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="whitespace-nowrap text-left shell-label">
                  <th className="px-4 py-3 font-medium">Coupon</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Valid</th>
                  <th className="px-4 py-3 font-medium">Who can use it</th>
                  <th className="px-4 py-3 font-medium">Limit per customer</th>
                  <th className="px-4 py-3 font-medium text-right">Times used</th>
                  <th className="px-4 py-3 font-medium text-right">Customers</th>
                  <th className="px-4 py-3 font-medium text-right">Discount given</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!overview && !overviewError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">Loading coupons…</td>
                  </tr>
                ) : couponRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">
                      {overviewError ? "Nothing to show until the coupons load." : codeSearch ? `No coupon matches "${codeSearch}".` : "No coupons yet."}
                    </td>
                  </tr>
                ) : (
                  couponRows.map((c) => (
                    <tr
                      key={c.couponId}
                      onClick={() => setParams({ view: "customers", coupon: String(c.couponId), filter: undefined })}
                      className="cursor-pointer hover:bg-gray-50"
                      title={`See who used ${c.code}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-gray-900">{c.code}</span>
                          <StateChip state={c.state} />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        <div>{discountText(c)}</div>
                        {c.minPurchase ? <div className="text-xs text-gray-500">on {rupees(c.minPurchase)}+</div> : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{validity(c.validFrom, c.validTill)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {c.audience === "EVERYONE"
                          ? "Everyone"
                          : `${count(c.assignedCustomers)} chosen ${c.assignedCustomers === 1 ? "customer" : "customers"}`}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{limitText(c)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 shell-num">{count(c.timesUsed)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 shell-num">
                        <div>{count(c.customersUsed)}</div>
                        {c.customersUsedUp > 0 ? <div className="text-xs text-gray-500">{count(c.customersUsedUp)} used up</div> : null}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 shell-num">{rupees(c.discountGiven)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{ago(c.lastUsedAt) ?? "Never"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="shell-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={couponId ?? ""}
                onChange={(e) => setParams({ coupon: e.target.value || undefined })}
                aria-label="Coupon"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">All coupons</option>
                {(overview?.coupons ?? []).map((c) => (
                  <option key={c.couponId} value={c.couponId}>
                    {c.code}
                    {c.state === "ACTIVE" ? "" : ` (${STATE_LABEL[c.state].toLowerCase()})`}
                  </option>
                ))}
              </select>
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search name, email or phone"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 sm:w-72"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => setParams({ filter: f.value === "ALL" ? undefined : f.value })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold shell-press ${
                    filter === f.value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {selectedCoupon?.audience === "EVERYONE" && (
              <p className="text-xs text-gray-500">
                <span className="font-mono font-semibold text-gray-700">{selectedCoupon.code}</span> is for every customer, so only
                customers who have used it are listed. Everyone else still has{" "}
                {selectedCoupon.limitPerCustomer == null ? "no limit" : uses(selectedCoupon.limitPerCustomer)}.
              </p>
            )}
            {!couponId && (
              <p className="text-xs text-gray-500">
                Coupons for everyone list only the customers who used them. Coupons for chosen customers list everyone they are for.
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="whitespace-nowrap text-left shell-label">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Coupon</th>
                  <th className="px-4 py-3 font-medium text-right">Used</th>
                  <th className="px-4 py-3 font-medium text-right">Limit</th>
                  <th className="px-4 py-3 font-medium">Left</th>
                  <th className="px-4 py-3 font-medium text-right">Discount given</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Loading customers…</td>
                  </tr>
                ) : customersError ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                      {customersError}{" "}
                      <button type="button" onClick={loadCustomers} className="font-semibold text-brand-600 hover:underline">
                        Try again
                      </button>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                      {debouncedSearch
                        ? `No customer matches "${debouncedSearch}".`
                        : filter !== "ALL"
                          ? `No customers under "${FILTERS.find((f) => f.value === filter)?.label}".`
                          : "No customer has used a coupon yet."}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={`${r.couponId}:${r.userId}`} className={loading ? "opacity-60" : undefined}>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${r.userId}`)}
                          className="text-left font-medium text-gray-900 hover:underline"
                        >
                          {r.name || `Customer ${r.userId}`}
                        </button>
                        <div className="text-xs text-gray-500">{r.email || r.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-gray-800">{r.code}</span>
                          {r.couponState !== "ACTIVE" && <StateChip state={r.couponState} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 shell-num">{count(r.used)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 shell-num">
                        {r.access === "REMOVED" ? "—" : r.limit == null ? "No limit" : count(r.limit)}
                      </td>
                      <td className="px-4 py-3">
                        <LeftChip row={r} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 shell-num">{r.used > 0 ? rupees(r.discountGiven) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{ago(r.lastUsedAt) ?? "Not yet"}</td>
                      <td className="px-4 py-3">
                        {r.orderIds.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {r.orderIds.slice(0, 3).map((id) => (
                              <Link key={id} to={`/orders/${id}`} className="font-medium text-brand-600 hover:underline shell-num">
                                #{id}
                              </Link>
                            ))}
                            {r.orderIds.length > 3 && <span className="text-xs text-gray-500">+{r.orderIds.length - 3} more</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!customersError && total > 0 && (
            <div className="border-t border-gray-100 px-5 py-2 text-xs text-gray-500">
              {count(total)} {total === 1 ? "row" : "rows"}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
