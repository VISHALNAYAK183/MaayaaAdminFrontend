import React, { useState, useEffect } from 'react';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ShoppingBag as ShoppingBagIcon,
  People as PeopleIcon,
  RateReview as RateReviewIcon,
  ChevronRight as ChevronRightIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import adminReviewService, { 
  DashboardStats, 
  ProductWithReviewStats,
  Review,
  CategoryReviewStats
} from '../api/adminReview';

const ReviewDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedProductReviews, setSelectedProductReviews] = useState<Review[]>([]);
  const [starFilter, setStarFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'rating_high' | 'rating_low'>('recent');
  const [sentimentFilter, setSentimentFilter] = useState<'positive' | 'negative' | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedProductForDialog, setSelectedProductForDialog] = useState<ProductWithReviewStats | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedProduct !== null) {
      fetchFilteredReviews();
    }
  }, [selectedProduct, starFilter, sortBy, sentimentFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminReviewService.getReviewDashboardData();
      setDashboardData(data);
      if (data.productStats.length > 0) {
        setSelectedProduct(data.productStats[0].productId);
      }
      setError('');
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredReviews = async () => {
    if (selectedProduct === null) return;
    try {
      const reviews = await adminReviewService.getFilteredReviews(
        selectedProduct,
        starFilter,
        sortBy,
        sentimentFilter
      );
      setSelectedProductReviews(reviews);
    } catch (err) {
      console.error('Error fetching filtered reviews:', err);
    }
  };

  const handleViewAllReviews = (product: ProductWithReviewStats) => {
    setSelectedProductForDialog(product);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProductForDialog(null);
  };

  const getStarPercentage = (rating: number) => {
    return (rating / 5) * 100;
  };

  const filteredProducts = dashboardData?.productStats.filter(product =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading review data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Review Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and analyze customer feedback across all products</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData?.overallTotalReviews || 0}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center">
                  <TrendingUpIcon className="w-3 h-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <RateReviewIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <div className="flex items-center mt-2">
                  <p className="text-3xl font-bold text-gray-900">{dashboardData?.overallAverageRating.toFixed(1) || '0.0'}</p>
                  <StarIcon className="w-6 h-6 text-yellow-400 ml-2" />
                </div>
                <div className="mt-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 rounded-full h-2" 
                      style={{ width: `${getStarPercentage(dashboardData?.overallAverageRating || 0)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <StarIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Reviewed</p>
                <p className="text-lg font-semibold text-gray-900 mt-2 truncate max-w-[150px]">
                  {dashboardData?.mostReviewedProduct?.productName || 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData?.mostReviewedProduct?.totalReviews || 0} reviews
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <ShoppingBagIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Highest Rated</p>
                <p className="text-lg font-semibold text-gray-900 mt-2 truncate max-w-[150px]">
                  {dashboardData?.highestRatedProduct?.productName || 'N/A'}
                </p>
                <div className="flex items-center mt-1">
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-600 ml-1">
                    {dashboardData?.highestRatedProduct?.averageRating.toFixed(1) || '0.0'}
                  </span>
                </div>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <ThumbUpIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Category Performance</h2>
            <p className="text-sm text-gray-600 mt-1">Review metrics by product category</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData?.categoryStats.map((category) => (
                <div key={category.categoryId} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{category.categoryName}</h3>
                    <span className="text-xs text-gray-500">{category.productCount} products</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{category.totalReviews}</p>
                      <p className="text-xs text-gray-500">reviews</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center">
                        <StarIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-700 ml-1">{category.averageRating.toFixed(1)}</span>
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-yellow-400 rounded-full h-1.5" 
                          style={{ width: `${getStarPercentage(category.averageRating)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Review Summary Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Product Review Summary</h2>
                <p className="text-sm text-gray-600 mt-1">Detailed review metrics for all products</p>
              </div>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Product</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Total Reviews</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Average Rating</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Rating Distribution</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.productImage}
                          alt={product.productName}
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                          }}
                        />
                        <span className="font-medium text-gray-900">{product.productName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.totalReviews} reviews
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <StarIcon className="w-4 h-4 text-yellow-400" />
                        <span className="ml-1 text-sm font-medium text-gray-900">{product.averageRating.toFixed(1)}</span>
                        <span className="ml-1 text-xs text-gray-500">/5</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 rounded-full h-2" 
                          style={{ width: `${getStarPercentage(product.averageRating)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleViewAllReviews(product)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <VisibilityIcon className="w-4 h-4 mr-1" />
                        View Reviews
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Dialog */}
      {dialogOpen && selectedProductForDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Reviews for {selectedProductForDialog.productName}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedProductForDialog.totalReviews} total reviews • {selectedProductForDialog.averageRating.toFixed(1)} average rating
                </p>
              </div>
              <button
                onClick={handleCloseDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={starFilter}
                  onChange={(e) => setStarFilter(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>All Stars</option>
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
                
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Reviews</option>
                  <option value="positive">Positive (4-5★)</option>
                  <option value="negative">Negative (1-2★)</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="rating_high">Highest Rating</option>
                  <option value="rating_low">Lowest Rating</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedProductReviews.length > 0 ? (
                  selectedProductReviews.map((review) => (
                    <div key={review.reviewId} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={`w-4 h-4 ${i < review.stars ? 'text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">User #{review.userId}</span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                          <p className="text-sm text-gray-600">{review.description}</p>
                          <p className="text-xs text-gray-400 mt-2">Review ID: {review.reviewId}</p>
                        </div>
                        {review.image && (
                          <img
                            src={review.image}
                            alt="Review"
                            className="w-16 h-16 rounded-lg object-cover ml-4"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No reviews found with the selected filters.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDashboard;