import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getInbox, markAlertsRead, type InboxItem } from "../api/overviewApi";

/**
 * One copy of the bell's contents for the whole signed-in panel, shared by the
 * bell and the landing page's "Needs attention", so marking an alert read in
 * one place clears it in the other.
 */

type InboxState = {
  items: InboxItem[];
  loading: boolean;
  failed: boolean;
  refresh: () => void;
  /** Hides the alerts at once and tells the server; puts them back if it refuses. */
  markRead: (alerts: InboxItem[]) => Promise<boolean>;
};

const InboxContext = createContext<InboxState | undefined>(undefined);

const REFRESH_MS = 60_000;

export const InboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    request.current?.abort();
    const ctrl = new AbortController();
    request.current = ctrl;
    getInbox(ctrl.signal)
      .then((inbox) => {
        if (request.current !== ctrl) return;
        setItems(inbox.items);
        setFailed(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted || err?.name === "CanceledError") return;
        if (request.current === ctrl) setFailed(true);
      })
      .finally(() => {
        if (request.current === ctrl) setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      request.current?.abort();
    };
  }, [refresh]);

  const markRead = useCallback(async (alerts: InboxItem[]) => {
    const marks = alerts
      .filter((a) => a.kind === "ALERT" && a.fingerprint)
      .map((a) => ({ key: a.key, fingerprint: a.fingerprint as string }));
    if (marks.length === 0) return true;
    const keys = new Set(marks.map((m) => m.key));
    let removed: InboxItem[] = [];
    setItems((prev) => {
      removed = prev.filter((i) => keys.has(i.key));
      return prev.filter((i) => !keys.has(i.key));
    });
    try {
      await markAlertsRead(marks);
      return true;
    } catch {
      setItems((prev) => [...removed.filter((r) => !prev.some((p) => p.key === r.key)), ...prev]);
      return false;
    }
  }, []);

  const value = useMemo(() => ({ items, loading, failed, refresh, markRead }), [items, loading, failed, refresh, markRead]);
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useInbox = () => {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within an InboxProvider");
  return ctx;
};
