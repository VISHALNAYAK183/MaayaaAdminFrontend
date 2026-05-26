import { useEffect, useState } from "react";
import {
  getProductAnalytics,
  type ProductAnalytics,
} from "../../api/analyticsApi";

interface Props {
  productId: number;
  productName?: string;
  onClose: () => void;
}

const currency = (n: number | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const number = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-IN");

export default function ProductAnalyticsModal({ productId, productName, onClose }: Props) {
  const [data, setData] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getProductAnalytics(productId);
        setData(res.data);
      } catch {
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  const margin = data?.profitMargin ?? 0;
  const marginTone =
    margin >= 30 ? "text-emerald-600" : margin >= 0 ? "text-amber-600" : "text-red-600";

  const stats: { label: string; value: string; tone?: string }[] = data
    ? [
        { label: "Units Sold",    value: number(data.unitsSold) },
        { label: "Revenue",       value: currency(data.revenue) },
        { label: "Cost",          value: currency(data.totalCost) },
        {
          label: "Profit",
          value: currency(data.profit),
          tone: Number(data.profit) >= 0 ? "text-emerald-600" : "text-red-600",
        },
        { label: "Profit Margin", value: margin.toFixed(2) + "%", tone: marginTone },
        { label: "Stock Left",    value: number(data.stockLeft) },
        {
          label: "Avg Rating",
          value: data.averageRating != null ? data.averageRating.toFixed(2) : "—",
        },
        { label: "Total Reviews", value: number(data.totalReviews) },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Product Analytics
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {data?.productName ?? productName ?? `#${productId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : error || !data ? (
          <p className="text-sm text-red-600">{error || "No data."}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {s.label}
                </p>
                <p className={`text-lg font-bold mt-1 ${s.tone ?? "text-gray-900 dark:text-white"}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
