import { Link, Outlet, useLocation } from "react-router";
import { InboxProvider } from "../context/InboxContext";
import { useReadOnly } from "../hooks/useReadOnly";
import useGoBack from "../hooks/useGoBack";
import { pageForPath } from "../config/sections";
import TopBar from "./TopBar";
import PageErrorBoundary from "./PageErrorBoundary";
import { ChevronLeftIcon } from "./shellIcons";

const AppLayout: React.FC = () => {
  const readOnly = useReadOnly();
  const { pathname } = useLocation();

  return (
    <InboxProvider>
      <div className="min-h-screen bg-gray-50">
        <TopBar />
        {readOnly && (
          <div className="border-b border-warning-200 bg-warning-50 px-4 py-2.5 text-center text-sm text-warning-700 md:px-6">
            You have read-only access. You can view everything here, but not make changes.
          </div>
        )}
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-4 md:px-6 md:pt-5">
          {pathname !== "/" && <Wayfinding pathname={pathname} />}
          <PageErrorBoundary key={pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </InboxProvider>
  );
};

/**
 * Where am I, and the way back. With no sidebar this line is the page's place
 * in the panel: the dashboard, the section, and the page when you are deeper
 * than it (an order, a customer, a section of the home page).
 *
 * The arrow is its own Back button and goes to the page you came from, as the
 * browser's back does. It used to be part of the Dashboard link, so from
 * Coupons > Coupon usage it skipped straight to the dashboard.
 */
function Wayfinding({ pathname }: { pathname: string }) {
  const page = pageForPath(pathname);
  const deeper = !!page && pathname !== page.path && pathname !== page.path.replace(/\/add$/, "");
  // Opened directly, with nothing behind it: up one level instead.
  const goBack = useGoBack(deeper && page ? page.path : "/");

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex min-h-6 items-center gap-1.5 text-xs text-gray-500">
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        title="Back"
        className="inline-flex size-6 items-center justify-center rounded text-gray-600 hover:bg-brand-50 hover:text-gray-900"
      >
        <ChevronLeftIcon className="size-3.5" />
      </button>
      <Link to="/" className="rounded px-1 py-0.5 font-medium text-gray-600 hover:bg-brand-50 hover:text-gray-900">
        Dashboard
      </Link>
      {page && (
        <>
          <span aria-hidden="true" className="text-gray-300">/</span>
          <span>{page.group}</span>
          <span aria-hidden="true" className="text-gray-300">/</span>
          {deeper ? (
            <Link to={page.path} className="rounded px-1 py-0.5 font-medium text-gray-600 hover:bg-brand-50 hover:text-gray-900">
              {page.name}
            </Link>
          ) : (
            <span aria-current="page" className="font-semibold text-gray-800">{page.name}</span>
          )}
        </>
      )}
    </nav>
  );
}

export default AppLayout;
