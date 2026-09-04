/**
 * Shapes of the admin order API, as it actually answers today.
 *
 * This file used to describe an order as {order_id, amount, status, order_date}
 * and a product as the catalogue row, and nothing imported it — both order
 * screens typed their data `any` and drifted. These are written from the
 * responses in AdminOrderService.
 */

/** A row of GET /api/admin/orders — snake_case, as that endpoint returns it. */
export interface AdminOrderRow {
  order_id: number;
  amount: number | null;
  status: string;
  order_date?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  pin_code?: string | null;
  /** What the ship button would do. Not a promise — it can be overridden. */
  suggested_route?: DeliveryRoute | null;
}

/** How a parcel leaves the building. */
export type DeliveryRoute = "LOCAL" | "SHIPROCKET" | "MANUAL";

/**
 * GET /orders/{id}/ship-options — asked before the ship dialog opens, so it
 * can show the route rather than demanding a tracking number for a parcel one
 * of us is about to drive across Udupi.
 */
export interface ShipOptions {
  orderId: number;
  status: string;
  suggestedRoute: DeliveryRoute;
  shiprocketEnabled: boolean;
  pinCode: string | null;
  city: string | null;
  state: string | null;
  localCarrier: string;
  /** Only set when the suggestion is LOCAL. */
  localEta: string | null;
}

export interface OrderPage {
  content: AdminOrderRow[];
  current_page: number;
  total_items: number;
  total_pages: number;
}

/** One line of an order. Cancelled lines are not in the parcel or the total. */
export interface OrderProduct {
  orderItemId: number;
  productId: number | null;
  name: string | null;
  quantity: number | null;
  price: number | null;
  imageUrl: string | null;
  itemStatus?: "ACTIVE" | "CANCELLED";
}

export interface OrderShipment {
  status: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery_date: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  /** Null on anything shipped before routing existed. */
  delivery_route?: DeliveryRoute | null;
}

/**
 * A timeline entry. Not every one is a status change: IN_TRANSIT, DELAYED and
 * DELIVERY_ATTEMPTED say where the parcel has got to while the order stays put.
 */
export interface ShipmentEventRow {
  status: string | null;
  description: string | null;
  location: string | null;
  event_time?: string | null;
  /** Older payloads sent this camelCased; both are read. */
  eventTime?: string | null;
}

export interface RefundRow {
  refundId: number;
  amount: number | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  method: string | null;
  gatewayRefundId: string | null;
  failureReason: string | null;
  refundedAt: string | null;
  createdAt: string | null;
}

/** GET /api/admin/orders/{id} — camelCase on the order, snake on the parcel. */
export interface OrderDetail {
  order: {
    orderId: number;
    status: string;
    amount: number | null;
    subtotal?: number | null;
    discount?: number | null;
    couponCode?: string | null;
    orderDate?: string | null;
  };
  products: OrderProduct[];
  refunds: RefundRow[];
  shipment: OrderShipment | null;
  timeline: ShipmentEventRow[];
}
