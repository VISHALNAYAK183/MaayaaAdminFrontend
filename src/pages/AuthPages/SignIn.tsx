import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthLayout";
import AuthMessage from "../../components/auth/AuthMessage";
import SubmitButton from "../../components/auth/SubmitButton";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { useAuth } from "../../context/AuthContext";
import { AuthError } from "../../api/authApi";

export default function SignIn() {
  const { status, notice, signIn } = useAuth();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Where the guard bounced us from, so a deep link survives signing in.
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (status === "signedIn") return <Navigate to={from} replace />;
  if (status === "mfaRequired") return <Navigate to="/mfa" replace />;
  if (status === "mfaSetupRequired") return <Navigate to="/mfa/setup" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Resolving here does NOT mean signed in — it means the password was
      // accepted and a second factor is now owed. The status redirect above
      // picks up whichever step comes next.
      await signIn(identifier.trim(), password);
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : "Something went wrong. Please try again."
      );
      setBusy(false);
    }
  };

  return (
    <>
      <PageMeta title="Sign in | Maayaa Admin" description="Admin sign in" />
      <AuthLayout title="Sign in" subtitle="Enter your admin credentials to continue.">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {!error && notice && <AuthMessage tone="info">{notice}</AuthMessage>}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="identifier">Username or email</Label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoFocus
              required
              placeholder="admin"
              value={identifier}
              disabled={busy}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <SubmitButton busy={busy} disabled={!identifier.trim() || !password}>
            {busy ? "Checking…" : "Continue"}
          </SubmitButton>
        </form>
      </AuthLayout>
    </>
  );
}
