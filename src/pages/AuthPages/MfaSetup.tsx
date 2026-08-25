import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthLayout";
import AuthMessage from "../../components/auth/AuthMessage";
import CodeInput from "../../components/auth/CodeInput";
import SubmitButton from "../../components/auth/SubmitButton";
import { useAuth } from "../../context/AuthContext";
import { AuthError } from "../../api/authApi";
import type { MfaSetupResponse } from "../../api/authApi";

/** "ABCD EFGH IJKL" — easier to type by hand than one unbroken run. */
const groupSecret = (secret: string) => secret.match(/.{1,4}/g)?.join(" ") ?? secret;

export default function MfaSetup() {
  const { status, username, beginMfaSetup, completeMfaSetup, restart } = useAuth();

  const [enrolment, setEnrolment] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status === "signedIn") return <Navigate to="/" replace />;
  if (status !== "mfaSetupRequired") return <Navigate to="/signin" replace />;

  /**
   * Deliberately behind a button rather than an effect. Each call to
   * /mfa/setup mints a brand-new TOTP secret and switches MFA off until
   * verification succeeds — running it automatically on mount would silently
   * invalidate an authenticator entry on every visit or re-render.
   */
  const generate = async () => {
    setError(null);
    setBusy(true);
    try {
      setEnrolment(await beginMfaSetup());
    } catch (err) {
      if (err instanceof AuthError && err.code === "MFA_TOKEN_INVALID") {
        restart(err.message);
        return;
      }
      setError(err instanceof AuthError ? err.message : "Couldn't start setup. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // On success this signs us out: enrolment does not mint an ACCESS token,
      // so the admin signs in again with their new authenticator.
      await completeMfaSetup(code);
    } catch (err) {
      if (err instanceof AuthError && err.code === "MFA_TOKEN_INVALID") {
        restart(err.message);
        return;
      }
      setError(err instanceof AuthError ? err.message : "Couldn't verify that code.");
      setCode("");
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!enrolment) return;
    try {
      await navigator.clipboard.writeText(enrolment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the secret is on screen to copy by hand */
    }
  };

  return (
    <>
      <PageMeta title="Set up two-factor | Maayaa Admin" description="Two-factor setup" />
      <AuthLayout
        title="Set up two-factor authentication"
        subtitle={
          enrolment
            ? "Scan this with your authenticator app, then enter the code it shows."
            : "This account doesn't have an authenticator enrolled yet."
        }
      >
        {error && <AuthMessage tone="error">{error}</AuthMessage>}

        {!enrolment ? (
          <div className="space-y-5">
            <AuthMessage tone="info">
              Generating a new code replaces any authenticator entry already set up for
              {username ? <span className="font-medium"> {username}</span> : " this account"}.
              Older entries will stop working.
            </AuthMessage>

            <SubmitButton type="button" onClick={generate} busy={busy}>
              {busy ? "Generating…" : "Generate QR code"}
            </SubmitButton>
          </div>
        ) : (
          <div className="space-y-5">
            {/* QR stays on white in both themes — dark modules on a dark
                background will not scan. */}
            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={enrolment.otpauthUri} size={180} level="M" />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">
                Or enter this key manually
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                  {groupSecret(enrolment.secret)}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <form onSubmit={onConfirm} className="space-y-5">
              <CodeInput
                value={code}
                onChange={setCode}
                error={!!error}
                disabled={busy}
                label="Code from your authenticator"
              />
              <SubmitButton busy={busy} disabled={code.length !== 6}>
                {busy ? "Verifying…" : "Turn on two-factor"}
              </SubmitButton>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => restart()}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Back to sign in
        </button>
      </AuthLayout>
    </>
  );
}
