// services/adminReview.ts

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081/api';

export interface Review {
  reviewId: number;
  userId: number;
  productId: number;
  stars: number;
  description: string;
  image: string;
  title: string;
}

export interface Product {
  productId: number;
  name: string;
  images: Array<{ url: string; postOrder: number }>;
  reviews: Review[];
}

export interface ProductsResponse {
  status: string;
  message: string;
  data: Product[];
}

export interface ProductWithReviewStats {
  productId: number;
  productName: string;
  productImage: string;
  totalReviews: number;
  averageRating: number;
  reviews: Review[];
}

export interface CategoryReviewStats {
  categoryId: number;
  categoryName: string;
  totalReviews: number;
  averageRating: number;
  productCount: number;
}

export interface DashboardStats {
  overallTotalReviews: number;
  overallAverageRating: number;
  mostReviewedProduct: ProductWithReviewStats | null;
  highestRatedProduct: ProductWithReviewStats | null;
  lowestRatedProduct: ProductWithReviewStats | null;
  categoryStats: CategoryReviewStats[];
  productStats: ProductWithReviewStats[];
}

class AdminReviewService {
  async fetchAllReviews(): Promise<Review[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  async fetchAllProducts(): Promise<Product[]> {
    try {
      const response = await axios.get<ProductsResponse>(`${API_BASE_URL}/admin/products`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getReviewDashboardData(): Promise<DashboardStats> {
    try {
      const [allReviews, allProducts] = await Promise.all([
        this.fetchAllReviews(),
        this.fetchAllProducts()
      ]);

      // Map reviews to products
      const productsWithReviews = allProducts.map(product => ({
        ...product,
        reviews: allReviews.filter(review => review.productId === product.productId)
      }));

      // Calculate product stats
      const productStats: ProductWithReviewStats[] = productsWithReviews.map(product => ({
        productId: product.productId,
        productName: product.name,
        productImage: product.images[0]?.url || '',
        totalReviews: product.reviews.length,
        averageRating: product.reviews.length > 0
          ? product.reviews.reduce((sum, review) => sum + review.stars, 0) / product.reviews.length
          : 0,
        reviews: product.reviews
      })).filter(product => product.totalReviews > 0); // Only products with reviews

      // Calculate overall stats
      const overallTotalReviews = productStats.reduce((sum, product) => sum + product.totalReviews, 0);
      const overallAverageRating = overallTotalReviews > 0
        ? productStats.reduce((sum, product) => sum + (product.averageRating * product.totalReviews), 0) / overallTotalReviews
        : 0;

      // Find most reviewed product
      const mostReviewedProduct = productStats.length > 0
        ? productStats.reduce((max, product) => product.totalReviews > max.totalReviews ? product : max, productStats[0])
        : null;

      // Find highest rated product (with at least 1 review)
      const highestRatedProduct = productStats.length > 0
        ? productStats.reduce((max, product) => product.averageRating > max.averageRating ? product : max, productStats[0])
        : null;

      // Find lowest rated product (with at least 1 review)
      const lowestRatedProduct = productStats.length > 0
        ? productStats.reduce((min, product) => product.averageRating < min.averageRating ? product : min, productStats[0])
        : null;

      // Group by category (simplified - in real app you'd have category mapping)
      const categoryMap = new Map<number, { name: string; totalReviews: number; totalRating: number; productCount: number }>();
      
      productsWithReviews.forEach(product => {
        if (product.reviews.length > 0) {
          const categoryId = product.categoryId || 0;
          const categoryName = this.getCategoryName(categoryId);
          
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              name: categoryName,
              totalReviews: 0,
              totalRating: 0,
              productCount: 0
            });
          }
          
          const stats = categoryMap.get(categoryId)!;
          stats.totalReviews += product.reviews.length;
          stats.totalRating += product.reviews.reduce((sum, review) => sum + review.stars, 0);
          stats.productCount++;
        }
      });
      
      const categoryStats: CategoryReviewStats[] = Array.from(categoryMap.entries()).map(([categoryId, stats]) => ({
        categoryId,
        categoryName: stats.name,
        totalReviews: stats.totalReviews,
        averageRating: stats.totalReviews > 0 ? stats.totalRating / stats.totalReviews : 0,
        productCount: stats.productCount
      }));

      return {
        overallTotalReviews,
        overallAverageRating,
        mostReviewedProduct,
        highestRatedProduct,
        lowestRatedProduct,
        categoryStats,
        productStats
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  private getCategoryName(categoryId: number): string {
    const categories: Record<number, string> = {
      1: 'Clothing',
      2: 'T-Shirts',
      3: 'Shirts',
      4: 'Jackets & Hoodies',
      5: 'Jeans',
      6: 'Accessories'
    };
    return categories[categoryId] || `Category ${categoryId}`;
  }

  async getProductReviews(productId: number): Promise<Review[]> {
    try {
      const allReviews = await this.fetchAllReviews();
      return allReviews.filter(review => review.productId === productId);
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  async getFilteredReviews(
    productId?: number,
    starFilter?: number,
    sortBy?: 'recent' | 'oldest' | 'rating_high' | 'rating_low',
    sentiment?: 'positive' | 'negative' | 'all'
  ): Promise<Review[]> {
    let reviews = await this.getProductReviews(productId || 0);
    
    // Filter by stars
    if (starFilter && starFilter > 0) {
      reviews = reviews.filter(review => review.stars === starFilter);
    }
    
    // Filter by sentiment
    if (sentiment && sentiment !== 'all') {
      if (sentiment === 'positive') {
        reviews = reviews.filter(review => review.stars >= 4);
      } else if (sentiment === 'negative') {
        reviews = reviews.filter(review => review.stars <= 2);
      }
    }
    
    // Sort reviews
    if (sortBy) {
      switch (sortBy) {
        case 'recent':
          reviews.sort((a, b) => b.reviewId - a.reviewId);
          break;
        case 'oldest':
          reviews.sort((a, b) => a.reviewId - b.reviewId);
          break;
        case 'rating_high':
          reviews.sort((a, b) => b.stars - a.stars);
          break;
        case 'rating_low':
          reviews.sort((a, b) => a.stars - b.stars);
          break;
      }
    }
    
    return reviews;
  }
}

export default new AdminReviewService();