/**
 * Checks for the publish planner — run with `npm run check:cms-draft`.
 *
 * Not a test suite in the framework sense; this repo has no runner. It is here
 * because the planner is the one part of the CMS that can quietly do damage:
 * a wrong op order writes items to a section that does not exist yet, a patch
 * sent where a whole record was expected silently blanks columns, and a bad
 * retry after a half-finished publish duplicates everything it already wrote.
 * None of that is visible by looking at the screen.
 */
import { draftReducer, EMPTY_DRAFT, type DraftState, type DraftAction } from "../draftState";
import { planPublish, describeOp } from "../diff";
import type { DraftSection } from "../types";
import { referencedProductIds, toPreviewPayload, viewerGenderFor } from "../../preview/toPreviewPayload";
import type { PreviewProduct } from "../../preview/useStorefrontPreview";
import { moved } from "../../studio/useSortable";
import { categoryLink } from "../../editor/links";

let failures = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) { console.log(`  ok   ${name}`); return; }
  failures++;
  console.log(`  FAIL ${name}`, extra !== undefined ? JSON.stringify(extra, null, 2) : "");
};

const run = (state: DraftState, ...actions: DraftAction[]) =>
  actions.reduce(draftReducer, state);

const section = (over: Partial<DraftSection>): DraftSection => ({
  sectionId: 1, type: "HERO", title: "Hero", subtitle: "Sub",
  position: 1, status: "ACTIVE", gender: "MALE", items: [], ...over,
});

const item = (over: Partial<DraftSection["items"][number]> = {}) => ({
  itemId: 10, image: "/uploads/a.jpg", heading: "H", subheading: null,
  ctaText: null, link: "/search", productId: null, categoryId: null,
  reviewId: null, position: 1, ...over,
});

const SERVER: DraftSection[] = [
  section({ sectionId: 1, items: [item({ itemId: 10 }), item({ itemId: 11, position: 2 })] }),
  section({ sectionId: 2, type: "PROMO", title: "Promo", position: 2, status: "INACTIVE", items: [item({ itemId: 20 })] }),
];

const loaded = run(EMPTY_DRAFT, { type: "load", sections: SERVER });

console.log("\n1. a freshly loaded draft is clean");
check("no ops", planPublish(loaded).length === 0, planPublish(loaded));

console.log("\n2. adding a section and its items");
const newId = "new:section:A";
let s = run(loaded, {
  type: "addSection",
  section: section({ sectionId: newId, type: "CATEGORIES", title: "Shop by Category", subtitle: "", position: 3, status: "DRAFT" }),
});
s = run(s,
  { type: "addItem", sectionId: newId, item: item({ heading: "Tees" }) as never },
  { type: "addItem", sectionId: newId, item: item({ heading: "Jeans", position: 2 }) as never },
);
let ops = planPublish(s);
check("three ops", ops.length === 3, ops.map(describeOp));
check("section is created first", ops[0].kind === "create-section");
check("items follow", ops[1].kind === "create-item" && ops[2].kind === "create-item");
check("items point at the unsaved section", ops.slice(1).every((o) => (o as never as { sectionRef: unknown }).sectionRef === newId));
check("new section is staged as DRAFT", (ops[0] as never as { data: { status: string } }).data.status === "DRAFT");

console.log("\n3. editing one field sends a complete record");
s = run(loaded, { type: "updateSection", id: 1, patch: { title: "New hero" } });
ops = planPublish(s);
check("one op", ops.length === 1, ops.map(describeOp));
const payload = (ops[0] as never as { data: Record<string, unknown> }).data;
check("subtitle survives the patch", payload.subtitle === "Sub", payload);
check("status survives the patch", payload.status === "ACTIVE", payload);
check("gender and position survive", payload.gender === "MALE" && payload.position === 1, payload);

console.log("\n4. an edit that changes nothing is not an edit");
s = run(loaded, { type: "updateSection", id: 1, patch: { title: "Hero" } });
check("no ops", planPublish(s).length === 0, planPublish(s).map(describeOp));

console.log("\n5. editing an item");
s = run(loaded, { type: "updateItem", sectionId: 1, itemId: 11, patch: { link: "/search?gender=MALE" } });
ops = planPublish(s);
check("one update-item", ops.length === 1 && ops[0].kind === "update-item", ops.map(describeOp));
check("complete record", (ops[0] as never as { data: { image: string } }).data.image === "/uploads/a.jpg");

console.log("\n6. deleting");
s = run(loaded, { type: "deleteItem", sectionId: 1, itemId: 10 });
ops = planPublish(s);
check("item delete emitted", ops.length === 1 && ops[0].kind === "delete-item", ops.map(describeOp));

