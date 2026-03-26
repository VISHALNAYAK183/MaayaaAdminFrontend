const BASE_URL = "http://localhost:8081/api/admin/products";

export interface ProductImage {
  url: string;
  postOrder: number;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface Variant {
  sizeId: number;
  colorId: number;
  quantity: number;
  barcode: string;
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

export const getProducts = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
  return { data: await response.json() };
};

export const getProductById = async (productId: number) => {
  const response = await fetch(`${BASE_URL}/${productId}`);
  if (!response.ok) throw new Error(`Failed to fetch product: ${response.status}`);
  return { data: await response.json() };
};

export const addProduct = async (data: Omit<Product, "productId">) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create product: ${response.status}`);
  return { data: await response.json() };
};

export const updateProduct = async (productId: number, data: Omit<Product, "productId">) => {
  const response = await fetch(`${BASE_URL}/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update product: ${response.status}`);
  return { data: await response.json() };
};

export const deleteProduct = async (productId: number) => {
  const response = await fetch(`${BASE_URL}/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Failed to delete product: ${response.status}`);
  return true;
};