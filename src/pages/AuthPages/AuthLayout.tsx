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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-baseline justify-center gap-2.5">
          <span className="maayaa-mark text-xl text-gray-900">MAAYAA</span>
          <span className="text-xs tracking-wide text-gray-500">Admin</span>
        </div>

        <div className="shell-panel p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-gray-800">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
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