s = run(loaded, { type: "deleteSection", id: 2 });
ops = planPublish(s);
check("section delete only, no item deletes", ops.length === 1 && ops[0].kind === "delete-section", ops.map(describeOp));

const tempId = "new:section:B";
s = run(loaded, {
  type: "addSection",
  section: section({ sectionId: tempId, type: "PROMO", title: "Temp", subtitle: "", position: 9, status: "DRAFT" }),
});
s = run(s, { type: "deleteSection", id: tempId });
check("adding then removing an unpublished section writes nothing", planPublish(s).length === 0, planPublish(s).map(describeOp));

console.log("\n7. deletes come last");
s = run(loaded,
  { type: "deleteSection", id: 2 },
  { type: "addSection", section: section({ sectionId: "new:section:C", type: "TRENDING", title: "Trending", subtitle: "", position: 4, status: "DRAFT" }) });
ops = planPublish(s);
check("create before delete", ops[0].kind === "create-section" && ops[ops.length - 1].kind === "delete-section", ops.map(describeOp));

console.log("\n8. retry after a partial publish does not duplicate");
const pendingId = "new:section:D";
s = run(loaded, {
  type: "addSection",
  section: section({ sectionId: pendingId, type: "CATEGORIES", title: "Cats", subtitle: "", position: 3, status: "DRAFT" }),
});
s = run(s, { type: "addItem", sectionId: pendingId, item: item({ heading: "Tees" }) as never });
// The section was created as id 99; the item create then failed.
const afterServer = [...SERVER, section({ sectionId: 99, type: "CATEGORIES", title: "Cats", subtitle: "", position: 3, status: "DRAFT", items: [] })];
s = run(s, { type: "rebase", sections: afterServer, sectionIds: new Map([[pendingId, 99]]), itemIds: new Map() });
ops = planPublish(s);
check("only the item is left to write", ops.length === 1 && ops[0].kind === "create-item", ops.map(describeOp));
check("it is bound to the real section id", (ops[0] as never as { sectionRef: number }).sectionRef === 99);

console.log("\n9. a section that appeared on the server is adopted, not deleted");
const withStranger = [...SERVER, section({ sectionId: 77, type: "REVIEWS", title: "Reviews", position: 5 })];
s = run(loaded, { type: "rebase", sections: withStranger, sectionIds: new Map(), itemIds: new Map() });
check("no deletes planned", planPublish(s).length === 0, planPublish(s).map(describeOp));
check("it is on screen", s.working.some((x) => x.sectionId === 77));

console.log("\n10. a section the user deleted stays deleted across a rebase");
s = run(loaded, { type: "deleteSection", id: 2 });
s = run(s, { type: "rebase", sections: SERVER, sectionIds: new Map(), itemIds: new Map() });
ops = planPublish(s);
check("delete still pending", ops.length === 1 && ops[0].kind === "delete-section", ops.map(describeOp));
check("not re-adopted", !s.working.some((x) => x.sectionId === 2));

console.log("\n11. discard returns to the server's copy");
s = run(loaded,
  { type: "updateSection", id: 1, patch: { title: "Changed" } },
  { type: "deleteSection", id: 2 },
  { type: "discard" });
check("clean again", planPublish(s).length === 0, planPublish(s).map(describeOp));
check("sections restored", s.working.length === 2);


