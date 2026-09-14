/** Inline error / notice strip for the auth screens. */
export default function AuthMessage({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: React.ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-error-500/30 bg-error-50 text-error-600"
      : "border-brand-500/30 bg-brand-50 text-brand-600";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
