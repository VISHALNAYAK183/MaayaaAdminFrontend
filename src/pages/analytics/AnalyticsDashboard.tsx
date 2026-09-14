import { useEffect, useState } from "react";
import {
  getAnalyticsDashboard,
  getAnalyticsProfit,
  getTopSellingProducts,
  AnalyticsDashboard,
  AnalyticsProfit,
  AnalyticsRange,
  TopSellingProduct,
} from "../../api/analyticsApi";
import { getMostOrderedProducts } from "../../api/adminApi";

const currency = (n: number | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const number = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-IN");

interface MostOrdered {
  product_id: number;
  product_name: string;
  total_ordered: number;
}

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "DAY",   label: "Last 24h" },
  { value: "WEEK",  label: "Last 7 days" },
  { value: "MONTH", label: "Last 30 days" },
  { value: "ALL",   label: "All time" },
];

export default function AnalyticsDashboardPage() {
  const [overall, setOverall] = useState<AnalyticsDashboard | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("MONTH");
  const [rangeData, setRangeData] = useState<AnalyticsProfit | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [mostOrdered, setMostOrdered] = useState<MostOrdered[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Each kept apart from an empty answer. They all used to read as "no data",
  // which on an analytics page is a claim about the business, not the network.
  const [rangeFailed, setRangeFailed] = useState(false);
  const [topFailed, setTopFailed] = useState(false);
  const [mostOrderedFailed, setMostOrderedFailed] = useState(false);
  const [rangeAttempt, setRangeAttempt] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [dash, top, mostOrd] = await Promise.all([
          getAnalyticsDashboard(),
          getTopSellingProducts().catch(() => null),
          getMostOrderedProducts().catch(() => null),
        ]);
        setOverall(dash.data);
        setTopFailed(top === null);
        setTopProducts(top && Array.isArray(top.data) ? top.data : []);
        setMostOrderedFailed(mostOrd === null);
        setMostOrdered(mostOrd && Array.isArray(mostOrd.data) ? mostOrd.data : []);
      } catch {
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Ignore any answer that arrives after the range has changed. Without this,
    // picking "Last 7 days" then "All time" could let the slower 7-day response
    // land last and show 7-day revenue and profit under the "All time" tab.
    let current = true;
    setRangeLoading(true);
    setRangeFailed(false);
    getAnalyticsProfit(range)
      .then((res) => { if (current) setRangeData(res.data); })
      .catch(() => { if (current) { setRangeData(null); setRangeFailed(true); } })
      .finally(() => { if (current) setRangeLoading(false); });
    return () => { current = false; };
  }, [range, rangeAttempt]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !overall) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
        {error || "No analytics data."}
      </div>
    );
  }

  const overallKpis: CardProps[] = [
    { label: "Total Revenue",       value: currency(overall.totalRevenue) },
    { label: "Total Cost (COGS)",   value: currency(overall.totalCost) },
    {
      label: "Gross Profit",
      value: currency(overall.grossProfit),
      tone: Number(overall.grossProfit) >= 0 ? "good" : "bad",
    },
    { label: "Operating Expenses", value: currency(overall.totalExpenses) },
    {
      label: "Net Profit",
      value: currency(overall.netProfit),
      tone: Number(overall.netProfit) >= 0 ? "good" : "bad",
    },
    {
      label: "Net Margin",
      value: (overall.netMargin ?? 0).toFixed(2) + "%",
      tone: (overall.netMargin ?? 0) >= 0 ? "good" : "bad",
    },
    { label: "Avg Selling Price",   value: currency(overall.averageSellingPrice) },
    { label: "Avg Order Value",     value: currency(overall.averageOrderValue) },
    { label: "Total Orders",        value: number(overall.totalOrders) },
    { label: "Delivered Orders",    value: number(overall.deliveredOrders) },
    { label: "Units Sold",          value: number(overall.totalProductsSold) },
    {
      label: "Delivery Rate",
      value:
        overall.totalOrders > 0
          ? ((overall.deliveredOrders / overall.totalOrders) * 100).toFixed(1) + "%"
          : "—",
    },
  ];

  const rangeKpis: CardProps[] = rangeData
    ? [
        { label: "Revenue",       value: currency(rangeData.totalRevenue) },
        { label: "Cost (COGS)",   value: currency(rangeData.totalCost) },
        {
          label: "Gross Profit",
          value: currency(rangeData.grossProfit),
          tone: Number(rangeData.grossProfit) >= 0 ? "good" : "bad",
        },
        { label: "Operating Expenses", value: currency(rangeData.totalExpenses) },
        {
          label: "Net Profit",
          value: currency(rangeData.netProfit),
          tone: Number(rangeData.netProfit) >= 0 ? "good" : "bad",
        },
        {
          label: "Net Margin",
          value: (rangeData.netMargin ?? 0).toFixed(2) + "%",
          tone: (rangeData.netMargin ?? 0) >= 0 ? "good" : "bad",
        },
        { label: "Avg Selling Price", value: currency(rangeData.averageSellingPrice) },
        { label: "Avg Order Value", value: currency(rangeData.averageOrderValue) },
        { label: "Orders",        value: number(rangeData.totalOrders) },
        { label: "Units Sold",    value: number(rangeData.totalProductsSold) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Profit and sales
        </p>
      </div>

      {/* Overall KPIs */}
      <section>
        <h2 className="shell-label mb-3">
          Overall
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overallKpis.map((k) => (
            <Card key={k.label} {...k} />
          ))}
        </div>
      </section>

      {/* Range KPIs */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="shell-label">
            By Period
          </h2>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-full">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shell-press ${
                  range === r.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {rangeLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rangeData ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rangeKpis.map((k) => (
                <Card key={k.label} {...k} />
              ))}
            </div>

            {/* Shipping is shown apart from the figures above, and deliberately
                so: it is NOT inside Net Profit. Courier invoices are treated as
                already amortised per unit in product cost, so adding freight to
                the subtraction would either count it twice or reveal that it
                was never counted at all. Putting it beside the numbers rather
                than inside them is what makes that answerable. */}
            {rangeData.freightCharged != null && (
              <div className="shell-panel mt-4 p-4">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    What shipping cost
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Not included in Net Profit above
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="shell-label">
                      Courier charges
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {currency(rangeData.freightCharged)}
                    </p>
                  </div>
                  <div>
                    <p className="shell-label">
                      Spent on returned parcels
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {currency(rangeData.freightOnReturnedParcels ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="shell-label">
                      Parcels returned
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {number(rangeData.returnedToOriginCount ?? 0)}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 mt-3 max-w-2xl">
                  Compare this with your Shiprocket invoices and with what product
                  cost already allows for shipping. If product cost does not include
                  it, this is missing from Net Profit and should be subtracted.
                </p>
              </div>
            )}
            {Array.isArray(rangeData.expenseBreakdown) && rangeData.expenseBreakdown.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="shell-label">
                  Expense breakdown:
                </span>
                {rangeData.expenseBreakdown.map((b) => (
                  <span
                    key={b.category}
                    className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200"
                  >
                    <span className="font-semibold mr-1">{b.category}:</span>
                    {currency(b.amount)}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : rangeFailed ? (
          <p className="text-sm">
            <span className="text-red-600">These figures could not be loaded.</span>{" "}
            <button onClick={() => setRangeAttempt((n) => n + 1)} className="text-gray-500 underline hover:text-gray-700">
              Try again
            </button>
          </p>
        ) : (
          <p className="text-sm text-gray-400">No data for this range.</p>
        )}
      </section>

      {/* Top selling products */}
      <section className="shell-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">Top Selling Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">Best sellers, ranked by units sold</p>
        </div>
        {topFailed ? (
          <p className="px-6 py-12 text-sm text-center text-red-600">
            Top selling products could not be loaded. Reload the page to try again.
          </p>
        ) : topProducts.length === 0 ? (
          <p className="px-6 py-12 text-sm text-center text-gray-400">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Scrolls sideways on a phone - these columns do not fit one,
              and a squashed table is worse than one you swipe. */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["#", "Product", "Units Sold", "Revenue", "Avg Selling Price", "Stock Left"].map((h) => (
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
              {topProducts.map((p, idx) => (
                <tr key={p.productId} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-5 text-sm font-mono text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-5 text-sm font-medium text-gray-900">
                    {p.productName}
                  </td>
                  <td className="py-3 px-5 text-sm font-semibold text-gray-900">
                    {number(p.unitsSold)}
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-900">
                    {currency(p.revenue)}
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-900">
                    {currency(p.averageSellingPrice)}
                  </td>
                  <td className="py-3 px-5 text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.stockLeft === 0
                          ? "bg-red-100 text-red-700"
                          : p.stockLeft <= 5
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {number(p.stockLeft)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      {/* Most ordered raw. Hidden when there is nothing to show - but not when
        it failed to load, which used to make the whole section vanish. */}
      {mostOrderedFailed && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Most ordered products could not be loaded. Reload the page to try again.
        </p>
      )}
      {mostOrdered.length > 0 && (
        <section className="shell-panel overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[17.5px] font-semibold tracking-tight text-gray-900">Most Ordered Products</h2>
            <p className="text-xs text-gray-500 mt-0.5">Raw order line count</p>
          </div>
          <div className="overflow-x-auto">
            {/* Scrolls sideways on a phone - these columns do not fit one,
              and a squashed table is worse than one you swipe. */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["#", "Product", "Total Ordered"].map((h) => (
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
              {mostOrdered.map((p, idx) => (
                <tr key={p.product_id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-5 text-sm font-mono text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-5 text-sm font-medium text-gray-900">
                    {p.product_name}
                  </td>
                  <td className="py-3 px-5 text-sm font-semibold text-gray-900">
                    {number(p.total_ordered)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  );
}

interface CardProps {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
}

function Card({ label, value, tone }: CardProps) {
  return (
    <div className="shell-panel p-5">
      <p className="shell-label">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-2 ${
          tone === "good"
            ? "text-emerald-600"
            : tone === "bad"
            ? "text-red-600"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
