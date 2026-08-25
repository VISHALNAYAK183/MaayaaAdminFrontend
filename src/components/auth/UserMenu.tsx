import { useState } from "react";
import { useNavigate } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "../../context/AuthContext";

export default function UserMenu() {
  const { username, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    setOpen(false);
    // Local only — the backend is stateless with no logout endpoint, so this
    // ends the session in this browser and nowhere else.
    signOut();
    navigate("/signin", { replace: true });
  };

  const initial = username?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="dropdown-toggle flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-medium text-white">
          {initial}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
            {username ?? "Admin"}
          </span>
        </span>
      </button>

      <Dropdown isOpen={open} onClose={() => setOpen(false)} className="w-56 p-2">
        <div className="border-b border-gray-200 px-3 pb-2 pt-1 dark:border-gray-800">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
            {username ?? "Admin"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{role ?? "ADMIN"}</p>
        </div>
        <DropdownItem
          onClick={handleSignOut}
          className="mt-1 rounded-lg text-error-600 hover:bg-error-50 hover:text-error-700 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          Sign out
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
