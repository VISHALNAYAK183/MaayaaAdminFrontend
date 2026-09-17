import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { InboxItem } from "../api/overviewApi";
import { ago, rupees } from "../lib/format";
import {
  AlertIcon,
  BoxIcon,
  CheckIcon,
  PhoneIcon,
  ReturnIcon,
  RupeeIcon,
  StarIcon,
  SwapIcon,
  TruckIcon,
  WarehouseIcon,
} from "./shellIcons";

/**
 * How each thing the server says is waiting reads to a person: what it is,
 * where it is dealt with, and the verb on its button. The server sends counts
 * and keys; the words live here.
 */
type Copy = {
  title: (n: number) => string;
  icon: React.ReactNode;
  action: string;
  href: (item: InboxItem) => string;
  detail: (item: InboxItem) => string | null;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const oldest = (verb: string) => (item: InboxItem) => {
  const when = ago(item.oldestAt);
  const sample = item.samples[0];
  if (!when && !sample) return null;
  return [when && `Oldest ${verb} ${when}`, sample].filter(Boolean).join(" · ");
};

const total = (item: InboxItem) => (item.amount != null ? `${rupees(item.amount)} in total` : null);

const COPY: Record<string, Copy> = {
  "orders.confirm": {
    title: (n) => plural(n, "Cash order to confirm by phone", "Cash orders to confirm by phone"),
    icon: <PhoneIcon />,
    action: "Call",
    href: () => "/orders?status=REQUESTED",
    detail: oldest("waiting since"),
  },
  "orders.ship": {
    title: (n) => plural(n, "Order to ship", "Orders to ship"),
    icon: <TruckIcon />,
    action: "Ship",
    href: () => "/orders?status=PLACED",
    detail: oldest("placed"),
  },
  "returns.approve": {
    title: (n) => plural(n, "Return to check", "Returns to check"),
    icon: <ReturnIcon />,
    action: "Check",
    href: () => "/returns?status=REQUESTED",
    detail: oldest("asked"),
  },
  "returns.pickup": {
    title: (n) => plural(n, "Return waiting for pickup", "Returns waiting for pickup"),
    icon: <TruckIcon />,
    action: "Open",
    href: () => "/returns?status=APPROVED",
    detail: oldest("asked"),
  },
  "returns.inspect": {
    title: (n) => plural(n, "Return to inspect at the warehouse", "Returns to inspect at the warehouse"),
    icon: <WarehouseIcon />,
    action: "Inspect",
    href: () => "/returns?status=PICKED_UP",
    detail: oldest("asked"),
  },
  "orders.rto": {
    title: (n) => plural(n, "Parcel coming back undelivered", "Parcels coming back undelivered"),
    icon: <AlertIcon />,
    action: "Open",
    href: (item) => (item.count === 1 && item.samples.length === 1 ? `/orders/${item.samples[0].replace("#", "")}` : "/orders?status=SHIPPED"),
    detail: oldest("since"),
  },
  "payments.unmatched": {
    title: (n) => plural(n, "Payment with no order", "Payments with no order"),
    icon: <RupeeIcon />,
    action: "Settle",
    href: () => "/refunds",
    detail: total,
  },
  "refunds.review": {
    title: (n) => plural(n, "Cancelled order refund to review", "Cancelled order refunds to review"),
    icon: <RupeeIcon />,
    action: "Review",
    href: () => "/refunds",
    detail: total,
  },
  "returns.refund-approve": {
    title: (n) => plural(n, "Return refund to review", "Return refunds to review"),
    icon: <RupeeIcon />,
    action: "Review",
    href: () => "/refunds",
    detail: total,
  },
  "returns.refund-pay": {
    title: (n) => plural(n, "Refund to pay", "Refunds to pay"),
    icon: <RupeeIcon />,
    action: "Pay",
    href: () => "/returns?status=REFUND_APPROVED",
    detail: total,
  },
  "exchanges.check": {
    title: (n) => plural(n, "Exchange to check online", "Exchanges to check online"),
    icon: <SwapIcon />,
    action: "Check",
    href: () => "/exchanges?tab=PENDING_QC",
    detail: oldest("asked"),
  },
  "exchanges.pickup": {
    title: (n) => plural(n, "Exchange waiting for pickup", "Exchanges waiting for pickup"),
    icon: <TruckIcon />,
    action: "Open",
    href: () => "/exchanges?tab=PICKUP",
    detail: oldest("asked"),
  },
  "exchanges.inspect": {
    title: (n) => plural(n, "Exchange to inspect at the warehouse", "Exchanges to inspect at the warehouse"),
    icon: <WarehouseIcon />,
    action: "Inspect",
    href: () => "/exchanges?tab=PICKUP",
    detail: oldest("asked"),
  },
  "exchanges.no-stock": {
    title: (n) => plural(n, "Exchange with no replacement in stock", "Exchanges with no replacement in stock"),
    icon: <SwapIcon />,
    action: "Resolve",
    href: () => "/exchanges?tab=PICKUP",
    detail: () => "Refund once the item is back and inspected",
  },
  "exchanges.ship": {
    title: (n) => plural(n, "Replacement to ship", "Replacements to ship"),
    icon: <TruckIcon />,
    action: "Ship",
    href: () => "/exchanges?tab=REPLACEMENT",
    detail: oldest("asked"),
  },
  "reviews.moderate": {
    title: (n) => plural(n, "Photo review to moderate", "Photo reviews to moderate"),
    icon: <StarIcon />,
    action: "Moderate",
    href: () => "/reviews?status=PENDING",
    detail: oldest("written"),
  },
  "refunds.failed": {
    title: (n) => plural(n, "Refund failed", "Refunds failed"),
    icon: <AlertIcon />,
    action: "Open",
    href: (item) => (item.samples.length === 1 ? `/orders/${item.samples[0].replace("#", "")}` : "/orders"),
    detail: (item) => [item.samples.join(", "), total(item)].filter(Boolean).join(" · ") || null,
  },
  "stock.out": {
    title: () => "Out of stock",
    icon: <BoxIcon />,
    action: "Open",
    href: () => "/stock?filter=OUT",
    detail: (item) => sampleList(item, "variant"),
  },
  "stock.low": {
    title: () => "Running low",
    icon: <BoxIcon />,
    action: "Open",
    href: () => "/stock?filter=LOW",
    detail: (item) => sampleList(item, "variant"),
  },
};

function sampleList(item: InboxItem, noun: string) {
  const more = item.count - item.samples.length;
  const list = item.samples.join(", ");
  return more > 0 ? `${list} and ${more} more ${plural(more, noun, noun + "s")}` : list || null;
}

export const copyFor = (item: InboxItem): Copy =>
  COPY[item.key] ?? {
    title: () => item.key,
    icon: <AlertIcon />,
    action: "Open",
    href: () => "/",
    detail: () => null,
  };

/** Work counts in full; an alert is one thing to look at, however many variants it covers. */
export const badgeCount = (items: InboxItem[]) =>
  items.reduce((n, item) => n + (item.kind === "WORK" ? item.count : 1), 0);

/** Failures first, then warnings, then the queues in the order the server sends them. */
export const byUrgency = (items: InboxItem[]) => {
  const rank = (i: InboxItem) => (i.severity === "CRIT" ? 0 : i.severity === "WARN" ? 2 : 1);
  return items.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map((x) => x.item);
};

export const InboxRow: React.FC<{
  item: InboxItem;
  readOnly: boolean;
  onNavigate?: () => void;
  onMarkRead: (item: InboxItem) => void;
  hoverClass?: string;
}> = ({ item, readOnly, onNavigate, onMarkRead, hoverClass = "hover:bg-brand-50" }) => {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const copy = copyFor(item);
  const detail = copy.detail(item);
  const tone =
    item.severity === "CRIT"
      ? "bg-error-50 text-error-700"
      : item.severity === "WARN"
        ? "bg-warning-50 text-warning-700"
        : "bg-gray-100 text-gray-700";

  const go = () => {
    onNavigate?.();
    navigate(copy.href(item));
  };

  return (
    <div
      className={`grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors ${hoverClass} ${leaving ? "shell-leaving" : ""}`}
    >
      <span className={`grid size-9 place-items-center rounded-lg ${tone}`}>{copy.icon}</span>
      <button type="button" onClick={go} className="min-w-0 text-left">
        <span className="flex items-baseline gap-2 text-sm font-semibold leading-snug text-gray-900">
          <span>{copy.title(item.count)}</span>
          <span className="shell-num text-xs font-semibold text-gray-500">{item.count}</span>
        </span>
        {detail && <span className="mt-0.5 block text-xs leading-snug text-gray-500 [overflow-wrap:anywhere]">{detail}</span>}
      </button>
      <span className="flex gap-1">
        {item.kind === "ALERT" ? (
          <button
            type="button"
            onClick={() => {
              setLeaving(true);
              window.setTimeout(() => onMarkRead(item), 200);
            }}
            className="shell-press inline-flex h-[30px] items-center gap-1 whitespace-nowrap rounded-full border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-800 hover:border-brand-400"
          >
            <CheckIcon className="size-3.5" /> Mark read
          </button>
        ) : (
          <button
            type="button"
            onClick={go}
            className="shell-press inline-flex h-[30px] items-center whitespace-nowrap rounded-full bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-700"
          >
            {readOnly ? "Open" : copy.action}
          </button>
        )}
      </span>
    </div>
  );
};
