import React, { useState, useRef, useEffect } from "react";
import {
  addCoupon,
  updateCoupon,
  deleteCoupon,
  getCoupons,
  getUsers,
  removeUserFromCoupon,
  Coupon,
  User,
} from "../../api/adminCoupon";

// ─── Smart Generator ──────────────────────────────────────────────────────────
const CONTEXT_MAP: Record<string, string> = {
  new: "NEWUSER", newuser: "NEWUSER", first: "FIRST", firsttime: "FIRST",
  welcome: "WELCOME", save: "SAVE", flash: "FLASH", sale: "SALE",
  summer: "SUMMER", winter: "WINTER", fest: "FEST", deal: "DEAL",
  special: "SPECIAL", vip: "VIP", loyalty: "LOYAL", refer: "REFER",
  gift: "GIFT", diwali: "DIWALI", holi: "HOLI", christmas: "XMAS",
  vishal: "VISHAL",
};
const RAND_PREFIXES = ["SPARK","BLOOM","SWIFT","BOLT","NOVA","PEAK","RIFT","ZINC","ECHO","FUSE"];

function smartGenerate(prefix: string, type: "P" | "F", value: number): string {
  const suffix = value > 0 ? String(Math.round(value)) : String(Math.floor(Math.random() * 45) + 5);
  const flat = type === "F" ? "OFF" : "";
  if (prefix.trim()) {
    const clean = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const mapped = CONTEXT_MAP[clean.toLowerCase()] || clean;
    return `${mapped}${suffix}${flat}`;
  }
  if (value > 0) {
    const p = RAND_PREFIXES[Math.floor(Math.random() * RAND_PREFIXES.length)];
    return `${p}${suffix}${flat}`;
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Calendar Picker ──────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEK_DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

interface CalendarPickerProps {
  value: string;
  onChange: (v: string) => void;
  minDate?: string;
  placeholder?: string;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ value, onChange, minDate, placeholder }) => {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const init = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const display = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const toStr = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all
          ${open ? "border-blue-500 ring-2 ring-blue-100 bg-white" : "border-slate-200 bg-slate-50 hover:border-slate-300"}
          ${display ? "text-slate-800" : "text-slate-400"}`}
      >
        <span>{display || placeholder || "Select date"}</span>
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-72 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
            <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 text-lg">‹</button>
            <span className="text-sm font-bold text-slate-800">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 text-lg">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 p-2">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>
            ))}
            {cells.map((day, i) => {
              const disabled = !!day && !!minDate && toStr(day) < minDate;
              const selected = !!day && value === toStr(day);
              const isToday = !!day && today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              return (
                <button
                  key={i} type="button" disabled={!day || disabled}
                  onClick={() => day && !disabled && (onChange(toStr(day)), setOpen(false))}
                  className={`text-center text-xs py-1.5 rounded-md transition-colors
                    ${!day ? "invisible" : ""}
                    ${disabled ? "text-slate-300 cursor-not-allowed" : "cursor-pointer"}
                    ${selected ? "bg-slate-800 text-white font-bold" : ""}
                    ${isToday && !selected ? "bg-blue-50 text-blue-600 font-bold" : ""}
                    ${!selected && !isToday && !disabled ? "hover:bg-slate-100 text-slate-700" : ""}`}
                >
                  {day || ""}
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                const y = today.getFullYear(), mo = String(today.getMonth() + 1).padStart(2, "0"), d = String(today.getDate()).padStart(2, "0");
                onChange(`${y}-${mo}-${d}`);
                setViewYear(y); setViewMonth(today.getMonth());
                setOpen(false);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >Today</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Shared Helpers ───────────────────────────────────────────────────────────
const Fld = ({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
      {label}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <span className="text-xs text-slate-400">{hint}</span>}
  </div>
);

const SH = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-lg bg-slate-50 border border-slate-200 rounded-xl">{icon}</div>
    <div>
      <div className="text-sm font-bold text-slate-800">{title}</div>
      <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
    </div>
  </div>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" />
    <path strokeLinecap="round" d="m21 21-4.35-4.35" />
  </svg>
);

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300";

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-100",   text: "text-blue-700"   },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-amber-100",  text: "text-amber-700"   },
  { bg: "bg-rose-100",   text: "text-rose-700"    },
  { bg: "bg-cyan-100",   text: "text-cyan-700"    },
  { bg: "bg-fuchsia-100",text: "text-fuchsia-700" },
  { bg: "bg-teal-100",   text: "text-teal-700"    },
];
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

// ─── Users Side Panel ─────────────────────────────────────────────────────────
interface UsersPanelProps {
  coupon: Coupon;
  users: User[];
  onClose: () => void;
  onUserRemoved: (userId: number) => void;
}

const UsersPanel: React.FC<UsersPanelProps> = ({ coupon, users, onClose, onUserRemoved }) => {
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [localUserIds, setLocalUserIds] = useState<number[]>(coupon.userIds || []);

  useEffect(() => { setLocalUserIds(coupon.userIds || []); }, [coupon.userIds]);

  const assignedUsers = localUserIds
    .map(uid => users.find(u => u.userId === uid))
    .filter(Boolean) as User[];

  const handleRemove = async (userId: number) => {
    if (!coupon.couponId) return;
    if (!window.confirm("Remove this user from the coupon?")) return;
    setRemovingId(userId);
    try {
      await removeUserFromCoupon(coupon.couponId, userId);
      setLocalUserIds(prev => prev.filter(id => id !== userId));
      onUserRemoved(userId);
    } catch {
      alert("Failed to remove user. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" style={{ backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Panel Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-extrabold text-blue-600 text-base tracking-widest">{coupon.code}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${coupon.discountType === "P" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                {coupon.discountType === "P" ? `${coupon.value}% off` : `₹${coupon.value} off`}
              </span>
            </div>
            <p className="text-xs text-slate-400">Assigned users — you can remove users here</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none mt-0.5">×</button>
        </div>

        {/* Count bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-semibold text-slate-500">
            {assignedUsers.length === 0 ? "Open to all users — no restriction set" : `${assignedUsers.length} user${assignedUsers.length !== 1 ? "s" : ""} assigned`}
          </span>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {assignedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">No user restriction</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">This coupon is available to all users on the platform</p>
              </div>
            </div>
          ) : (
            <ul className="py-3 px-3 flex flex-col gap-1">
              {assignedUsers.map(user => {
                const color = avatarColor(user.userId);
                const isRemoving = removingId === user.userId;
                return (
                  <li key={user.userId} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isRemoving ? "opacity-50" : "hover:bg-slate-50"}`}>
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${color.bg} ${color.text}`}>
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                      {user.phone && <p className="text-xs text-slate-400 mt-0.5">{user.phone}</p>}
                    </div>
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded shrink-0">#{user.userId}</span>
                    <button onClick={() => handleRemove(user.userId)} disabled={isRemoving} title="Remove user from coupon"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                      {isRemoving ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Panel Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-0.5">Valid From</p>
              <p className="text-xs font-semibold text-slate-700">{new Date(coupon.validFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-0.5">Valid Till</p>
              <p className="text-xs font-semibold text-slate-700">{new Date(coupon.validTill).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          </div>
          {(coupon.minPurchase || coupon.maxDiscount || coupon.usageLimit) ? (
            <div className="flex gap-2">
              {coupon.minPurchase ? (
                <div className="flex-1 bg-white rounded-xl border border-slate-200 px-3 py-2.5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-0.5">Min Purchase</p>
                  <p className="text-xs font-semibold text-slate-700">₹{coupon.minPurchase}</p>
                </div>
              ) : null}
              {coupon.maxDiscount ? (
                <div className="flex-1 bg-white rounded-xl border border-slate-200 px-3 py-2.5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-0.5">Max Discount</p>
                  <p className="text-xs font-semibold text-slate-700">₹{coupon.maxDiscount}</p>
                </div>
              ) : null}
              {coupon.usageLimit ? (
                <div className="flex-1 bg-white rounded-xl border border-slate-200 px-3 py-2.5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-0.5">Usage Limit</p>
                  <p className="text-xs font-semibold text-slate-700">{coupon.usageLimit}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [lockedUserIds, setLockedUserIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [panelCoupon, setPanelCoupon] = useState<Coupon | null>(null);
  const [search, setSearch] = useState("");
  const [tableLoading, setTableLoading] = useState(false);

  const [form, setForm] = useState<Coupon>({
    code: "", discountType: "P", value: 0,
    minPurchase: 0, maxDiscount: 0, usageLimit: 0,
    validFrom: "", validTill: "", userIds: [],
  });

  const [genPrefix, setGenPrefix] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setTableLoading(true);
    try {
      const [couponsRes, usersRes] = await Promise.all([getCoupons(), getUsers()]);
      setCoupons(couponsRes.data);
      setUsers(usersRes.data);
    } catch {
      setStatus({ type: "error", msg: "Failed to load data" });
    } finally {
      setTableLoading(false);
    }
  };

  const refreshPreview = (prefix: string, type: "P" | "F", value: number) =>
    setPreview(smartGenerate(prefix, type, value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStatus(null);
    setForm(prev => ({ ...prev, [name]: name === "discountType" ? (value as "P" | "F") : value }));
    if (name === "discountType" || name === "value") {
      const t = name === "discountType" ? (value as "P" | "F") : form.discountType;
      const v = name === "value" ? Number(value) : form.value;
      refreshPreview(genPrefix, t, v);
    }
  };

  const handleUserSelect = (userId: number) => {
    if (editingId && lockedUserIds.includes(userId)) return;
    setSelectedUserIds(prev => {
      const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
      setForm(f => ({ ...f, userIds: next }));
      return next;
    });
  };

  const applyCode = () => {
    const c = preview || smartGenerate(genPrefix, form.discountType, form.value);
    setForm(f => ({ ...f, code: c })); setPreview(c);
  };

  const regenerate = () => {
    const c = smartGenerate(genPrefix, form.discountType, form.value);
    setPreview(c); setForm(f => ({ ...f, code: c }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setStatus(null);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        minPurchase: Number(form.minPurchase) || undefined,
        maxDiscount: Number(form.maxDiscount) || undefined,
        usageLimit: Number(form.usageLimit) || undefined,
        userIds: (() => {
          if (editingId) {
            const newlyAdded = selectedUserIds.filter(id => !lockedUserIds.includes(id));
            return newlyAdded.length > 0 ? newlyAdded : undefined;
          }
          return selectedUserIds.length > 0 ? selectedUserIds : undefined;
        })(),
      };
      if (editingId) {
        await updateCoupon(editingId, payload);
        setStatus({ type: "success", msg: `Coupon "${form.code}" updated successfully!` });
      } else {
        await addCoupon(payload);
        setStatus({ type: "success", msg: `Coupon "${form.code}" created successfully!` });
      }
      reset(); loadData();
    } catch (err: any) {
      setStatus({ type: "error", msg: err?.response?.data?.message || `Failed to ${editingId ? "update" : "create"} coupon.` });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    const existingUserIds = coupon.userIds || [];
    setForm({
      code: coupon.code, discountType: coupon.discountType, value: coupon.value,
      minPurchase: coupon.minPurchase || 0, maxDiscount: coupon.maxDiscount || 0,
      usageLimit: coupon.usageLimit || 0, validFrom: coupon.validFrom, validTill: coupon.validTill,
    });
    setSelectedUserIds(existingUserIds);
    setLockedUserIds(existingUserIds);
    setEditingId(coupon.couponId || null);
    setShowForm(true); setStatus(null); setPanelCoupon(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await deleteCoupon(id);
      setStatus({ type: "success", msg: "Coupon deleted successfully!" });
      if (panelCoupon?.couponId === id) setPanelCoupon(null);
      loadData();
    } catch {
      setStatus({ type: "error", msg: "Failed to delete coupon" });
    }
  };

  const handleUserRemovedFromPanel = (userId: number) => {
    if (!panelCoupon) return;
    const updatedCoupon = { ...panelCoupon, userIds: (panelCoupon.userIds || []).filter(id => id !== userId) };
    setPanelCoupon(updatedCoupon);
    setCoupons(prev => prev.map(c => c.couponId === panelCoupon.couponId ? { ...c, userIds: (c.userIds || []).filter(id => id !== userId) } : c));
  };

  const reset = () => {
    setForm({ code: "", discountType: "P", value: 0, minPurchase: 0, maxDiscount: 0, usageLimit: 0, validFrom: "", validTill: "", userIds: [] });
    setSelectedUserIds([]); setLockedUserIds([]);
    setGenPrefix(""); setPreview(""); setStatus(null);
    setEditingId(null); setShowForm(false);
  };

  const activeCoupons = coupons.filter(c => new Date(c.validTill) >= new Date());
  const filtered = coupons.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            {["Dashboard", "Promotions"].map(c => (
              <React.Fragment key={c}>
                <span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">{c}</span>
                <span className="text-xs text-slate-300">›</span>
              </React.Fragment>
            ))}
            <span className="text-xs text-slate-600 font-semibold">Coupon Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Coupon Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your discount coupons</p>
        </div>
        <button
          onClick={() => { setLockedUserIds([]); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-sm font-semibold">New Coupon</span>
        </button>
      </div>

      {/* ── Status Banner ── */}
      {status && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium mb-4
          ${status.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold shrink-0">
            {status.type === "success" ? "✓" : "✕"}
          </span>
          <span className="flex-1">{status.msg}</span>
          <button onClick={() => setStatus(null)} className="opacity-40 hover:opacity-70 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? "Edit Coupon" : "Create New Coupon"}</h2>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">

              {/* Discount Config */}
              <SH icon="💸" title="Discount Configuration" desc="Choose the type and amount of the discount" />
              <div className="grid grid-cols-2 gap-5 mb-6">
                <Fld label="Discount Type" req>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    {(["P", "F"] as const).map(t => (
                      <button key={t} type="button"
                        onClick={() => handleChange({ target: { name: "discountType", value: t } } as any)}
                        className={`flex-1 py-2.5 text-sm font-medium transition-all
                          ${form.discountType === t ? "bg-slate-800 text-white font-bold" : "text-slate-500 hover:bg-slate-100"}`}
                      >
                        {t === "P" ? "% Percentage" : "₹ Flat Amount"}
                      </button>
                    ))}
                  </div>
                </Fld>
                <Fld label={`Discount Value (${form.discountType === "P" ? "%" : "₹"})`} req>
                  <div className="relative">
                    <input type="number" name="value" value={form.value || ""} onChange={handleChange}
                      placeholder={form.discountType === "P" ? "e.g. 10" : "e.g. 150"}
                      className={`${inputCls} pr-9`} min={0} required />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                      {form.discountType === "P" ? "%" : "₹"}
                    </span>
                  </div>
                </Fld>
              </div>

              {/* Smart Generator */}
              <SH icon="✨" title="Smart Code Generator" desc={`Keyword + value → "vishal" + 50 → VISHAL50`} />
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-dashed border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Keyword / Prefix <em className="normal-case font-normal text-slate-400 not-italic">(optional)</em>
                    </label>
                    <input value={genPrefix}
                      onChange={e => { setGenPrefix(e.target.value); refreshPreview(e.target.value, form.discountType, form.value); }}
                      placeholder='"new", "summer", "vishal" …' className={inputCls} />
                  </div>
                  <div className="text-xl text-blue-300 mt-7 shrink-0">→</div>
                  <div className="min-w-[180px] shrink-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Preview</label>
                    <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2 min-h-[42px]">
                      <span className="font-mono font-extrabold text-blue-700 tracking-widest flex-1 text-sm">{preview || "———"}</span>
                      <button type="button" onClick={regenerate}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-50 hover:bg-blue-100 text-blue-500 text-base transition-colors">↻</button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={applyCode}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold tracking-wide transition-colors">
                  ↓ &nbsp; Use this code
                </button>
              </div>

              {/* Purchase Rules */}
              <SH icon="⚙️" title="Purchase Rules" desc="Thresholds and usage caps (all optional)" />
              <div className="grid grid-cols-3 gap-5 mb-6">
                <Fld label="Min Purchase (₹)" hint="Min cart value required">
                  <div className="relative">
                    <input type="number" name="minPurchase" value={form.minPurchase || ""} onChange={handleChange}
                      placeholder="e.g. 500" className={`${inputCls} pr-7`} min={0} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">₹</span>
                  </div>
                </Fld>
                <Fld label="Max Discount (₹)" hint="Cap on discount amount">
                  <div className="relative">
                    <input type="number" name="maxDiscount" value={form.maxDiscount || ""} onChange={handleChange}
                      placeholder="e.g. 50" className={`${inputCls} pr-7`} min={0} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">₹</span>
                  </div>
                </Fld>
                <Fld label="Usage Limit" hint="0 = unlimited uses">
                  <input type="number" name="usageLimit" value={form.usageLimit || ""} onChange={handleChange}
                    placeholder="e.g. 1" className={inputCls} min={0} />
                </Fld>
              </div>

              {/* Validity Window */}
              <SH icon="📅" title="Validity Window" desc="Pick dates using the calendar" />
              <div className="grid grid-cols-2 gap-5 mb-6">
                <Fld label="Valid From" req>
                  <CalendarPicker value={form.validFrom} onChange={v => { setStatus(null); setForm(f => ({ ...f, validFrom: v })); }} placeholder="Select start date" />
                </Fld>
                <Fld label="Valid Till" req>
                  <CalendarPicker value={form.validTill} onChange={v => { setStatus(null); setForm(f => ({ ...f, validTill: v })); }} minDate={form.validFrom || undefined} placeholder="Select end date" />
                </Fld>
              </div>

              {/* User Selection */}
              <SH icon="👥" title="User Selection"
                desc={editingId ? "Already assigned users are locked — you can only add new users here." : "Select users who can use this coupon (optional)"} />
              <div className="mb-6">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          {!editingId && (
                            <input type="checkbox"
                              checked={selectedUserIds.length === users.length && users.length > 0}
                              onChange={() => {
                                if (selectedUserIds.length === users.length) { setSelectedUserIds([]); setForm(f => ({ ...f, userIds: [] })); }
                                else { const allIds = users.map(u => u.userId); setSelectedUserIds(allIds); setForm(f => ({ ...f, userIds: allIds })); }
                              }}
                              className="rounded border-slate-300" />
                          )}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">User ID</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Phone</th>
                        {editingId && <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => {
                        const isLocked = editingId ? lockedUserIds.includes(user.userId) : false;
                        const isChecked = selectedUserIds.includes(user.userId);
                        return (
                          <tr key={user.userId} className={`border-b border-slate-100 ${isLocked ? "bg-slate-50" : "hover:bg-slate-50"}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={isChecked} disabled={isLocked}
                                onChange={() => handleUserSelect(user.userId)}
                                className={`rounded border-slate-300 ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">{user.userId}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                            <td className="px-4 py-3 text-slate-600">{user.email}</td>
                            <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                            {editingId && (
                              <td className="px-4 py-3">
                                {isLocked ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                                    Already assigned
                                  </span>
                                ) : isChecked ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">+ Will be added</span>
                                ) : null}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {editingId
                    ? `${lockedUserIds.length} already assigned · ${selectedUserIds.length - lockedUserIds.length} new to add`
                    : `${selectedUserIds.length} user${selectedUserIds.length !== 1 ? "s" : ""} selected`}
                </p>
              </div>

              {/* Coupon Code */}
              <SH icon="🏷️" title="Coupon Code" desc="Auto-filled by the generator above — or type your own" />
              <div className="max-w-md mb-6">
                <Fld label="Coupon Code" req hint="Use the generator above or type manually">
                  <input name="code" value={form.code} onChange={handleChange} placeholder="e.g. VISHAL50"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300 font-mono font-extrabold text-lg tracking-widest uppercase text-blue-900"
                    required />
                </Fld>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                <button type="button" onClick={reset}
                  className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex items-center px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {editingId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <><CheckIcon />{editingId ? "Update Coupon" : "Create Coupon"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Users Side Panel ── */}
      {panelCoupon && (
        <UsersPanel coupon={panelCoupon} users={users} onClose={() => setPanelCoupon(null)} onUserRemoved={handleUserRemovedFromPanel} />
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Coupons</p>
          <p className="text-2xl font-extrabold text-slate-900">{coupons.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Active</p>
          <p className="text-2xl font-extrabold text-slate-900">{activeCoupons.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Search Results</p>
          <p className="text-2xl font-extrabold text-slate-900">{filtered.length}</p>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-bold text-slate-800">All Coupons</h2>
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by code…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white placeholder:text-slate-300 transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Value</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Min Purchase</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Max Discount</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Usage Limit</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Valid From</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Valid Till</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Users</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr><td colSpan={11} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-xs text-slate-400 font-medium">Loading coupons…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">🏷️</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">{search ? "No coupons match your search" : "No coupons yet"}</p>
                      <p className="text-xs text-slate-400 mt-1">{search ? "Try a different keyword" : 'Click "New Coupon" to create one'}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                filtered.map(coupon => {
                  const isActive = panelCoupon?.couponId === coupon.couponId;
                  const isExpired = new Date(coupon.validTill) < new Date();
                  return (
                    <tr key={coupon.couponId}
                      className={`border-t border-slate-100 transition-colors ${isActive ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{coupon.couponId}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600">{coupon.code}</span>
                          {isExpired && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-500">Expired</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${coupon.discountType === "P" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                          {coupon.discountType === "P" ? "%" : "₹"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{coupon.value}{coupon.discountType === "P" ? "%" : "₹"}</td>
                      <td className="px-6 py-4 text-slate-600">{coupon.minPurchase ? `₹${coupon.minPurchase}` : <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-4 text-slate-600">{coupon.maxDiscount ? `₹${coupon.maxDiscount}` : <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-4 text-slate-600">{coupon.usageLimit || "∞"}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(coupon.validFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(coupon.validTill).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setPanelCoupon(isActive ? null : coupon)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                            ${isActive ? "bg-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {coupon.userIds?.length || 0} users
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(coupon)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => coupon.couponId && handleDelete(coupon.couponId)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {!tableLoading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-600">{coupons.length}</span> coupons
              {search && <> matching <span className="font-semibold text-slate-600">"{search}"</span></>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponManagement;