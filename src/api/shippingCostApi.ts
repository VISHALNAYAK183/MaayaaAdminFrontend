import { ADMIN_BASE, apiClient } from "./client";

/** RECORDED: from the booking or entered. NOT_ENTERED: no figure yet. ESTIMATE: an RTO priced at the forward leg. */
export type CostSource = "RECORDED" | "NOT_ENTERED" | "ESTIMATE";

export interface CostLeg {
  amount: number;
  source: CostSource;
}

export interface PickupLeg extends CostLeg {
  reversePickupId: number;
  kind: "RETURN" | "EXCHANGE" | string;
  status: string;
  at: string | null;
}

export interface ShippingCost {
  orderId: number;
  route: "LOCAL" | "SHIPROCKET" | "MANUAL" | null;
  carrier: string | null;
  shipped: boolean;
  /** null until the order ships. */
  forward: CostLeg | null;
  /** null unless the parcel came back undelivered. */
  rto: CostLeg | null;
  pickups: PickupLeg[];
  total: number;
}

const base = (orderId: number) => `${ADMIN_BASE}/orders/${orderId}/shipping-cost`;

export const getShippingCost = (orderId: number) => apiClient.get<ShippingCost>(base(orderId));

/** amount null clears the figure (for an RTO, back to the estimate). */
export const setForwardCost = (orderId: number, amount: number | null) =>
  apiClient.put<ShippingCost>(`${base(orderId)}/forward`, { amount });

export const setRtoCost = (orderId: number, amount: number | null) =>
  apiClient.put<ShippingCost>(`${base(orderId)}/rto`, { amount });

export const setPickupCost = (orderId: number, reversePickupId: number, amount: number | null) =>
  apiClient.put<ShippingCost>(`${base(orderId)}/pickups/${reversePickupId}`, { amount });
