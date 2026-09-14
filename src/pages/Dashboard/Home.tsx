import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { BarChart, HBarList, Legend, LineChart, Sparkline } from "../../components/charts/Charts";
import {
  getCatalogOverview,
  getContentOverview,
  getFinanceTrends,
  getSalesOverview,
  type CatalogOverview,
  type ContentOverview,
  type FinanceTrends,
  type InboxItem,
  type SalesOverview,
} from "../../api/overviewApi";
import { useAuth } from "../../context/AuthContext";
import { useInbox } from "../../context/InboxContext";
import { useReadOnly } from "../../hooks/useReadOnly";
import { canAccess } from "../../config/roles";
import { SECTION_GROUPS, pagesFor, type SectionPage } from "../../config/sections";
import { compactRupees, count, percentChange, rupees } from "../../lib/format";
import { InboxRow, byUrgency } from "../../layout/InboxRow";
import { ArrowIcon } from "../../layout/shellIcons";

/*
 * The landing page. Figures first, the work waiting second, every page last.
 * What appears depends on the role: each block is fetched from its own
 * department's endpoint, so a role only ever asks for what it may read.
 */

type Load<T> = { data: T | null; failed: boolean };

function useOverview<T>(enabled: boolean, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Load<T>>({ data: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, failed: false }));
    fetcher(ctrl.signal)
      .then((data) => setState({ data, failed: false }))
      .catch((err) => {
        if (!ctrl.signal.aborted && err?.name !== "CanceledError") setState({ data: null, failed: true });
      });
    return () => ctrl.abort();
    // fetcher is a module-level function; the attempt counter is the retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const today = () =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

// ---- building blocks ---------------------------------------------------------

type Tile = {
  label: string;
  value: React.ReactNode;
  sub?: string;
  change?: number | null;
  /** Up is bad for this figure (expenses, return rate). */
  upIsBad?: boolean;
  changeText?: string;
  state?: "warn" | "crit";
  spark?: (number | null)[];
  sparkColor?: 1 | 2;
};

function Chip({ tile }: { tile: Tile }) {
  if (tile.state) {
    return (
      <span className={`shell-num inline-flex h-[22px] w-fit items-center rounded-full px-2 text-xs font-semibold ${tile.state === "crit" ? "bg-error-50 text-error-700" : "bg-warning-50 text-warning-700"}`}>
        {tile.state === "crit" ? "Act now" : "Waiting"}
      </span>
    );
  }
  if (tile.change == null) return null;
  const up = tile.change >= 0;
  const good = tile.upIsBad ? !up : up;
  return (
    <span
      title="Against the 30 days before"
      className={`shell-num inline-flex h-[22px] w-fit items-center gap-0.5 rounded-full px-2 text-xs font-semibold ${good ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      {tile.changeText ?? `${Math.abs(tile.change).toFixed(1)}%`}
    </span>
  );
}

function KpiStrip({ tiles }: { tiles: Tile[] }) {
  if (tiles.length === 0) return null;
  const cols = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" }[Math.min(tiles.length, 5) as 1 | 2 | 3 | 4 | 5];
  return (
    <section aria-label="Key figures" className={`shell-panel grid grid-cols-1 overflow-hidden sm:grid-cols-2 ${cols}`}>
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`grid min-w-0 gap-1.5 px-5 pb-4 pt-[18px] ${i > 0 ? "border-t border-gray-200 lg:border-l lg:border-t-0" : ""} ${i === 1 ? "sm:border-t-0 sm:border-l" : ""}`}
        >
          <span className="shell-label">{tile.label}</span>
          <span className="shell-num whitespace-nowrap text-[27px] font-semibold leading-tight tracking-tight text-gray-900">{tile.value}</span>
          <div className="flex min-h-7 items-center justify-between gap-2">
            <div className="grid min-w-0 gap-1">
              <Chip tile={tile} />
              {tile.sub && <span className="truncate text-xs text-gray-500">{tile.sub}</span>}
            </div>
            {tile.spark && <Sparkline values={tile.spark} color={tile.sparkColor} />}
          </div>
        </div>
      ))}
    </section>
  );
}

function Panel({
  title,
  sub,
  legend,
  action,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  legend?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`shell-panel min-w-0 p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17.5px] font-semibold leading-snug tracking-tight text-gray-900">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        {legend}
        {action}
      </div>
      {children}
    </article>
  );
}

