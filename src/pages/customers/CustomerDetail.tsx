import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  assignCoupon,
  createCouponForCustomer,
  getAssignableCoupons,
  getCustomer,
  sendPasswordReset,
  setCustomerDisabled,
  type AssignableCoupon,
  type BasketLine,
  type CustomerDetail as Customer,
  type NewCouponForCustomer,
  getCustomerCredit,
  adjustCustomerCredit,
  type CreditEntry,
} from "../../api/customersApi";
import { useReadOnly } from "../../hooks/useReadOnly";

const currency = (n: number | null | undefined) =>
  "₹" +
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_TONE: Record<string, string> = {
  DELIVERED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const toneFor = (status: string | null) =>
  STATUS_TONE[status ?? ""] ??
  "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

function Card({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        {subtitle && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className={"mt-1 text-xl font-semibold " + (tone ?? "text-gray-800 dark:text-white/90")}>
        {value}
      </p>
    </div>
  );
}

function Basket({ lines, empty }: { lines: BasketLine[]; empty: string }) {
  if (lines.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
      {lines.map((l, i) => (
        <li key={`${l.productId}-${l.variantId}-${i}`} className="flex items-center justify-between py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-gray-800 dark:text-white/90">
              {l.productName}
            </p>
            <p className="text-xs text-gray-400">
              {l.variantId ? `Variant #${l.variantId} · ` : ""}
              added {fmtDate(l.addedAt)}
            </p>
          </div>
          <div className="ml-3 shrink-0 text-right">
            <p className="text-sm text-gray-700 dark:text-gray-200">{currency(l.price)}</p>
            {(l.quantity ?? 1) > 1 && (
              <p className="text-xs text-gray-400">× {l.quantity}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function CustomerDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const readOnly = useReadOnly();

  const id = Number(userId);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCredit = useCallback(async () => {
    try {
      const res = await getCustomerCredit(Number(userId));
      setCredit({
        balance: Number(res.data?.balance ?? 0),
        entries: Array.isArray(res.data?.entries) ? res.data.entries : [],
      });
    } catch {
      // A customer with no ledger rows is the normal case, not an error.
    }
  }, [userId]);

  useEffect(() => {
    loadCredit();
  }, [loadCredit]);

  /**
   * Move money into or out of the balance. The reason is not optional: it is
   * the line the next person reads when they wonder why the number changed.
   */
  const handleAdjustCredit = async () => {
    const raw = window.prompt(
      "Adjust store credit. Use a minus sign to take credit away, e.g. -250"
    );
    if (raw === null) return;

    const amount = Number(raw.trim());
    if (!Number.isFinite(amount) || amount === 0) {
      alert("Enter an amount, positive to add or negative to remove.");
      return;
    }

    const reason = window.prompt("Why? The customer and the next admin both read this.");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("An adjustment needs a reason.");
      return;
    }

    setBusy(true);
    try {
      const res = await adjustCustomerCredit(Number(userId), amount, reason.trim());
      setNotice(res.data?.message ?? "Balance adjusted");
      await loadCredit();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Could not adjust the balance.");
    } finally {
      setBusy(false);
    }
  };

  const [coupons, setCoupons] = useState<AssignableCoupon[]>([]);
  const [couponId, setCouponId] = useState<string>("");
  const [maxUsage, setMaxUsage] = useState(1);

  // The Coupons card does one of two things: hand over an existing coupon, or
  // make a new one for this customer alone. Same card, one toggle, so the page
  // does not grow a second half that is empty most of the time.
  const [creating, setCreating] = useState(false);
  const [credit, setCredit] = useState<{ balance: number; entries: CreditEntry[] }>({
    balance: 0,
    entries: [],
  });
  const [draft, setDraft] = useState<NewCouponForCustomer>(() => {
    const today = new Date();
    const inAMonth = new Date();
    inAMonth.setMonth(inAMonth.getMonth() + 1);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return {
      code: "",
      discountType: "P",
      value: 10,
      validFrom: iso(today),
      validTill: iso(inAMonth),
      usageLimit: 1,
    };
  });

  const draftField = <K extends keyof NewCouponForCustomer>(
    key: K,
    value: NewCouponForCustomer[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    getCustomer(id)
      .then((res) => setCustomer(res.data))
      .catch((err) =>
        setError(
          err?.response?.data?.message ||
            "Could not load this customer. Please try again."
        )
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError("That is not a valid customer id.");
      setLoading(false);
      return;
    }
    load();
  }, [id, load]);

  useEffect(() => {
    if (readOnly || !Number.isFinite(id)) return;
    getAssignableCoupons(id)
      .then((res) => setCoupons(res.data))
      .catch(() => setCoupons([]));
  }, [id, readOnly, customer?.assignedCoupons.length]);

  // Every write reports through the same two lines, so no action can succeed
  // or fail silently.
  const run = async (action: () => Promise<{ data: { message: string } }>) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await action();
      setNotice(res.data.message);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Customer not found."}
        </div>
        <button
          onClick={() => navigate("/customers")}
          className="mt-4 text-sm text-brand-500 hover:underline"
        >
          ← Back to customers
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <button
        onClick={() => navigate("/customers")}
        className="mb-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Customers
      </button>

      {/* Identity + actions */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {customer.name}
            </h1>
            {customer.disabled && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                Disabled
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ""}
            {customer.gender ? ` · ${customer.gender}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Joined {fmtDate(customer.createdAt)} · Last login{" "}
            {customer.lastLogin ? fmtDate(customer.lastLogin) : "never"}
          </p>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => sendPasswordReset(customer.userId))}
              title="Emails the customer a reset code. Passwords are hashed, so nobody — including this panel — can read the existing one."
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Send password reset
            </button>
            <button
              disabled={busy}
              onClick={() => {
                const next = !customer.disabled;
                const ok = window.confirm(
                  next
                    ? `Disable ${customer.name}? They will not be able to sign in.`
                    : `Re-enable ${customer.name}?`
                );
                if (ok) run(() => setCustomerDisabled(customer.userId, next));
              }}
              className={
                "rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 " +
                (customer.disabled
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700")
              }
            >
              {customer.disabled ? "Re-enable account" : "Disable account"}
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Headline numbers */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lifetime value" value={currency(customer.lifetimeValue)} />
        <Stat label="Orders" value={String(customer.orderCount)} />
        <Stat
          label="Cancellations"
          value={String(customer.cancelledCount)}
          tone={customer.cancelledCount > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        />
        <Stat label="Addresses" value={String(customer.addresses.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders */}
        <Card title="Orders" subtitle={`${customer.orders.length} total`}>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {customer.orders.map((o) => (
                <li key={o.orderId} className="flex items-center justify-between py-2">
                  <div>
                    <button
                      onClick={() => navigate(`/orders/${o.orderId}`)}
                      className="text-sm font-medium text-brand-500 hover:underline"
                    >
                      #{o.orderId}
                    </button>
                    <p className="text-xs text-gray-400">
                      {fmtDate(o.orderDate)}
                      {o.couponCode ? ` · ${o.couponCode}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + toneFor(o.orderStatus)}>
                      {o.orderStatus ?? "—"}
                    </span>
                    <span className="w-20 text-right text-sm text-gray-700 dark:text-gray-200">
                      {currency(o.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Addresses */}
        <Card title="Addresses" subtitle={`${customer.addresses.length} saved`}>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No saved addresses.</p>
          ) : (
            <ul className="space-y-3">
              {customer.addresses.map((a) => (
                <li
                  key={a.addressId}
                  className="rounded-lg border border-gray-100 p-3 text-sm dark:border-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {a.name || customer.name}
                    </span>
                    {a.default && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        Default
                      </span>
                    )}
                    {a.type && <span className="text-xs text-gray-400">{a.type}</span>}
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-300">
                    {[a.address1, a.address2, a.landmark].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {[a.city, a.state, a.pinCode].filter(Boolean).join(", ")}
                  </p>
                  {a.phone && <p className="mt-1 text-xs text-gray-400">{a.phone}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Store credit — a balance, and every movement behind it */}
        <Card title="Store credit" subtitle={`₹${Number(credit.balance).toLocaleString("en-IN")} available`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ₹{Number(credit.balance).toLocaleString("en-IN")}
            </p>
            {!readOnly && (
              <button
                onClick={handleAdjustCredit}
                disabled={busy}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Adjust
              </button>
            )}
          </div>

          {credit.entries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No store credit has ever been issued to this customer.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {credit.entries.slice(0, 8).map((e, i) => {
                const isIn = e.type === "CREDIT" || e.type === "REVERSAL";
                return (
                  <li key={i} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-white/90">
                        {e.note || (isIn ? "Credit added" : "Spent")}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-IN") : "—"}
                        {isIn && e.expiresAt
                          ? ` · expires ${new Date(e.expiresAt).toLocaleDateString("en-IN")}`
                          : ""}
                        {e.orderId ? ` · OD${e.orderId}` : ""}
                        {isIn && e.remaining != null ? ` · ₹${Number(e.remaining)} left` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        isIn ? "text-emerald-600" : "text-gray-500"
                      }`}
                    >
                      {isIn ? "+" : "−"}₹{Number(e.amount ?? 0).toLocaleString("en-IN")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Coupons */}
        <Card title="Coupons" subtitle={`${customer.assignedCoupons.filter((c) => c.active).length} active`}>
          {customer.assignedCoupons.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No coupons assigned to this customer.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {customer.assignedCoupons.map((c) => (
                <li key={c.couponUserId} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {c.code ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.discountType === "P" ? `${c.value}% off` : `${currency(c.value)} off`}
                      {" · used "}
                      {c.usedCount ?? 0}/{c.maxUsage ?? 1}
                      {c.validTill ? ` · till ${fmtDate(c.validTill)}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (c.active
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400")
                    }
                  >
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!readOnly && (
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {creating ? "Create a coupon for them" : "Assign a coupon"}
                </p>
                <button
                  type="button"
                  onClick={() => setCreating((v) => !v)}
                  className="text-xs font-medium text-brand-500 hover:underline"
                >
                  {creating ? "Assign existing instead" : "Create new"}
                </button>
              </div>

              {creating ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={draft.code}
                      onChange={(e) => draftField("code", e.target.value.toUpperCase().trim())}
                      placeholder="CODE"
                      className="min-w-[8rem] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                    <select
                      value={draft.discountType}
                      onChange={(e) => draftField("discountType", e.target.value as "P" | "F")}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    >
                      <option value="P">% off</option>
                      <option value="F">₹ off</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={draft.value}
                      onChange={(e) => draftField("value", Number(e.target.value) || 0)}
                      title="Discount amount"
                      className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      min={0}
                      value={draft.minPurchase ?? ""}
                      onChange={(e) =>
                        draftField("minPurchase", e.target.value === "" ? undefined : Number(e.target.value))
                      }
                      placeholder="Min purchase"
                      className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                    <input
                      type="number"
                      min={0}
                      value={draft.maxDiscount ?? ""}
                      onChange={(e) =>
                        draftField("maxDiscount", e.target.value === "" ? undefined : Number(e.target.value))
                      }
                      placeholder="Max discount"
                      title="Cap on a percentage discount"
                      className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                    <input
                      type="number"
                      min={1}
                      value={draft.usageLimit ?? 1}
                      onChange={(e) => draftField("usageLimit", Math.max(1, Number(e.target.value) || 1))}
                      title="How many times they may use it"
                      className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={draft.validFrom}
                      onChange={(e) => draftField("validFrom", e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="date"
                      value={draft.validTill}
                      onChange={(e) => draftField("validTill", e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                    <button
                      disabled={busy || !draft.code || draft.value <= 0 || draft.validTill < draft.validFrom}
                      onClick={() =>
                        run(() => createCouponForCustomer(customer.userId, draft)).then(() => {
                          setCreating(false);
                          setDraft((d) => ({ ...d, code: "" }));
                        })
                      }
                      className="ml-auto rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
                    >
                      Create &amp; assign
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Created for this customer only - nobody else can use the code.
                  </p>
                </div>
              ) : (
              <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={couponId}
                  onChange={(e) => setCouponId(e.target.value)}
                  className="min-w-[10rem] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="">Choose a coupon…</option>
                  {coupons.map((c) => (
                    <option key={c.couponId} value={c.couponId}>
                      {c.code} ({c.discountType === "P" ? `${c.value}%` : currency(c.value)})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(Math.max(1, Number(e.target.value) || 1))}
                  title="How many times they may use it"
                  className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
                <button
                  disabled={!couponId || busy}
                  onClick={() =>
                    run(() => assignCoupon(customer.userId, Number(couponId), maxUsage)).then(() =>
                      setCouponId("")
                    )
                  }
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
                >
                  Assign
                </button>
              </div>
              {coupons.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Every live coupon is already assigned to this customer - use
                  "Create new" to make one just for them.
                </p>
              )}
              </>
              )}
            </div>
          )}
        </Card>

        {/* Redemptions */}
        <Card title="Coupons used" subtitle={`${customer.redeemedCoupons.length} redemptions`}>
          {customer.redeemedCoupons.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This customer has not redeemed a coupon.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {customer.redeemedCoupons.map((r) => (
                <li key={r.usedCouponId} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {r.code ?? "—"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {r.orderId ? `order #${r.orderId} · ` : ""}
                    {fmtDate(r.usedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Cart */}
        <Card title="Cart" subtitle={`${customer.cart.length} items`}>
          <Basket lines={customer.cart} empty="Their cart is empty." />
        </Card>

        {/* Wishlist */}
        <Card title="Wishlist" subtitle={`${customer.wishlist.length} items`}>
          <Basket lines={customer.wishlist} empty="Their wishlist is empty." />
        </Card>
      </div>
    </div>
  );
}
