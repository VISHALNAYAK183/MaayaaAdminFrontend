  import { useState, useEffect } from "react";

  interface Variant {
    sizeId: number;
    colorId: number;
    quantity: number;
    barcode: string;
  }

  interface ProductImage {
    url: string;
    postOrder: number;
  }

  interface Product {
    productId: number;
    name: string;
    description?: string;
    categoryId?: number;
    collectionId?: number;
    gender: string;
    basePrice: number;
    discountedPrice: number;
    variants?: Variant[];
    images?: ProductImage[];
    sizes?: string[];
    colors?: { name: string; hex: string }[];
  }

  interface ApiResponse {
    status: string;
    message: string;
    data: Product[] | Product;
  }

  const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter states
    const [filters, setFilters] = useState({
      categoryId: "",
      gender: "",
      minBasePrice: "",
      maxBasePrice: "",
      minDiscountedPrice: "",
      maxDiscountedPrice: "",
    });

    useEffect(() => {
      fetchProducts();
    }, [currentPage]);

    const buildApiUrl = () => {
      const params = new URLSearchParams();
      params.append("limit", itemsPerPage.toString());
      params.append("offset", ((currentPage - 1) * itemsPerPage).toString());

      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.gender) params.append("gender", filters.gender);
      if (filters.minBasePrice)
        params.append("minBasePrice", filters.minBasePrice);
      if (filters.maxBasePrice)
        params.append("maxBasePrice", filters.maxBasePrice);
      if (filters.minDiscountedPrice)
        params.append("minDiscountedPrice", filters.minDiscountedPrice);
      if (filters.maxDiscountedPrice)
        params.append("maxDiscountedPrice", filters.maxDiscountedPrice);

      return `http://localhost:8081/api/admin/products?${params.toString()}`;
    };

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const url = buildApiUrl();
        console.log("Fetching products from:", url); // Debug log
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse = await response.json();
        console.log("API Response:", result); // Debug log

        if (result.status === "Y") {
          setProducts(Array.isArray(result.data) ? result.data : []);
        } else {
          console.error("API returned error:", result.message);
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchProductDetail = async (productId: number) => {
      try {
        const response = await fetch(
          `http://localhost:8081/api/admin/products/${productId}`
        );
        const result: ApiResponse = await response.json();
        if (result.status === "Y" && !Array.isArray(result.data)) {
          setSelectedProduct(result.data);
          setIsDetailModalOpen(true);
        }
      } catch (error) {
        console.error("Error fetching product detail:", error);
      }
    };

    const deleteProduct = async (productId: number) => {
      if (!confirm("Are you sure you want to delete this product?")) return;

      try {
        const response = await fetch(
          `http://localhost:8081/api/admin/products/${productId}`,
          {
            method: "DELETE",
          }
        );
        const result = await response.json();
        if (result.status === "Y") {
          alert("Product deleted successfully!");
          fetchProducts();
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Error deleting product");
      }
    };

    const applyFilters = () => {
      setCurrentPage(1);
      fetchProducts();
      setIsFilterModalOpen(false);
    };

    const clearFilters = () => {
      setFilters({
        categoryId: "",
        gender: "",
        minBasePrice: "",
        maxBasePrice: "",
        minDiscountedPrice: "",
        maxDiscountedPrice: "",
      });
      setCurrentPage(1);
      setTimeout(() => fetchProducts(), 0);
    };

    const handlePrevious = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };

    const handleNext = () => {
      if (products.length === itemsPerPage) {
        setCurrentPage(currentPage + 1);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Products
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Home / Products
              </p>
            </div>
            <button
              onClick={() => setIsForgotPasswordOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Reset Password
            </button>
          </div>

          {/* Products Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Products List
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage your product inventory
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Product
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filter
                  {(filters.gender ||
                    filters.categoryId ||
                    filters.minBasePrice ||
                    filters.maxBasePrice ||
                    filters.minDiscountedPrice ||
                    filters.maxDiscountedPrice) && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      Active
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Gender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Base Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Sale Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {products.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          No products found
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => {
                        const discount =
                          product.basePrice > 0
                            ? Math.round(
                                ((product.basePrice - product.discountedPrice) /
                                  product.basePrice) *
                                  100
                              )
                            : 0;
                        return (
                          <tr
                            key={product.productId}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                          >
                            <td className="px-6 py-4">
                              <input type="checkbox" className="rounded" />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                              #{product.productId}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                              {product.gender}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                              ₹{product.basePrice.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              ₹{product.discountedPrice.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              {discount > 0 && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                  {discount}% OFF
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setActiveDropdown(
                                      activeDropdown === product.productId
                                        ? null
                                        : product.productId
                                    )
                                  }
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                </button>
                                {activeDropdown === product.productId && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                    <button
                                      onClick={() => {
                                        fetchProductDetail(product.productId);
                                        setActiveDropdown(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                      </svg>
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        deleteProduct(product.productId);
                                        setActiveDropdown(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {products.length} products on page {currentPage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Page {currentPage}
                </span>
                <button
                  onClick={handleNext}
                  disabled={products.length < itemsPerPage}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {isAddModalOpen && (
          <AddProductModal
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => {
              setIsAddModalOpen(false);
              fetchProducts();
            }}
          />
        )}

        {isDetailModalOpen && selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedProduct(null);
            }}
          />
        )}

        {isFilterModalOpen && (
          <FilterModal
            filters={filters}
            setFilters={setFilters}
            onApply={applyFilters}
            onClear={clearFilters}
            onClose={() => setIsFilterModalOpen(false)}
          />
        )}

        {isForgotPasswordOpen && (
          <ForgotPasswordModal onClose={() => setIsForgotPasswordOpen(false)} />
        )}
      </div>
    );
  };

  // Filter Modal Component
  const FilterModal = ({
    filters,
    setFilters,
    onApply,
    onClear,
    onClose,
  }: any) => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Filter Products
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category ID
              </label>
              <input
                type="number"
                value={filters.categoryId}
                onChange={(e) =>
                  setFilters({ ...filters, categoryId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1, 2, 3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) =>
                  setFilters({ ...filters, gender: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Base Price (₹)
                </label>
                <input
                  type="number"
                  value={filters.minBasePrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minBasePrice: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Base Price (₹)
                </label>
                <input
                  type="number"
                  value={filters.maxBasePrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxBasePrice: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="3000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Sale Price (₹)
                </label>
                <input
                  type="number"
                  value={filters.minDiscountedPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minDiscountedPrice: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Sale Price (₹)
                </label>
                <input
                  type="number"
                  value={filters.maxDiscountedPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxDiscountedPrice: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClear}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
            >
              Clear
            </button>
            <button
              onClick={onApply}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Product Detail Modal
  const ProductDetailModal = ({ product, onClose }: any) => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full p-6 my-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Product Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Images */}
            <div>
              {product.images && product.images.length > 0 && (
                <div className="space-y-2">
                  {product.images.map((img: any, idx: number) => (
                    <img
                      key={idx}
                      src={img.url}
                      alt={product.name}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://via.placeholder.com/400x400?text=No+Image";
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {product.description}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    ₹{product.discountedPrice?.toLocaleString()}
                  </span>
                </div>
                {product.basePrice > product.discountedPrice && (
                  <div>
                    <span className="text-xl text-gray-500 line-through">
                      ₹{product.basePrice?.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    Product ID
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    #{product.productId}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Gender</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {product.gender}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    Category ID
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {product.categoryId}
                  </span>
                </div>
              </div>

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Available Sizes
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {product.sizes.map((size: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.colors && product.colors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Available Colors
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {product.colors.map((color: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border border-gray-300"
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {color.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.reviews && product.reviews.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Customer Reviews
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {product.reviews.map((review: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.stars
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {review.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {review.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add Product Modal
  const AddProductModal = ({ onClose, onSuccess }: any) => {
    const [formData, setFormData] = useState({
      name: "",
      description: "",
      categoryId: "",
      collectionId: "",
      gender: "Unisex",
      basePrice: "",
      discountedPrice: "",
      sizeId: "",
      colorId: "",
      quantity: "",
      barcode: "",
      imageUrl: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      // Validate required fields
      if (
        !formData.name ||
        !formData.description ||
        !formData.categoryId ||
        !formData.collectionId ||
        !formData.basePrice ||
        !formData.discountedPrice ||
        !formData.sizeId ||
        !formData.colorId ||
        !formData.quantity ||
        !formData.barcode
      ) {
        alert("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        categoryId: parseInt(formData.categoryId),
        collectionId: parseInt(formData.collectionId),
        gender: formData.gender,
        basePrice: parseFloat(formData.basePrice),
        discountedPrice: parseFloat(formData.discountedPrice),
        variants: [
          {
            sizeId: parseInt(formData.sizeId),
            colorId: parseInt(formData.colorId),
            quantity: parseInt(formData.quantity),
            barcode: formData.barcode,
          },
        ],
        images: formData.imageUrl
          ? [
              {
                url: formData.imageUrl,
                postOrder: 1,
              },
            ]
          : [],
      };

      try {
        const response = await fetch("http://localhost:8081/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === "Y") {
          alert("Product added successfully!");
          onSuccess();
        } else {
          alert("Failed to add product: " + (result.message || "Unknown error"));
        }
      } catch (error) {
        console.error("Error adding product:", error);
        alert(
          "Error adding product. Please check your connection and try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add New Product
            </h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Levis Jeans"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option>Unisex</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="A perfect high quality Leather jeans"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category ID
                </label>
                <input
                  type="number"
                  required
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Collection ID
                </label>
                <input
                  type="number"
                  required
                  value={formData.collectionId}
                  onChange={(e) =>
                    setFormData({ ...formData, collectionId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discounted Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.discountedPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, discountedPrice: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
                disabled={isSubmitting}
              />
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                Variant Information
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Size ID
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.sizeId}
                    onChange={(e) =>
                      setFormData({ ...formData, sizeId: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color ID
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.colorId}
                    onChange={(e) =>
                      setFormData({ ...formData, colorId: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Barcode
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 text-sm font-medium"
              >
                {isSubmitting ? "Adding..." : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Forgot Password Modal
  const ForgotPasswordModal = ({ onClose }: any) => {
    const [step, setStep] = useState<"email" | "reset">("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        const response = await fetch(
          "http://localhost:8081/api/auth/forgot-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }
        );
        const result = await response.json();
        if (result.message === "OTP sent to email") {
          alert("OTP sent to your email!");
          setStep("reset");
        } else {
          alert("Failed to send OTP");
        }
      } catch (error) {
        alert("Error sending OTP");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch(
          "http://localhost:8081/api/auth/reset-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
          }
        );
        const result = await response.json();
        if (result.message === "Password reset successful") {
          alert("Password reset successfully!");
          onClose();
        } else {
          alert("Failed to reset password");
        }
      } catch (error) {
        alert("Error resetting password");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {step === "email" ? "Forgot Password" : "Reset Password"}
            </h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 font-medium"
              >
                {isSubmitting ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter OTP"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 font-medium text-gray-700 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 font-medium"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  export default Products;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    