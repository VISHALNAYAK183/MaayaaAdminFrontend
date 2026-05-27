import { useEffect, useState } from "react";
import {
  getGstReport,
  downloadGstr1Csv,
  GstReport,
} from "../../api/gstApi";

const currency = (n: number | null | undefined) =>
  "₹" +
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const monthLabel = (yyyymm: string) => {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function GstReportPage() {
  const [month, setMonth] = useState<string>(currentMonth());
  const [data, setData] = useState<GstReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getGstReport(month);
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError("Failed to load GST report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [month]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadGstr1Csv(month);
      const blob = new Blob([res.data as Blob], { type: "text/csv;charset=utf-8" });
      // A 0-byte file uploads silently to the GST portal and gets rejected as
      // malformed — bail out here with a clear message instead.
      if (blob.size === 0) {
        alert(`No invoices for ${monthLabel(month)} — nothing to export.`);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gstr1-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      // responseType:"blob" means the error body comes back as a Blob — try to
      // surface the actual server message rather than a generic failure.
      const err = e as { response?: { data?: unknown } };
      const data = err?.response?.data;
      let serverMsg: string | undefined;
      if (data instanceof Blob) {
        try {
          serverMsg = JSON.parse(await data.text())?.message;
        } catch { /* not JSON */ }
      } else if (data && typeof data === "object" && "message" in data) {
        serverMsg = String((data as { message: unknown }).message);
      }
      alert(serverMsg || "Failed to download GSTR-1 CSV.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">GST Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Home / Finance / GST — monthly GSTR-3B numbers + GSTR-1 export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleDownload}
            disabled={downloading || !data}
            className="ml-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {downloading ? "Generating…" : "Download GSTR-1 CSV"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error || !data ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-sm text-red-700 dark:text-red-400">
          {error || "No data."}
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Period — {monthLabel(month)}
          </h2>

          {/* Output GST */}
          <Section title="Output GST (outward supplies)" subtitle="Goes to GSTR-3B Table 3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card label="Taxable Value" value={currency(data.outward.totalTaxableValue)} />
              <Card label="CGST" value={currency(data.outward.totalCgst)} />
              <Card label="SGST" value={currency(data.outward.totalSgst)} />
              <Card label="IGST" value={currency(data.outward.totalIgst)} />
              <Card
                label="Total GST Collected"
                value={currency(data.outward.totalGstCollected)}
                tone="emerald"
              />
            </div>

            {data.outward.byRate.length > 0 && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    By Rate Bucket
                  </h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      {["Rate", "Taxable Value", "GST Collected"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3 px-5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.outward.byRate.map((b) => (
                      <tr key={b.rate}>
                        <td className="py-3 px-5 text-sm font-semibold text-gray-900 dark:text-white">
                          {Number(b.rate).toFixed(2)}%
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-700 dark:text-gray-300">
                          {currency(b.taxableValue)}
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-700 dark:text-gray-300">
                          {currency(b.gstAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ITC */}
          <Section title="Input Tax Credit (eligible)" subtitle="Goes to GSTR-3B Table 4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card label="Taxable Value" value={currency(data.inward.totalTaxableValue)} />
              <Card label="ITC CGST" value={currency(data.inward.itcCgst)} />
              <Card label="ITC SGST" value={currency(data.inward.itcSgst)} />
              <Card label="ITC IGST" value={currency(data.inward.itcIgst)} />
              <Card label="Total ITC" value={currency(data.inward.totalItc)} tone="emerald" />
            </div>
          </Section>

          {/* Net payable */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Net GST Payable
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Output GST − ITC
              </p>
            </div>
            <p
              className={`text-3xl font-bold ${
                Number(data.netGstPayable) >= 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {currency(data.netGstPayable)}
            </p>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hand these numbers to your CA for GSTR-3B. Use the GSTR-1 CSV
            (button above) for the per-invoice line-item upload to the GST portal.
          </p>
        </>
      )}
    </div>
  );
}

function Section({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Card({
  label, value, tone,
}: { label: string; value: string; tone?: "emerald" | "red" }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p
        className={`text-xl font-bold mt-1 ${
          tone === "emerald"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
