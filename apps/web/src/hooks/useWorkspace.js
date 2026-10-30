/** Loads the two live API resources for App.jsx. Only the newest refresh may update the page. */
import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "../api.js";
export function useWorkspace() {
  const [releases, setReleases] = useState([]);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError("");
    const [journal, health] = await Promise.allSettled([
      request("/api/releases"),
      request("/api/system"),
    ]);
    // An older response or an unmounted page must not overwrite newer data.
    if (requestId !== latestRequest.current) return;
    if (journal.status === "fulfilled") setReleases(journal.value.releases);
    setSystem(health.status === "fulfilled" ? health.value : null);
    if (journal.status === "rejected" || health.status === "rejected") {
      setError(
        "Could not refresh all data. Previously loaded entries may be out of date. Check the API and database, then retry.",
      );
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    return () => {
      latestRequest.current++;
    };
  }, [refresh]);
  return { releases, system, loading, error, refresh };
}
