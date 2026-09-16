import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import {
  getProfitReport,
  type AnalyticsRange,
  type ProfitPanel,
  type ProfitReport,
} from "../../api/analyticsApi";
import { serverMessage } from "../../api/client";
import { count, rupees } from "../../lib/format";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "DAY", label: "Last 24h" },
  { value: "WEEK", label: "Last 7 days" },
  { value: "MONTH", label: "Last 30 days" },
  { value: "ALL", label: "All time" },
];

const plural = (n: number, one: string, many = one + "s") => `${count(n)} ${n === 1 ? one : many}`;

/** −₹167 rather than ₹-167. */
const signed = (value: number) => (value < 0 ? `−${rupees(-value)}` : rupees(value));

const tone = (value: number) => (value < 0 ? "text-red-600" : value > 0 ? "text-emerald-600" : "text-gray-900");

export default function AnalyticsDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const wanted = searchParams.get("range") as AnalyticsRange | null;
  const range: AnalyticsRange = RANGES.some((r) => r.value === wanted) ? (wanted as AnalyticsRange) : "MONTH";

  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(() => {
    // Only the answer for the range picked last is shown, however the responses arrive.
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    getProfitReport(range)
      .then((res) => {
        if (mine === seq.current) setReport(res.data);
      })
      .catch((err) => {
        if (mine === seq.current) setError(serverMessage(err, "The figures could not be loaded."));
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Profit as of today, and profit that is final</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-gray-100 p-1" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() => setSearchParams(r.value === "MONTH" ? {} : { range: r.value }, { replace: true })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all shell-press ${
                range === r.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      {!report && loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[30rem] animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : report ? (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Statement
              title="As of today"
              explainer="Prepaid orders count the day they are paid, cash on delivery the day it is delivered. A refund comes off the day it is paid."
              panel={report.asOfToday}
            />
            <Statement
              title="Settled"
              explainer={`Delivered orders whose ${report.returnWindowDays}-day return window has closed with nothing still open. These figures will not change.`}
              panel={report.settled}
              settled
            />
          </div>

          {report.expenseBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="shell-label">Operating expenses:</span>
              {report.expenseBreakdown.map((b) => (
                <span key={b.category} className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  <span className="mr-1 font-semibold">{b.category.replace(/_/g, " ").toLowerCase()}</span>
                  {rupees(b.amount)}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ProductTable
              title="Sold"
              subtitle="As of today: what counts as a sale, less what came back. Revenue is after coupons."
              headers={["Product", "Units", "Revenue", "Stock left"]}
              empty="Nothing sold in this period."
              rows={report.sold.map((p) => [
                p.name,
                count(p.units),
                rupees(p.revenue),
                p.stockLeft == null ? "—" : <StockChip key="s" left={p.stockLeft} />,
              ])}
            />
            <ProductTable
              title="Ordered"
              subtitle="Every order placed in this period that was not cancelled, including those still on the way."
              headers={["Product", "Units", "Orders"]}
              empty="No orders placed in this period."
              rows={report.ordered.map((p) => [p.name, count(p.units), count(p.orders)])}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Statement({
  title,
  explainer,
  panel,
  settled = false,
}: {
  title: string;
  explainer: string;
  panel: ProfitPanel;
  settled?: boolean;
}) {
  const s = panel.shipping;
  const notes: string[] = [];
  if (s.rtoEstimated > 0) {
    notes.push(`${plural(s.rtoEstimated, "RTO")} priced at the forward charge until the real return cost is entered on the order.`);
  }
  if (s.forwardMissing > 0) {
    notes.push(`${plural(s.forwardMissing, "shipped order")} with no shipping cost entered.`);
  }
  if (s.reverseMissing > 0) {
    notes.push(`${plural(s.reverseMissing, "collection")} with no cost recorded.`);
  }

  return (
    <section className="shell-panel flex flex-col p-5 sm:p-6">
      <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{explainer}</p>

      <dl className="mt-5 text-sm">
        <Line label="Sales" note={plural(panel.orders, "order")} value={panel.sales} />
        <Line label="Refunds" note={plural(panel.returnsRefunded, "return")} value={-panel.refunds} />
        <Line label="Revenue" value={panel.revenue} total />
        <Line label="Cost of goods" note="making cost of what was kept" value={-panel.cogs} />
        <Line label="Gross profit" value={panel.grossProfit} total />
        <Line label="Shipping" value={-s.total} />
        <div className="mb-2 space-y-1 border-l border-gray-200 pl-3 text-xs text-gray-500">
          <SubLine label="Forward" value={s.forward} />
          <SubLine label={s.rtoEstimated > 0 ? "RTO return legs (estimated)" : "RTO return legs"} value={s.rto} />
          <SubLine label="Collections" value={s.reverse} />
        </div>
        <Line label="Operating expenses" value={-panel.operatingExpenses} />
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-gray-200 pt-3">
          <dt className="font-semibold text-gray-900">Net profit</dt>
          <dd className="text-right">
            <span className={`text-2xl font-extrabold shell-num ${tone(panel.netProfit)}`}>{signed(panel.netProfit)}</span>
            <span className="block text-xs text-gray-500">
              {panel.netMargin == null ? "no revenue yet" : `${panel.netMargin.toFixed(1)}% of revenue`}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Units" value={count(panel.units)} />
        <Stat label="Avg order" value={panel.orders > 0 ? rupees(panel.averageOrderValue) : "—"} />
        <Stat
          label="RTO rate"
          value={panel.rtoRate == null ? "—" : `${panel.rtoRate}%`}
          note={panel.shipped > 0 ? `${panel.rtoCount} of ${plural(panel.shipped, "parcel")}` : undefined}
        />
        <Stat label="Collections" value={count(panel.reversePickups)} />
      </div>

      {settled && panel.awaitingOrders > 0 && (
        <p className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600">
          {plural(panel.awaitingOrders, "delivered order")} ({rupees(panel.awaitingSales)}) in this period are not final yet:
          still inside the return window, or with a return or exchange open.
        </p>
      )}
      {notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Line({ label, note, value, total = false }: { label: string; note?: string; value: number; total?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${total ? "border-t border-gray-100 font-semibold text-gray-900" : "text-gray-700"}`}>
      <dt>
        {label}
        {note && <span className="ml-2 text-xs font-normal text-gray-400">{note}</span>}
      </dt>
      <dd className={`whitespace-nowrap shell-num ${total ? tone(value) : ""}`}>{signed(value)}</dd>
    </div>
  );
}

function SubLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="shell-num">{rupees(value)}</span>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="shell-label">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-gray-900 shell-num">{value}</p>
      {note && <p className="text-[11px] text-gray-500">{note}</p>}
    </div>
  );
}

function StockChip({ left }: { left: number }) {
  const cls = left === 0 ? "bg-red-100 text-red-700" : left <= 5 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${cls}`}>{count(left)}</span>;
}

function ProductTable({
  title,
  subtitle,
  headers,
  rows,
  empty,
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  return (
    <section className="shell-panel overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                {headers.map((h, i) => (
                  <th key={h} className={`whitespace-nowrap px-5 py-3 shell-label ${i === 0 ? "text-left" : "text-right"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((cells, r) => (
                <tr key={r}>
                  {cells.map((c, i) => (
                    <td key={i} className={`px-5 py-3 ${i === 0 ? "font-medium text-gray-900" : "text-right text-gray-700 shell-num"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
