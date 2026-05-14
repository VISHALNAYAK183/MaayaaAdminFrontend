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
  questionsAnswers: QuestionAnswer[];
  variants: Variant[];
  images: ProductImage[];
}

export const getProducts = async (): Promise<{ data: ProductResponse[] }> => {
  const raw = await http.get<ProductResponse[] | ProductResponse>(URL, "fetch products");
  return { data: Array.isArray(raw) ? raw : [raw] };
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
