import { canAccess } from "./roles";

/**
 * Every page in the panel, once. The landing page's cards, the top bar's
 * search and the "where am I" line under the bar all read this list, so a new
 * page is added here and nowhere else.
 */

export type SectionGroup = "Catalog" | "Sales" | "Engagement" | "Content" | "Settings";

export const SECTION_GROUPS: SectionGroup[] = ["Catalog", "Sales", "Engagement", "Content", "Settings"];

export type SectionPage = {
  name: string;
  path: string;
  group: SectionGroup;
  description: string;
  /** Other words people search for this page by. */
  keywords?: string;
};

export const SECTION_PAGES: SectionPage[] = [
  { name: "Products", path: "/products", group: "Catalog", description: "Kurtis, pants and every variant", keywords: "catalogue items sku" },
  { name: "Categories", path: "/categories", group: "Catalog", description: "How products are filed" },
  { name: "Collections", path: "/collections", group: "Catalog", description: "Seasonal and edit groupings" },
  { name: "Sizes", path: "/sizes", group: "Catalog", description: "S to XXL, and Free Size" },
  { name: "Colours", path: "/colors", group: "Catalog", description: "Swatches used across variants", keywords: "colors" },
  { name: "Stock", path: "/stock", group: "Catalog", description: "Quantities per variant", keywords: "inventory low out" },
  { name: "Product costs", path: "/costs", group: "Catalog", description: "What each piece costs to make", keywords: "margin cogs" },

  { name: "Orders", path: "/orders", group: "Sales", description: "Confirm, ship and track", keywords: "shipping awb courier" },
  { name: "Customers", path: "/customers", group: "Sales", description: "Profiles, addresses and order history" },
  { name: "Returns & refunds", path: "/returns", group: "Sales", description: "Online check, warehouse inspection, payout", keywords: "refund" },
  { name: "Refunds to review", path: "/refunds", group: "Sales", description: "Compare the money, then approve", keywords: "refund approve cancel payout money" },
  { name: "Exchanges", path: "/exchanges", group: "Sales", description: "Size and colour swaps" },
  { name: "Coupons", path: "/coupons/add", group: "Sales", description: "Discount codes and who can use them", keywords: "discount offer" },
  { name: "Coupon usage", path: "/coupons/usage", group: "Sales", description: "Who used each coupon, and uses left", keywords: "discount redeemed used remaining limit" },

  { name: "Reviews", path: "/reviews", group: "Engagement", description: "Text is live at once; photos wait for you", keywords: "ratings moderate" },
  { name: "Analytics", path: "/analytics", group: "Engagement", description: "Revenue, profit and best sellers", keywords: "profit revenue" },
  { name: "Expenses", path: "/expenses", group: "Engagement", description: "Ads, salaries, gateway fees", keywords: "spend" },
  { name: "GST report", path: "/gst-report", group: "Engagement", description: "Monthly summary and the GSTR-1 file", keywords: "gstr1 tax hsn" },

  { name: "Home CMS", path: "/home-cms", group: "Content", description: "Arrange the storefront home page", keywords: "homepage banner hero" },

  { name: "Admin users", path: "/admin-users", group: "Settings", description: "Who can sign in, and as what", keywords: "roles access team" },
];

export const pagesFor = (role: string | null | undefined) =>
  SECTION_PAGES.filter((page) => canAccess(role, page.path));

/**
 * The page a path belongs to, longest match first, so /orders/42 resolves to
 * Orders and /home-cms/section/3/items to Home CMS.
 */
export const pageForPath = (pathname: string): SectionPage | undefined =>
  [...SECTION_PAGES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((page) => {
      const base = page.path.replace(/\/add$/, "");
      return pathname === page.path || pathname === base || pathname.startsWith(base + "/");
    });
