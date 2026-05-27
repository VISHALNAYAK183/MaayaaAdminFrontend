import { useEffect, useState } from "react";

/**
 * Holds back a rapidly-changing value until it has settled for `delay` ms.
 *
 * Use this to wrap a search input before sending it to the server — without
 * it, every keystroke fires a network request and the user types faster than
 * the backend can respond. Pattern:
 *
 *   const [search, setSearch] = useState("");
 *   const debouncedSearch = useDebouncedValue(search, 300);
 *   useEffect(() => { load({ search: debouncedSearch }); }, [debouncedSearch]);
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
