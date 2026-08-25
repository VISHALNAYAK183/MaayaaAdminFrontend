import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { useAuth } from "../../context/AuthContext";
import {
  adminUserError,
  changeAdminPassword,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  resetAdminMfa,
  updateAdminStatus,
  type AdminUser,
} from "../../api/adminUsers";

const MIN_PASSWORD = 12; // mirrors AdminUserService.MIN_PASSWORD_LENGTH

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

type Dialog =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "password"; user: AdminUser }
  | { kind: "confirm"; user: AdminUser; action: "delete" | "resetMfa" | "deactivate" | "activate" };

export default function AdminUserManagement() {
  const { username: me } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // add form
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  // password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [replacementPassword, setReplacementPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const { data } = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setPageError(adminUserError(err, "Couldn't load admin accounts"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeDialog = () => {
    setDialog({ kind: "none" });
    setFormError(null);
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setCurrentPassword("");
    setReplacementPassword("");
  };

  const announce = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 4000);
  };

  const submitAdd = async () => {
    setFormError(null);
    setBusy(true);
    try {
      await createAdminUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
      });
      closeDialog();
      announce(`${newUsername.trim()} added. They'll set up two-factor on first sign-in.`);
      load();
    } catch (err) {
      setFormError(adminUserError(err, "Couldn't create that admin"));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    if (dialog.kind !== "password") return;
    setFormError(null);
    setBusy(true);
    try {
      const isSelf = dialog.user.username === me;
      await changeAdminPassword(dialog.user.id, {
        ...(isSelf ? { currentPassword } : {}),
        newPassword: replacementPassword,
      });
      closeDialog();
      announce("Password updated. Existing sessions stay signed in.");
    } catch (err) {
      setFormError(adminUserError(err, "Couldn't change that password"));
    } finally {
      setBusy(false);
    }
  };

  const submitConfirm = async () => {
    if (dialog.kind !== "confirm") return;
    const { user, action } = dialog;
    setFormError(null);
    setBusy(true);
    try {
      if (action === "delete") await deleteAdminUser(user.id);
      if (action === "resetMfa") await resetAdminMfa(user.id);
      if (action === "deactivate") await updateAdminStatus(user.id, "INACTIVE");
      if (action === "activate") await updateAdminStatus(user.id, "ACTIVE");
      closeDialog();
      announce(
        action === "delete"
          ? `${user.username} removed.`
          : action === "resetMfa"
          ? `Two-factor reset for ${user.username}. They'll enrol again at next sign-in.`
          : `${user.username} is now ${action === "activate" ? "active" : "inactive"}.`
      );
      load();
    } catch (err) {
      setFormError(adminUserError(err, "Couldn't complete that"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageMeta title="Admin users | Maayaa Admin" description="Manage admin accounts" />
      <PageBreadcrumb pageTitle="Admin Users" />

      {flash && (
        <div className="mb-4 rounded-lg border border-success-500/30 bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
          {flash}
        </div>
      )}
      {pageError && (
        <div className="mb-4 rounded-lg border border-error-500/30 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {pageError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Admin accounts
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {users.length} account{users.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={() => setDialog({ kind: "add" })}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Add admin
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : users.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
              No admin accounts found.
            </p>
          ) : (
            <table className="min-w-full">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Two-factor</th>
                  <th className="px-5 py-3">Last sign-in</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {users.map((u) => {
                  const isSelf = u.username === me;
                  const active = u.status === "ACTIVE";
                  return (
                    <tr key={u.id} className="text-sm">
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-800 dark:text-white/90">
                          {u.username}
                          {isSelf && (
                            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-normal text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                              you
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            active
                              ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            u.mfaEnabled
                              ? "text-success-600 dark:text-success-400"
                              : "text-warning-600 dark:text-warning-400"
                          }
                        >
                          {u.mfaEnabled ? "Enrolled" : "Not set up"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                        {fmt(u.lastLoginAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => setDialog({ kind: "password", user: u })}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            Password
                          </button>
                          {u.mfaEnabled && (
                            <button
                              onClick={() =>
                                setDialog({ kind: "confirm", user: u, action: "resetMfa" })
                              }
                              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                              Reset 2FA
                            </button>
                          )}
                          {!isSelf && (
                            <>
                              <button
                                onClick={() =>
                                  setDialog({
                                    kind: "confirm",
                                    user: u,
                                    action: active ? "deactivate" : "activate",
                                  })
                                }
                                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                              >
                                {active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() =>
                                  setDialog({ kind: "confirm", user: u, action: "delete" })
                                }
                                className="rounded-lg border border-error-200 px-2.5 py-1.5 text-xs text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add admin ─────────────────────────────────────────────────────── */}
      <Modal isOpen={dialog.kind === "add"} onClose={closeDialog} className="max-w-md p-6">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">Add admin</h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          They'll be prompted to set up two-factor the first time they sign in.
        </p>
        {formError && (
          <div className="mt-4 rounded-lg border border-error-500/30 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="new-username">Username</Label>
            <Input
              id="new-username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="jane"
            />
          </div>
          <div>
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="jane@maayaawear.com"
            />
          </div>
          <div>
            <Label htmlFor="new-password">Temporary password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint={`At least ${MIN_PASSWORD} characters. Share it over something private, not email.`}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeDialog}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={submitAdd}
            disabled={
              busy ||
              !newUsername.trim() ||
              !newEmail.trim() ||
              newPassword.length < MIN_PASSWORD
            }
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add admin"}
          </button>
        </div>
      </Modal>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <Modal
        isOpen={dialog.kind === "password"}
        onClose={closeDialog}
        className="max-w-md p-6"
      >
        {dialog.kind === "password" && (
          <>
            <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
              Change password
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              For <span className="font-medium">{dialog.user.username}</span>.
            </p>
            {formError && (
              <div className="mt-4 rounded-lg border border-error-500/30 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                {formError}
              </div>
            )}
            <div className="mt-5 space-y-4">
              {dialog.user.username === me && (
                <div>
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="replacement-password">New password</Label>
                <Input
                  id="replacement-password"
                  type="password"
                  autoComplete="new-password"
                  value={replacementPassword}
                  onChange={(e) => setReplacementPassword(e.target.value)}
                  hint={`At least ${MIN_PASSWORD} characters.`}
                />
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Changing a password does not sign out existing sessions — tokens stay valid
              until they expire.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDialog}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submitPassword}
                disabled={
                  busy ||
                  replacementPassword.length < MIN_PASSWORD ||
                  (dialog.user.username === me && !currentPassword)
                }
                className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Update password"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Confirmations ─────────────────────────────────────────────────── */}
      <Modal isOpen={dialog.kind === "confirm"} onClose={closeDialog} className="max-w-md p-6">
        {dialog.kind === "confirm" && (
          <>
            <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
              {dialog.action === "delete" && `Delete ${dialog.user.username}?`}
              {dialog.action === "resetMfa" && `Reset two-factor for ${dialog.user.username}?`}
              {dialog.action === "deactivate" && `Deactivate ${dialog.user.username}?`}
              {dialog.action === "activate" && `Activate ${dialog.user.username}?`}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {dialog.action === "delete" &&
                "This permanently removes the account. It can't be undone from here."}
              {dialog.action === "resetMfa" &&
                "Their current authenticator entry stops working. They'll scan a new QR code the next time they sign in."}
              {dialog.action === "deactivate" &&
                "They won't be able to sign in. Any session they already have stays valid until its token expires."}
              {dialog.action === "activate" && "They'll be able to sign in again."}
            </p>
            {formError && (
              <div className="mt-4 rounded-lg border border-error-500/30 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                {formError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDialog}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submitConfirm}
                disabled={busy}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
                  dialog.action === "delete"
                    ? "bg-error-500 hover:bg-error-600"
                    : "bg-brand-500 hover:bg-brand-600"
                }`}
              >
                {busy ? "Working…" : "Confirm"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
