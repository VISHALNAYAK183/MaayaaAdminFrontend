import { ReactNode } from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

/** Shared shell for the signed-out screens: sign in, MFA verify, MFA setup. */
export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div className="w-full max-w-md">
        {/* Text wordmark, matching AppHeader. The bundled /images/logo/*.svg
            are still the TailAdmin template's artwork. */}
        <div className="mb-8 flex justify-center">
          <span className="text-2xl font-bold tracking-tight text-brand-500 dark:text-white">
            Maayaa{" "}
            <span className="font-medium text-gray-800 dark:text-gray-300">Admin</span>
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-800 sm:p-8">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </div>
  );
}
