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

  useEffect(() => {
    (async () => {
      try {
        const [dash, top, mostOrd] = await Promise.all([
          getAnalyticsDashboard(),
          getTopSellingProducts().catch(() => ({ data: [] as TopSellingProduct[] })),
          getMostOrderedProducts().catch(() => ({ data: [] as MostOrdered[] })),
        ]);
        setOverall(dash.data);
        setTopProducts(Array.isArray(top.data) ? top.data : []);
        setMostOrdered(Array.isArray(mostOrd.data) ? mostOrd.data : []);
      } catch {
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setRangeLoading(true);
    getAnalyticsProfit(range)
      .then((res) => setRangeData(res.data))
      .catch(() => setRangeData(null))
      .finally(() => setRangeLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !overall) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-sm text-red-700 dark:text-red-400">
        {error || "No analytics data."}
      </div>
    );
  }

  const overallKpis = [
    { label: "Total Revenue",       value: currency(overall.totalRevenue) },
    { label: "Total Cost",          value: currency(overall.totalCost) },
    {
      label: "Gross Profit",
      value: currency(overall.grossProfit),
      tone: Number(overall.grossProfit) >= 0 ? "good" : "bad",
    },
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

  const rangeKpis = rangeData
    ? [
        { label: "Revenue",       value: currency(rangeData.totalRevenue) },
        { label: "Cost",          value: currency(rangeData.totalCost) },
        {
          label: "Gross Profit",
          value: currency(rangeData.grossProfit),
          tone: Number(rangeData.grossProfit) >= 0 ? "good" : "bad",
        },
        { label: "Avg Order Value", value: currency(rangeData.averageOrderValue) },
        { label: "Orders",        value: number(rangeData.totalOrders) },
        { label: "Units Sold",    value: number(rangeData.totalProductsSold) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Home / Analytics — profit & sales
        </p>
      </div>

      {/* Overall KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
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
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            By Period
          </h2>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r.value
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rangeData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rangeKpis.map((k) => (
              <Card key={k.label} {...k} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No data for this range.</p>
        )}
      </section>

      {/* Top selling products */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Top Selling Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">Best sellers, ranked by units sold</p>
        </div>
        {topProducts.length === 0 ? (
          <p className="px-6 py-12 text-sm text-center text-gray-400">No data yet.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                {["#", "Product", "Units Sold", "Revenue", "Avg Selling Price", "Stock Left"].map((h) => (
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
              {topProducts.map((p, idx) => (
                <tr key={p.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-3 px-5 text-sm font-mono text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">
                    {p.productName}
                  </td>
                  <td className="py-3 px-5 text-sm font-semibold text-gray-900 dark:text-white">
                    {number(p.unitsSold)}
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">
                    {currency(p.revenue)}
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-900 dark:text-white">
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
        )}
      </section>

      {/* Most ordered raw */}
      {mostOrdered.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Most Ordered Products</h2>
            <p className="text-xs text-gray-500 mt-0.5">Raw order line count</p>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                {["#", "Product", "Total Ordered"].map((h) => (
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
              {mostOrdered.map((p, idx) => (
                <tr key={p.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-3 px-5 text-sm font-mono text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-5 text-sm font-medium text-gray-900 dark:text-white">
                    {p.product_name}
                  </td>
                  <td className="py-3 px-5 text-sm font-semibold text-gray-900 dark:text-white">
                    {number(p.total_ordered)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-2 ${
          tone === "good"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "bad"
            ? "text-red-600 dark:text-red-400"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
