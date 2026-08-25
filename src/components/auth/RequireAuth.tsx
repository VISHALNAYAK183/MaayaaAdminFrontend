import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

/**
 * Layout route that gates everything behind a valid ACCESS token. While the
 * stored token is being checked we render nothing but a spinner — redirecting
 * during "loading" would bounce a signed-in admin to the login screen on every
 * refresh.
 */
export default function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-500" />
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

  return <Outlet />;
}