function Failed({ what, retry }: { what: string; retry: () => void }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-lg bg-gray-50 px-4 text-center text-sm text-gray-500">
      <p>
        {what} could not be loaded.{" "}
        <button type="button" onClick={retry} className="font-semibold text-brand-600 underline-offset-2 hover:underline">
          Try again
        </button>
      </p>
    </div>
  );
}

function Waiting({ height = 180 }: { height?: number }) {
  return <div className="animate-pulse rounded-lg bg-gray-100" style={{ height }} aria-label="Loading" />;
}

function PanelBody<T>({ load, what, height, children }: { load: Load<T> & { retry: () => void }; what: string; height?: number; children: (data: T) => React.ReactNode }) {
  if (load.failed) return <Failed what={what} retry={load.retry} />;
  if (!load.data) return <Waiting height={height} />;
  return <>{children(load.data)}</>;
}

// ---- page --------------------------------------------------------------------

export default function Home() {
  const { username, role } = useAuth();
  const readOnly = useReadOnly();
  const inbox = useInbox();
  const navigate = useNavigate();

  const reads = {
    finance: canAccess(role, "/analytics"),
    sales: canAccess(role, "/orders"),
    catalog: canAccess(role, "/stock"),
    content: canAccess(role, "/reviews"),
  };

  const finance = useOverview<FinanceTrends>(reads.finance, getFinanceTrends);
  const sales = useOverview<SalesOverview>(reads.sales, getSalesOverview);
  const catalog = useOverview<CatalogOverview>(reads.catalog, getCatalogOverview);
  const content = useOverview<ContentOverview>(reads.content, getContentOverview);

  const inboxCount = (key: string) => inbox.items.find((i) => i.key === key)?.count ?? 0;
  const inboxSum = (prefix: string) => inbox.items.filter((i) => i.key.startsWith(prefix)).reduce((n, i) => n + i.count, 0);
  const everything = reads.finance && reads.sales && reads.catalog && reads.content;

  const f = finance.data;
  const s = sales.data;
  const c = catalog.data;
  const r = content.data;

  // ---- figures across the top, chosen for the role ---------------------------
  const tiles = useMemo<Tile[]>(() => {
    const dash = "—";
    const revenue: Tile = {
      label: "Revenue",
      value: f ? rupees(f.last30.revenue) : dash,
      change: f ? percentChange(f.last30.revenue, f.previous30.revenue) : null,
      sub: "Last 30 days",
      spark: f?.revenue,
    };
    const profit: Tile = {
      label: "Net profit",
      value: f ? rupees(f.last30.netProfit) : dash,
      change: f ? percentChange(f.last30.netProfit, f.previous30.netProfit) : null,
      sub: f?.last30.netMargin != null ? `${f.last30.netMargin.toFixed(1)}% margin` : "After costs and expenses",
      spark: f?.netProfit,
      sparkColor: 2,
    };
    const orders: Tile = f
      ? { label: "Orders", value: count(f.last30.orders), change: percentChange(f.last30.orders, f.previous30.orders), sub: "Last 30 days", spark: f.orders }
      : { label: "Orders", value: s ? count(s.ordersLast30) : dash, change: s ? percentChange(s.ordersLast30, s.ordersPrevious30) : null, sub: "Last 30 days", spark: s?.orders };
    const aov: Tile = {
      label: "Average order",
      value: f?.last30.averageOrderValue != null ? rupees(f.last30.averageOrderValue) : dash,
      change: f?.last30.averageOrderValue != null && f.previous30.averageOrderValue != null ? percentChange(f.last30.averageOrderValue, f.previous30.averageOrderValue) : null,
      spark: f?.averageOrderValue,
    };
    const rating: Tile = {
      label: "Rating",
      value: r?.publishedAverage != null ? <>{r.publishedAverage.toFixed(1)}<small className="ml-0.5 text-sm font-medium text-gray-500">★</small></> : dash,
      sub: r ? `${count(r.publishedCount)} published reviews` : undefined,
      spark: r?.averageRating,
    };

    if (everything) return [revenue, profit, orders, aov, rating];
    if (reads.finance) {
      const margin = f?.last30.netMargin ?? null;
      const prevMargin = f?.previous30.netMargin ?? null;
      return [
        revenue,
        profit,
        {
          label: "Net margin",
          value: margin != null ? `${margin.toFixed(1)}%` : dash,
          change: margin != null && prevMargin != null ? margin - prevMargin : null,
          changeText: margin != null && prevMargin != null ? `${Math.abs(margin - prevMargin).toFixed(1)} pts` : undefined,
          sub: "After expenses",
        },
        {
          label: "Expenses",
          value: f ? rupees(f.last30.expenses) : dash,
          change: f ? percentChange(f.last30.expenses, f.previous30.expenses) : null,
          upIsBad: true,
          sub: "Operating, last 30 days",
          spark: f?.expenses,
        },
        aov,
      ];
    }
    if (reads.sales) {
      const refundDue = inbox.items.find((i) => i.key === "returns.refund-pay");
      return [
        orders,
        { label: "To ship", value: count(inboxCount("orders.ship")), state: inboxCount("orders.ship") > 0 ? "warn" : undefined, sub: "Placed and paid" },
        { label: "Open returns", value: count(inboxSum("returns.")), sub: "Every step before the refund" },
        {
          label: "Refunds due",
          value: rupees(refundDue?.amount ?? 0),
          state: inbox.items.some((i) => i.key === "refunds.failed") ? "crit" : undefined,
          sub: refundDue ? `${refundDue.count} to pay` : "Nothing to pay",
        },
        {
          label: "New customers",
          value: s ? count(s.customersLast30) : dash,
          change: s ? percentChange(s.customersLast30, s.customersPrevious30) : null,
          sub: "Last 30 days",
          spark: s?.newCustomers,
        },
      ];
    }
    if (reads.catalog) {
      return [
        { label: "Units sold", value: c ? count(c.unitsLast30) : dash, change: c ? percentChange(c.unitsLast30, c.unitsPrevious30) : null, sub: "Last 30 days", spark: c?.units },
        { label: "Live products", value: c ? count(c.liveProducts) : dash, sub: c ? `${count(c.variants)} variants` : undefined },
        { label: "Low stock", value: c ? count(c.low) : dash, state: c && c.low > 0 ? "warn" : undefined, sub: "5 or fewer left" },
        { label: "Out of stock", value: c ? count(c.out) : dash, state: c && c.out > 0 ? "crit" : undefined, sub: "Variants at zero" },
      ];
    }
    if (reads.content) {
      return [
        rating,
        {
          label: "Reviews",
          value: r ? count(r.reviewsLast30) : dash,
          change: r ? percentChange(r.reviewsLast30, r.reviewsPrevious30) : null,
          sub: "Last 30 days",
          spark: r?.reviews,
        },
        { label: "Photo reviews waiting", value: r ? count(r.pending) : dash, state: r && r.pending > 0 ? "warn" : undefined, sub: "Text reviews go live at once" },
      ];
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, s, c, r, inbox.items, everything, reads.finance, reads.sales, reads.catalog, reads.content]);

  // ---- a live detail on each page's card ------------------------------------
  const cardMetric = (page: SectionPage): { text: string; state?: "warn" | "crit" } | null => {
    switch (page.path) {
      case "/products":
        return c ? { text: `${count(c.liveProducts)} live · ${count(c.variants)} variants` } : null;
      case "/stock":
        return c ? { text: `${c.low} low · ${c.out} out`, state: c.out > 0 ? "crit" : c.low > 0 ? "warn" : undefined } : null;
      case "/orders": {
        const ship = inboxCount("orders.ship");
        const confirm = inboxCount("orders.confirm");
        if (!ship && !confirm) return { text: "Nothing waiting" };
        return { text: [ship && `${ship} to ship`, confirm && `${confirm} to confirm`].filter(Boolean).join(" · "), state: "warn" };
      }
      case "/returns": {
        const open = inboxSum("returns.");
        const failed = inbox.items.some((i) => i.key === "refunds.failed");
        return { text: failed ? `${open} open · a refund failed` : open ? `${open} open` : "Nothing waiting", state: failed ? "crit" : open ? "warn" : undefined };
      }
      case "/exchanges": {
        const open = inboxSum("exchanges.");
        return { text: open ? `${open} open` : "Nothing waiting", state: open ? "warn" : undefined };
      }
      case "/customers":
        return s ? { text: `${count(s.customersLast30)} new in 30 days` } : null;
      case "/reviews": {
        const waiting = inboxCount("reviews.moderate");
        return waiting ? { text: `${waiting} photo ${waiting === 1 ? "review" : "reviews"} to moderate`, state: "warn" } : r?.publishedAverage != null ? { text: `${r.publishedAverage.toFixed(1)} ★ average` } : null;
      }
      case "/analytics":
        return f?.last30.netMargin != null ? { text: `Net margin ${f.last30.netMargin.toFixed(1)}%` } : null;
      case "/expenses":
        return f ? { text: `${rupees(f.last30.expenses)} last 30 days` } : null;
      default:
        return null;
    }
  };

  const pages = pagesFor(role);
  const attention = byUrgency(inbox.items).slice(0, 5);
  const months = f?.months ?? s?.months ?? c?.months ?? r?.months ?? [];

  // ---- main chart ------------------------------------------------------------
  const main = reads.finance ? (
    <Panel
      title="Revenue and net profit"
      sub={months.length ? "Last 12 months · this month so far" : undefined}
      legend={<Legend items={[{ color: 1, label: "Revenue" }, { color: 2, label: "Net profit" }]} />}
    >
      <PanelBody load={finance} what="Revenue and profit" height={260}>
        {(d) => (
          <>
            <LineChart
              months={d.months}
              series={[
                { name: "Revenue", color: 1, values: d.revenue },
                { name: "Net profit", color: 2, values: d.netProfit },
              ]}
              formatAxis={compactRupees}
              formatValue={rupees}
            />
            <p className="mt-2.5 text-xs text-gray-500">Net profit is after product costs and operating expenses.</p>
          </>
        )}
      </PanelBody>
    </Panel>
  ) : reads.sales ? (
    <Panel title="Orders per month" sub="Gold is this month so far">
      <PanelBody load={sales} what="Orders" height={260}>
        {(d) => <BarChart months={d.months} values={d.orders} name="Orders" height={260} formatValue={count} />}
      </PanelBody>
    </Panel>
  ) : reads.catalog ? (
    <Panel title="Units sold per month" sub="Gold is this month so far">
      <PanelBody load={catalog} what="Units sold" height={260}>
        {(d) => <BarChart months={d.months} values={d.units} name="Units" height={260} formatValue={count} />}
      </PanelBody>
    </Panel>
  ) : reads.content ? (
    <Panel title="Reviews per month" sub="Gold is this month so far">
      <PanelBody load={content} what="Reviews" height={260}>
        {(d) => <BarChart months={d.months} values={d.reviews} name="Reviews" height={260} formatValue={count} />}
      </PanelBody>
    </Panel>
  ) : null;

  // ---- smaller charts --------------------------------------------------------
  const minis: React.ReactNode[] = [];
  if (reads.finance && reads.sales) {
    minis.push(
      <Panel key="orders" title="Orders per month" sub="Gold is this month so far">
        <PanelBody load={finance} what="Orders">
          {(d) => <BarChart months={d.months} values={d.orders} name="Orders" formatValue={count} />}
        </PanelBody>
      </Panel>,
    );
  }
  if (reads.sales) {
    minis.push(
      <Panel key="returns" title="Return rate" sub="Returns asked for, per 100 orders that month">
        <PanelBody load={sales} what="Return rate">
          {(d) => (
            <LineChart
              months={d.months}
              series={[{ name: "Return rate", color: 1, values: d.returnRate }]}
              height={180}
              formatAxis={(v) => `${v}%`}
              formatValue={(v) => `${v.toFixed(1)}%`}
            />
          )}
        </PanelBody>
      </Panel>,
    );
  }
  if (reads.sales && !reads.finance) {
    minis.push(
      <Panel key="customers" title="New customers per month" sub="Gold is this month so far">
        <PanelBody load={sales} what="New customers">
          {(d) => <BarChart months={d.months} values={d.newCustomers} name="New customers" formatValue={count} />}
        </PanelBody>
      </Panel>,
    );
  }
  if (reads.finance) {
    minis.push(
      <Panel key="expenses" title="Expenses by category" sub="Last 30 days · operating costs only">
        <PanelBody load={finance} what="Expenses">
          {(d) =>
            d.expensesLast30.length ? (
              <HBarList items={d.expensesLast30.map((e) => ({ label: titleCase(e.name), value: e.amount }))} format={rupees} />
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">No expenses recorded in the last 30 days.</p>
            )
          }
        </PanelBody>
      </Panel>,
    );
  }
  if (reads.finance && !reads.sales) {
    minis.push(
      <Panel key="aov" title="Average order value" sub="Per month">
        <PanelBody load={finance} what="Average order value">
          {(d) => (
            <LineChart months={d.months} series={[{ name: "Average order", color: 1, values: d.averageOrderValue }]} height={180} yMin={Math.min(...d.averageOrderValue.filter((v): v is number => v != null), 0)} formatAxis={compactRupees} formatValue={rupees} />
          )}
        </PanelBody>
      </Panel>,
    );
  }
  if (reads.catalog && !reads.finance && !reads.sales) {
    minis.push(
      <Panel key="bycat" title="Units by category" sub="Last 30 days">
        <PanelBody load={catalog} what="Units by category">
          {(d) =>
            d.unitsByCategoryLast30.length ? (
              <HBarList items={d.unitsByCategoryLast30.map((x) => ({ label: x.name, value: x.count }))} format={(v) => `${count(v)} units`} />
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">Nothing sold in the last 30 days.</p>
            )
          }
        </PanelBody>
      </Panel>,
    );
  }
  if (reads.content && !reads.sales && !reads.catalog) {
    minis.push(
      <Panel key="avg" title="Average rating per month" sub="Published reviews only">
        <PanelBody load={content} what="Ratings">
          {(d) => <LineChart months={d.months} series={[{ name: "Rating", color: 1, values: d.averageRating }]} height={180} yMin={1} yMax={5} formatAxis={(v) => v.toFixed(1)} formatValue={(v) => `${v.toFixed(1)} ★`} />}
        </PanelBody>
      </Panel>,
      <Panel key="stars" title="Ratings breakdown" sub={r ? `All ${count(r.publishedCount)} published reviews` : undefined}>
        <PanelBody load={content} what="Ratings">
          {(d) => <HBarList items={[5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, value: d.stars[String(n)] ?? 0 }))} format={(v) => count(v)} />}
        </PanelBody>
      </Panel>,
    );
  }

  return (
    <>
      <PageMeta title="Dashboard | Maayaa Admin" description="What is happening at Maayaa, and what needs you" />

      <div className="grid gap-6">
        <section className="flex flex-wrap items-end justify-between gap-4 pt-2">
          <div>
            <p className="mb-1 text-xs text-gray-500">Dashboard</p>
            <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-gray-900">
              {greeting()}, {username ?? "there"}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">{today()} · last 30 days against the 30 before</p>
          </div>
        </section>

        <KpiStrip tiles={tiles} />

        <section className={`grid gap-6 ${main ? "lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]" : ""}`}>
          {main}
          <aside aria-labelledby="attention-title" className="shell-panel-soft flex min-w-0 flex-col p-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 id="attention-title" className="text-[17.5px] font-semibold leading-snug tracking-tight text-gray-900">
                  Needs attention
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {inbox.items.length > attention.length ? `${attention.length} of ${inbox.items.length} · failures first` : "Failures first"}
                </p>
              </div>
            </div>
            <div className="grid gap-0.5">
              {inbox.loading && inbox.items.length === 0 && <Waiting height={160} />}
              {!inbox.loading && inbox.failed && inbox.items.length === 0 && <Failed what="What's waiting" retry={inbox.refresh} />}
              {!inbox.loading && !inbox.failed && inbox.items.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-500">Nothing is waiting on you.</p>
              )}
              {attention.map((item: InboxItem) => (
                <InboxRow key={item.key} item={item} readOnly={readOnly} onMarkRead={(i) => inbox.markRead([i])} hoverClass="hover:bg-white" />
              ))}
            </div>
          </aside>
        </section>

        {minis.length > 0 && (
          <section className={`grid gap-6 ${minis.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>{minis}</section>
        )}

        {reads.catalog && (
          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Best sellers" sub="Last 30 days, by units">
              <PanelBody load={catalog} what="Best sellers" height={220}>
                {(d) => <BestSellers data={d} />}
              </PanelBody>
            </Panel>
            <Panel
              title="Stock watch"
              sub="Variants with 5 or fewer left"
              action={
                <button type="button" onClick={() => navigate("/stock?filter=LOW")} className="shell-press inline-flex h-[30px] items-center gap-1 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 hover:border-brand-400">
                  Open stock <ArrowIcon className="size-3.5" />
                </button>
              }
            >
              <PanelBody load={catalog} what="Stock" height={220}>
                {(d) => <StockWatch data={d} />}
              </PanelBody>
            </Panel>
          </section>
        )}

        <section aria-labelledby="sections-title" className="grid gap-7 pt-2">
          <div>
            <h2 id="sections-title" className="text-[22px] font-semibold tracking-tight text-gray-900">
              Everything in Maayaa Admin
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Each section with what's happening in it. Or press{" "}
              <kbd className="shell-num rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px]">/</kbd> and type.
            </p>
          </div>
          {SECTION_GROUPS.map((group) => {
            const inGroup = pages.filter((p) => p.group === group);
            if (!inGroup.length) return null;
            return (
              <div key={group} className="grid gap-3">
                <span className="shell-label">{group}</span>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                  {inGroup.map((page) => {
                    const metric = cardMetric(page);
                    return (
                      <Link key={page.path} to={page.path} className="shell-card group grid min-h-[104px] content-start gap-1 rounded-2xl border border-gray-200 bg-white p-4">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[15px] font-semibold tracking-tight text-gray-900">{page.name}</span>
                          <ArrowIcon className="size-4 text-gray-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
                        </span>
                        {metric && (
                          <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${metric.state === "crit" ? "text-error-700" : metric.state === "warn" ? "text-warning-700" : "text-gray-800"}`}>
                            {metric.state && <span aria-hidden="true" className="size-[7px] rounded-full bg-current" />}
                            {metric.text}
                          </span>
                        )}
                        <span className="text-xs leading-snug text-gray-500">{page.description}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}

