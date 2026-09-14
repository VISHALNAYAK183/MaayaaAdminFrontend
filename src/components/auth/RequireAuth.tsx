import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { canAccess } from "../../config/roles";

/**
 * Layout route that gates everything behind a valid ACCESS token, then checks
 * the signed-in role against the route.
 *
 * The role check is a UX guard, not a security boundary — the backend refuses
 * the underlying calls regardless. It exists so a Sales user who types
 * /admin-users gets a clear answer instead of a page of failed requests.
 */
export default function RequireAuth() {
  const { status, role, signOut } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
      </div>
    );
  }

  if (status !== "signedIn") {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!canAccess(role, location.pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="shell-panel w-full max-w-md p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-800">
            You don't have access to this page
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your role is <span className="font-medium">{role ?? "unknown"}</span>. Ask an
            admin if you need access to this section.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href="/"
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Back to dashboard
            </a>
            <button
              onClick={signOut}
              className="rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 shell-press"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