console.log("\n12. the preview payload mirrors what the storefront would render");
{
  const products = new Map<number, PreviewProduct>([
    [7, { productId: 7, name: "Kurta", basePrice: 1499, discountedPrice: 1199, primaryImage: "/uploads/p7.jpg" }],
  ]);

  const draft: DraftSection[] = [
    section({ sectionId: 1, title: "Men hero", position: 2, status: "ACTIVE", gender: "MALE" }),
    section({ sectionId: 2, title: "Unisex promo", type: "PROMO", position: 1, status: "ACTIVE", gender: "OTHER" }),
    section({ sectionId: 3, title: "Women hero", position: 3, status: "ACTIVE", gender: "FEMALE" }),
    section({ sectionId: 4, title: "Half built", position: 4, status: "DRAFT", gender: "MALE" }),
    section({ sectionId: 5, title: "Retired", position: 5, status: "INACTIVE", gender: "MALE" }),
    section({ sectionId: 6, title: "Featured", type: "FEATURED_PRODUCTS", position: 6, status: "ACTIVE", gender: "MALE",
      items: [item({ itemId: 60, productId: 7, image: "/uploads/stale-banner.jpg" }), item({ itemId: 61, position: 2, productId: 999 })] }),
  ];

  const men = toPreviewPayload(draft, { gender: "MALE", includeDrafts: true, products });
  check("women's sections are left out", !men.some((s2) => s2.sectionId === 3), men.map((s2) => s2.title));
  check("unisex sections come along", men.some((s2) => s2.sectionId === 2));
  check("position orders across both", men[0].sectionId === 2, men.map((s2) => [s2.sectionId, s2.position]));
  check("INACTIVE never renders", !men.some((s2) => s2.sectionId === 5));
  check("drafts render when asked", men.some((s2) => s2.sectionId === 4));

  const live = toPreviewPayload(draft, { gender: "MALE", includeDrafts: false, products });
  check("and not when not", !live.some((s2) => s2.sectionId === 4), live.map((s2) => s2.title));

  const featured = men.find((s2) => s2.sectionId === 6)!;
  check("a resolved product is attached", featured.items[0].product?.name === "Kurta");
  check("its own image wins over the item's", featured.items[0].image === "/uploads/p7.jpg", featured.items[0].image);
  check("an unresolvable product is null, not a crash", featured.items[1].product === null);

  check("the unisex tab previews the men's page", viewerGenderFor("OTHER") === "MALE");
  check("referenced ids are collected once", referencedProductIds(draft).join() === "7,999", referencedProductIds(draft));
}


console.log("\n13. dragging renumbers the page");
{
  const page: DraftSection[] = [
    section({ sectionId: 1, title: "Hero", position: 1, gender: "MALE" }),
    section({ sectionId: 2, title: "Unisex promo", position: 2, gender: "OTHER" }),
    section({ sectionId: 3, title: "Featured", position: 3, gender: "MALE" }),
    section({ sectionId: 9, title: "Women hero", position: 1, gender: "FEMALE" }),
  ];
  const base = run(EMPTY_DRAFT, { type: "load", sections: page });

  // The men's page is [1, 2, 3]; drag the third row to the top.
  const order = moved([1, 2, 3], 2, 0);
  check("moved() reorders", order.join() === "3,1,2", order);

  let r = run(base, { type: "reorderSections", orderedIds: order });
  const byId = new Map(r.working.map((x) => [x.sectionId, x.position]));
  check("renumbered 1..N in drag order", byId.get(3) === 1 && byId.get(1) === 2 && byId.get(2) === 3, [...byId]);
  check("the other page is untouched", byId.get(9) === 1);

  const reorderOps = planPublish(r);
  check("only moved sections are written", reorderOps.length === 3 && reorderOps.every((o) => o.kind === "update-section"), reorderOps.map(describeOp));

  // Two drags that cancel out leave nothing to publish.
  r = run(r, { type: "reorderSections", orderedIds: [1, 2, 3] });
  check("putting it back writes nothing", planPublish(r).length === 0, planPublish(r).map(describeOp));
}

console.log("\n14. dragging items renumbers within the section");
{
  const withItems = [
    section({ sectionId: 1, items: [
      item({ itemId: 10, position: 1 }),
      item({ itemId: 11, position: 2 }),
      item({ itemId: 12, position: 3 }),
    ] }),
  ];
  const base = run(EMPTY_DRAFT, { type: "load", sections: withItems });
  const r = run(base, { type: "reorderItems", sectionId: 1, orderedIds: moved([10, 11, 12], 0, 2) });

  const positions = r.working[0].items.map((i) => [i.itemId, i.position]);
  check("1..N with no gaps", JSON.stringify(positions) === JSON.stringify([[10, 3], [11, 1], [12, 2]]), positions);

  const itemOps = planPublish(r);
  check("written as item updates", itemOps.length === 3 && itemOps.every((o) => o.kind === "update-item"), itemOps.map(describeOp));
}


console.log("\n15. category links match the storefront's own filter URL");
{
  // Ticking "Kurtis" in the storefront's filter panel produces /search?categories=1,
  // and paramsToFilters reads `categories` and nothing else — a link written as
  // ?category=<name> lands on an unfiltered page that looks like it worked.
  check("plural param, numeric id", categoryLink(1) === "/search?categories=1", categoryLink(1));
  check("no name in the link", !/[a-z]+=[a-z]/i.test(categoryLink(12).split("?")[1].replace("categories=", "")), categoryLink(12));
}

// Throwing, rather than process.exit: this file is type-checked as part of the
// app, where `process` does not exist. An uncaught throw still exits non-zero.
if (failures) throw new Error(`${failures} check(s) failed`);
console.log("\nall checks passed\n");