function titleCase(raw: string) {
  const s = raw.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function BestSellers({ data }: { data: CatalogOverview }) {
  if (!data.topSellersLast30.length) return <p className="py-10 text-center text-sm text-gray-500">Nothing sold in the last 30 days.</p>;
  const max = Math.max(...data.topSellersLast30.map((t) => t.units));
  const showRevenue = data.topSellersLast30.some((t) => t.revenue != null);
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="shell-label px-1 pb-2 text-left">Product</th>
            <th className="shell-label px-1 pb-2 text-right">Units</th>
            <th className="w-[28%] px-1 pb-2" />
            {showRevenue && <th className="shell-label px-1 pb-2 text-right">Revenue</th>}
          </tr>
        </thead>
        <tbody>
          {data.topSellersLast30.map((t) => (
            <tr key={t.productId} className="border-t border-gray-200">
              <td className="px-1 py-2.5 font-semibold text-gray-900">{t.name}</td>
              <td className="shell-num px-1 py-2.5 text-right text-gray-900">{count(t.units)}</td>
              <td className="px-1 py-2.5">
                <span className="block h-1.5 rounded-r" style={{ width: `${(t.units / max) * 100}%`, background: "var(--chart-1)" }} />
              </td>
              {showRevenue && <td className="shell-num px-1 py-2.5 text-right text-gray-900">{rupees(t.revenue)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockWatch({ data }: { data: CatalogOverview }) {
  if (!data.stockWatch.length) return <p className="py-10 text-center text-sm text-gray-500">Every variant has more than 5 left.</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="shell-label px-1 pb-2 text-left">Variant</th>
            <th className="shell-label px-1 pb-2 text-right">Left</th>
            <th className="shell-label px-1 pb-2 text-left">State</th>
          </tr>
        </thead>
        <tbody>
          {data.stockWatch.map((v) => (
            <tr key={v.variantId} className="border-t border-gray-200">
              <td className="px-1 py-2">
                <span className="font-semibold text-gray-900">{v.productName}</span>
                <span className="block text-xs text-gray-500">{[v.color, v.size].filter(Boolean).join(" · ") || "No colour or size"}</span>
              </td>
              <td className="shell-num px-1 py-2 text-right text-gray-900">{v.quantity}</td>
              <td className="px-1 py-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${v.quantity <= 0 ? "text-error-700" : "text-warning-700"}`}>
                  <span aria-hidden="true" className="size-[7px] rounded-full bg-current" />
                  {v.quantity <= 0 ? "Out" : "Low"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
