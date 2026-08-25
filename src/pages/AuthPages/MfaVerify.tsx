import { FormEvent, useState } from "react";
import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthLayout";
import AuthMessage from "../../components/auth/AuthMessage";
import CodeInput from "../../components/auth/CodeInput";
import SubmitButton from "../../components/auth/SubmitButton";
import { useAuth } from "../../context/AuthContext";
import { AuthError } from "../../api/authApi";

export default function MfaVerify() {
  const { status, username, completeMfa, restart } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "signedIn") return <Navigate to="/" replace />;
  // No MFA token in flight — someone deep-linked here. Back to the password step.
  if (status !== "mfaRequired") return <Navigate to="/signin" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await completeMfa(code);
    } catch (err) {
      if (err instanceof AuthError && err.code === "MFA_TOKEN_INVALID") {
        // The temporary token died mid-flow; the code is irrelevant now.
        restart(err.message);
        return;
      }
      setError(
        err instanceof AuthError ? err.message : "Something went wrong. Please try again."
      );
      setCode("");
      setBusy(false);
    }
  };

  return (
    <>
      <PageMeta title="Two-factor | Maayaa Admin" description="Two-factor verification" />
      <AuthLayout
        title="Two-factor authentication"
        subtitle={
          <>
            Open your authenticator app and enter the current six-digit code
            {username ? <> for <span className="font-medium">{username}</span></> : null}.
          </>
        }
      >
        {error && <AuthMessage tone="error">{error}</AuthMessage>}

        <form onSubmit={onSubmit} className="space-y-5">
          <CodeInput value={code} onChange={setCode} error={!!error} disabled={busy} />

          <SubmitButton busy={busy} disabled={code.length !== 6}>
            {busy ? "Verifying…" : "Verify and sign in"}
          </SubmitButton>
        </form>

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
