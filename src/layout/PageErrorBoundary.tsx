import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router";

/**
 * One page failing to render leaves the rest of the panel usable.
 *
 * Without this, an answer in a shape a page did not expect (a list that
 * arrives as an object, a field gone missing) unmounted everything, top bar
 * included, and left a blank screen with no way back but the address bar.
 * The layout keys it by path, so moving to another page starts it fresh.
 */
export default class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page failed to render", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="shell-panel mx-auto mt-8 max-w-lg p-8 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">This page couldn't be shown</h1>
        <p className="mt-2 text-sm text-gray-500">
          Something in what the server sent back didn't fit the page. Reload to try again, or go back to the
          dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shell-press rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Reload
          </button>
          <Link
            to="/"
            className="shell-press rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-brand-400"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }
}
