export interface Order {
  order_id: number;
  amount: number;
  status: string;
  order_date: string;
}

export interface Product {
  product_id: number;
  name: string;
  description: string;
  category_id: number;
  collection_id: number;
  gender: string;
  base_price: number;
  discounted_price: number;
  image_url: string | null;
  quantity: number;
  price: number;
}

export interface OrderDetails {
  order: Order;
  shipping_address: any;
  products: Product[];
  shipment: any;
  timeline: any[];
  invoice: any;
}
export interface AdminOrder {
  order_id: number;
  amount: number;
  status: string;
}
