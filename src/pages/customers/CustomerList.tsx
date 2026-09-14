import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  listCustomers,
  type CustomerListItem,
} from "../../api/customersApi";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import Pagination from "../../components/ui/Pagination";

const PAGE_SIZE = 25;

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

/** "never" reads better than a dash for an account that has not signed in. */
const fmtLastLogin = (iso: string | null) => (iso ? fmtDate(iso) : "never");

export default function CustomerList() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  // A new search starts at the first page — staying on page 4 of the old
  // result set shows an empty table and looks like a failure.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    listCustomers(page, PAGE_SIZE, debouncedSearch || undefined)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.content);
        setTotal(res.data.totalElements);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ||
            "Could not load customers. Please try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[27px] leading-tight tracking-tight font-extrabold text-gray-900">
            Customers
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading && rows.length === 0
              ? "Loading…"
              : `${total.toLocaleString("en-IN")} ${
                  total === 1 ? "customer" : "customers"
                } registered`}
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or phone"
          className="w-full sm:w-72 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="shell-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left shell-label">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium text-right">LTV</th>
                <th className="px-4 py-3 font-medium text-right">Orders</th>
                <th className="px-4 py-3 font-medium text-right">Cancelled</th>
                <th className="px-4 py-3 font-medium text-right">Addr</th>
                <th className="px-4 py-3 font-medium text-right">Cart</th>
                <th className="px-4 py-3 font-medium text-right">Wish</th>
                <th className="px-4 py-3 font-medium text-right">Coupons</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => (
                <tr
                  key={c.userId}
                  onClick={() => navigate(`/customers/${c.userId}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">
                      {c.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {currency(c.lifetimeValue)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.cancelledCount > 0 ? (
                      <span className="text-amber-600">
                        {c.cancelledCount}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.addressCount}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.cartCount}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.wishlistCount}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.activeCouponCount}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fmtLastLogin(c.lastLogin)}
                  </td>
                  <td className="px-4 py-3">
                    {c.disabled ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Disabled
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    {debouncedSearch
                      ? `No customer matches "${debouncedSearch}".`
                      : "No customers yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
