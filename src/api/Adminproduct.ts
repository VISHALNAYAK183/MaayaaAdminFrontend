import { ADMIN_BASE, http } from "./client";

const URL = `${ADMIN_BASE}/products`;

export interface ProductImage {
  variantId?: number;
  url: string;
  postOrder: number;
}

export interface VariantImage {
  url: string;
  postOrder: number;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface Variant {
  variantId?: number;
  sizeId: number;
  colorId: number;
  quantity: number;
  barcode: string;
  images: VariantImage[];
}

export interface ProductResponse {
  productId?: number;
  name: string;
  gender: string;
  basePrice: number;
  discountedPrice: number;
  status?: string;
  categoryId: number;
  collectionId: number;
  story: string | null;
  details: string | null;
  fabricDetails: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  images: ProductImage[];
  reviews: {
    stars: number;
    title: string;
    description: string;
    image: string;
  }[];
  questionsAnswers: QuestionAnswer[];
  variants: Variant[];
  sizes: string[];
  colors: { name: string; hex: string }[];
}

export interface Product {
  productId?: number;
  name: string;
  categoryId: number;
  collectionId: number;
  gender: string;
  basePrice: number;
  discountedPrice: number;
  story: string;
  details: string;
  fabricDetails: string;
  hsnCode: string;
  gstRate: number;
  questionsAnswers: QuestionAnswer[];
  variants: Variant[];
  images: ProductImage[];
}

export const getProducts = async (): Promise<{ data: ProductResponse[] }> => {
  const raw = await http.get<ProductResponse[] | ProductResponse>(URL, "fetch products");
  return { data: Array.isArray(raw) ? raw : [raw] };
};

export type ProductSortBy = "id" | "name" | "price" | "stock";
export type ProductStockFilter = "all" | "in" | "low" | "out";

export interface AdminProductListParams {
  categoryId?: number;     // omit for "all categories"
  collectionId?: number;
  gender?: string;
  name?: string;
  stock?: ProductStockFilter;
  sortBy?: ProductSortBy;
  sortDir?: "asc" | "desc";
  page?: number;           // 0-indexed
  size?: number;
}

export interface AdminProductListPage {
  items: ProductResponse[];
  total: number;
}

/**
 * Server-paged admin Products list.
 *
 * Unlike getProducts() above, this drives the admin Products page: every
 * filter, sort, and page is resolved on the server. The frontend no longer
 * downloads the full catalog and trims it in JS.
 */
export const getAdminProducts = async (
  params: AdminProductListParams = {},
): Promise<AdminProductListPage> => {
  const q = new URLSearchParams();
  if (params.categoryId != null && params.categoryId > 0)     q.set("categoryId", String(params.categoryId));
  if (params.collectionId != null && params.collectionId > 0) q.set("collectionId", String(params.collectionId));
  if (params.gender)                                          q.set("gender", params.gender);
  if (params.name && params.name.trim())                      q.set("name", params.name.trim());
  if (params.stock && params.stock !== "all")                 q.set("stock", params.stock);
  if (params.sortBy)                                          q.set("sortBy", params.sortBy);
  if (params.sortDir)                                         q.set("sortDir", params.sortDir);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));

  return await http.get<AdminProductListPage>(
    `${URL}/admin-list?${q.toString()}`,
    "fetch admin products",
  );
};

export const addProduct = async (body: Omit<Product, "productId">) => ({
  data: await http.post<ProductResponse>(URL, body, "create product"),
});

export const updateProduct = async (
  id: number,
  body: Omit<Product, "productId">
) => ({
  data: await http.put<ProductResponse>(`${URL}/${id}`, body, "update product"),
});

export const deleteProduct = (id: number) =>
  http.del(`${URL}/${id}`, "delete product");
