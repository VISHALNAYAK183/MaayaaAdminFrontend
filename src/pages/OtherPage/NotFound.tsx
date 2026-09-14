import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

export default function NotFound() {
  return (
    <>
      <PageMeta title="Maayaa Admin · 404" description="Page not found" />
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <h1 className="mb-2 text-6xl font-bold text-gray-800">
          404
        </h1>
        <p className="mb-6 text-base text-gray-600">
          We can't find the page you're looking for.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </>
  );
}
