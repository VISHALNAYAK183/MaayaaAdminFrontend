import React, { useState, useEffect, useMemo } from 'react';
import adminReviewService, {
  DashboardStats,
  ProductWithReviewStats,
  Review,
} from '../api/adminReview';
import { API_BASE, CLIENT_API_BASE } from '../api/client';

const PRODUCTS_PER_PAGE = 10;
const REVIEWS_PER_PAGE = 6;

// Product images are served from the admin backend; review images from the user backend
const resolveUrl = (url: string | undefined | null, base: string) => {
  if (!url) return '';
  return url.startsWith('/') ? `${base}${url}` : url;
};

function StarRow({ count, filled }: { count: number; filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? '#FBBF24' : '#D1D5DB'} className="w-4 h-4">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex">
      {Array.from({ length: max }, (_, i) => (
        <StarRow key={i} count={i + 1} filled={i < Math.round(value)} />
      ))}
    </div>
  );
}

function RatingBar({ rating }: { rating: number }) {
  return (
    <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
      <div
        className="bg-yellow-400 rounded-full h-1.5 transition-all"
        style={{ width: `${(rating / 5) * 100}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  children,
  color,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          {children}
        </div>
        <div className={`${color} rounded-full p-3 shrink-0 ml-3`}>{icon}</div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Page {page + 1} of {totalPages}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const start = Math.max(0, Math.min(page - 2, totalPages - 5));
          const p = start + i;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 text-xs font-medium rounded-lg border transition-colors ${
                p === page
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {p + 1}
            </button>
          );
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function applyFilters(
  reviews: Review[],
  starFilter: number,
  sentiment: 'all' | 'positive' | 'negative',
  sortBy: 'recent' | 'oldest' | 'rating_high' | 'rating_low',
): Review[] {
  let out = [...reviews];
  if (starFilter > 0) out = out.filter((r) => r.stars === starFilter);
  if (sentiment === 'positive') out = out.filter((r) => r.stars >= 4);
  if (sentiment === 'negative') out = out.filter((r) => r.stars <= 2);
  switch (sortBy) {
    case 'recent':       out.sort((a, b) => b.reviewId - a.reviewId); break;
    case 'oldest':       out.sort((a, b) => a.reviewId - b.reviewId); break;
    case 'rating_high':  out.sort((a, b) => b.stars - a.stars); break;
    case 'rating_low':   out.sort((a, b) => a.stars - b.stars); break;
  }
  return out;
}

const ReviewDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);

  // Product table
  const [searchTerm, setSearchTerm] = useState('');
  const [productPage, setProductPage] = useState(0);

  // Review dialog
  const [dialogProduct, setDialogProduct] = useState<ProductWithReviewStats | null>(null);
  const [starFilter, setStarFilter] = useState(0);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'rating_high' | 'rating_low'>('recent');
  const [sentiment, setSentiment] = useState<'all' | 'positive' | 'negative'>('all');
  const [reviewPage, setReviewPage] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await adminReviewService.getReviewDashboardData();
        setDashboardData(data);
      } catch {
        setError('Failed to fetch review data. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reset product page when search changes
  useEffect(() => { setProductPage(0); }, [searchTerm]);

  // Reset review page when filters change
  useEffect(() => { setReviewPage(0); }, [starFilter, sortBy, sentiment, dialogProduct]);

  const filteredProducts = useMemo(() =>
    (dashboardData?.productStats ?? []).filter((p) =>
      p.productName.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [dashboardData, searchTerm],
  );

  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pagedProducts = filteredProducts.slice(
    productPage * PRODUCTS_PER_PAGE,
    (productPage + 1) * PRODUCTS_PER_PAGE,
  );

  const filteredReviews = useMemo(
    () => dialogProduct ? applyFilters(dialogProduct.reviews, starFilter, sentiment, sortBy) : [],
    [dialogProduct, starFilter, sentiment, sortBy],
  );
  const reviewTotalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const pagedReviews = filteredReviews.slice(
    reviewPage * REVIEWS_PER_PAGE,
    (reviewPage + 1) * REVIEWS_PER_PAGE,
  );

  const openDialog = (product: ProductWithReviewStats) => {
    setDialogProduct(product);
    setStarFilter(0);
    setSortBy('recent');
    setSentiment('all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading review data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-sm text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  const d = dashboardData!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor and analyse customer feedback across all products
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          label="Total Reviews"
          color="bg-blue-100 dark:bg-blue-900/30"
          icon={
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        >
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{d.overallTotalReviews}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">across {d.productStats.length} products</p>
        </StatCard>

        <StatCard
          label="Average Rating"
          color="bg-yellow-100 dark:bg-yellow-900/30"
          icon={
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
        >
          <div className="flex items-baseline gap-1 mt-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{d.overallAverageRating.toFixed(1)}</p>
            <span className="text-sm text-gray-400 dark:text-gray-500">/5</span>
          </div>
          <RatingBar rating={d.overallAverageRating} />
        </StatCard>

        <StatCard
          label="Most Reviewed"
          color="bg-purple-100 dark:bg-purple-900/30"
          icon={
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        >
          <p className="text-base font-semibold text-gray-900 dark:text-white mt-2 truncate">
            {d.mostReviewedProduct?.productName ?? 'N/A'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {d.mostReviewedProduct?.totalReviews ?? 0} reviews
          </p>
        </StatCard>

        <StatCard
          label="Highest Rated"
          color="bg-emerald-100 dark:bg-emerald-900/30"
          icon={
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          }
        >
          <p className="text-base font-semibold text-gray-900 dark:text-white mt-2 truncate">
            {d.highestRatedProduct?.productName ?? 'N/A'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Stars value={d.highestRatedProduct?.averageRating ?? 0} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {d.highestRatedProduct?.averageRating.toFixed(1) ?? '—'}
            </span>
          </div>
        </StatCard>

        <StatCard
          label="Lowest Rated"
          color="bg-red-100 dark:bg-red-900/30"
          icon={
            <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.904a3.61 3.61 0 01.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
          }
        >
          <p className="text-base font-semibold text-gray-900 dark:text-white mt-2 truncate">
            {d.lowestRatedProduct?.productName ?? 'N/A'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Stars value={d.lowestRatedProduct?.averageRating ?? 0} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {d.lowestRatedProduct?.averageRating.toFixed(1) ?? '—'}
            </span>
          </div>
        </StatCard>
      </div>

      {/* Category Performance */}
      {d.categoryStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Category Performance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Review metrics by product category</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {d.categoryStats.map((cat) => (
              <div key={cat.categoryId} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{cat.categoryName}</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{cat.productCount} products</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{cat.totalReviews}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">reviews</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Stars value={cat.averageRating} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat.averageRating.toFixed(1)}</span>
                    </div>
                    <div className="mt-1">
                      <RatingBar rating={cat.averageRating} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Review Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Product Review Summary</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} with reviews
            </p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search products…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reviews</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg Rating</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Distribution</th>
                <th className="py-3 px-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pagedProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                pagedProducts.map((product) => (
                  <tr key={product.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 overflow-hidden">
                          {product.productImage ? (
                            <img
                              src={resolveUrl(product.productImage, API_BASE)}
                              alt={product.productName}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : null}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                          {product.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                        {product.totalReviews}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <Stars value={product.averageRating} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 hidden md:table-cell">
                      <RatingBar rating={product.averageRating} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openDialog(product)}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View Reviews →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={productPage} totalPages={productTotalPages} onChange={setProductPage} />
      </div>

      {/* Reviews Dialog */}
      {dialogProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDialogProduct(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Dialog header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {dialogProduct.productName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {dialogProduct.totalReviews} reviews · {dialogProduct.averageRating.toFixed(1)} avg rating
                </p>
              </div>

              {/* Star distribution */}
              <div className="shrink-0 w-48 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = dialogProduct.reviews.filter((r) => r.stars === star).length;
                  const pct = dialogProduct.totalReviews > 0 ? (count / dialogProduct.totalReviews) * 100 : 0;
                  return (
                    <button
                      key={star}
                      onClick={() => setStarFilter(starFilter === star ? 0 : star)}
                      className={`flex items-center gap-1.5 w-full group rounded px-1 py-0.5 transition-colors ${starFilter === star ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-3">{star}</span>
                      <svg className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                        <div
                          className="bg-yellow-400 rounded-full h-1.5 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-5 text-right">{count}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setDialogProduct(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
              <select
                value={starFilter}
                onChange={(e) => setStarFilter(Number(e.target.value))}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value={0}>All Stars</option>
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>{s} Star{s !== 1 ? 's' : ''}</option>
                ))}
              </select>

              <select
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value as any)}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive (4–5★)</option>
                <option value="negative">Negative (1–2★)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="rating_high">Highest Rating</option>
                <option value="rating_low">Lowest Rating</option>
              </select>

              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 self-center">
                {filteredReviews.length} result{filteredReviews.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Review list */}
            <div className="flex-1 overflow-y-auto p-6">
              {pagedReviews.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
                  No reviews match the selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {pagedReviews.map((review) => (
                    <div
                      key={review.reviewId}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Stars value={review.stars} />
                          <span className="text-xs text-gray-400 dark:text-gray-500">User #{review.userId}</span>
                          {review.createdAt && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              · {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {review.title && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">{review.title}</p>
                        )}
                        {review.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{review.description}</p>
                        )}
                      </div>
                      {review.image && (
                        <img
                          src={resolveUrl(review.image, CLIENT_API_BASE)}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dialog pagination */}
            <Pagination page={reviewPage} totalPages={reviewTotalPages} onChange={setReviewPage} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDashboard;
