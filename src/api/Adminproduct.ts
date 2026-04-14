const BASE_URL = "http://localhost:8081/api/admin/products";

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

// Shape returned by GET /products
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
  images: ProductImage[]; // kept for backward-compat
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

// Shape sent on POST / PUT
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
  images: ProductImage[]; // top-level images (send [] if unused)
}

export const getProducts = async (): Promise<{ data: ProductResponse[] }> => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
  const json = await response.json();
  const raw = json?.data ?? json;
  return { data: Array.isArray(raw) ? raw : [raw] };
};

export const getProductById = async (
  productId: number
): Promise<{ data: ProductResponse }> => {
  const response = await fetch(`${BASE_URL}/${productId}`);
  if (!response.ok) throw new Error(`Failed to fetch product: ${response.status}`);
  const json = await response.json();
  return { data: json?.data ?? json };
};

export const addProduct = async (data: Omit<Product, "productId">) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    throw new Error(errJson?.message || `Failed to create product: ${response.status}`);
  }
  const json = await response.json();
  return { data: json?.data ?? json };
};

export const updateProduct = async (
  productId: number,
  data: Omit<Product, "productId">
) => {
  const response = await fetch(`${BASE_URL}/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    throw new Error(errJson?.message || `Failed to update product: ${response.status}`);
  }
  const json = await response.json();
  return { data: json?.data ?? json };
};

export const deleteProduct = async (productId: number) => {
  const response = await fetch(`${BASE_URL}/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Failed to delete product: ${response.status}`);
  return true;
};