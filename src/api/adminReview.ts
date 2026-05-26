import axios from "axios";
import { API_BASE } from "./client";

const API_BASE_URL = `${API_BASE}/api`;

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
export type ReviewSort = "recent" | "oldest" | "highest" | "lowest";

export interface Review {
  reviewId: number;
  userId: number;
  productId: number;
  stars: number;
  description: string;
  image: string;
  title: string;
  updatedAt?: string;
  status?: ReviewStatus;
}

export interface PageResp<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ReviewListParams {
  productId?: number;
  rating?: number;
  status?: ReviewStatus;
  sort?: ReviewSort;
  page?: number;
  size?: number;
}

export interface ProductReviewStats {
  productId: number;
  productName: string;
  productImage: string;
  totalReviews: number;
  averageRating: number;
}

export interface CategoryReviewStats {
  categoryId: number;
  categoryName: string;
  totalReviews: number;
  productCount: number;
  averageRating: number;
}

export interface ReviewDashboard {
  overallTotalReviews: number;
  overallAverageRating: number;
  mostReviewedProduct: ProductReviewStats | null;
  highestRatedProduct: ProductReviewStats | null;
  lowestRatedProduct: ProductReviewStats | null;
  categoryStats: CategoryReviewStats[];
  productStats: ProductReviewStats[];
}

export const getReviews = (params: ReviewListParams = {}) =>
  axios.get<PageResp<Review>>(`${API_BASE_URL}/reviews`, { params });

export const getReviewDashboard = () =>
  axios.get<ReviewDashboard>(`${API_BASE_URL}/reviews/dashboard`);

export const getPendingReviews = () =>
  axios.get<Review[]>(`${API_BASE_URL}/reviews/pending`);

export const moderateReview = (reviewId: number, status: ReviewStatus) =>
  axios.put(`${API_BASE_URL}/reviews/${reviewId}/moderate`, { status });
