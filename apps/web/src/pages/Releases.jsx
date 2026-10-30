// Page 2: filtering is browser-side over the returned journal window; writes use ReleaseDialog below.
import { useState } from "react";
import { Plus } from "lucide-react";
import { Learn, ReleaseList } from "../components/Journal.jsx";
import { DEMO_MODE } from "../mode.js";
export default function Releases({ releases, onAdd }) {
  const [environment, setEnvironment] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = releases.filter(
    (r) =>
      (environment === "all" || r.environment === environment) &&
      `${r.service} ${r.version} ${r.notes}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">A TRACEABLE DELIVERY HISTORY</span>
        <h2>Every release has a story.</h2>
        <p>Record what changed, where it ran, and what you learned.</p>
      </div>
      <section className="panel">
        <div className="section-title">
          <h3>
            Release journal <span className="count">{releases.length}</span>
          </h3>
          <button className="primary" onClick={onAdd}>
            <Plus size={16} /> Record release
          </button>
        </div>
        <div className="filters">
          <input
            aria-label="Search releases"
            placeholder="Search service, version, or notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            <option value="all">All environments</option>
            {["development", "staging", "production"].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        {releases.length && !filtered.length ? (
          <p className="empty">No entries match these filters.</p>
        ) : (
          <ReleaseList releases={filtered} onAdd={onAdd} />
        )}
      </section>
      <Learn>
        {DEMO_MODE && (
          <p>
            In this public demo, entries are saved only in your browser and no
            write token is needed. Clear this site's browser storage to reset
            the demo. The full Docker build uses the authenticated MongoDB path
            below.
          </p>
        )}
        <p>
          Entries are saved in MongoDB through <code>POST /api/releases</code>.
          A write token is required and stays only in memory while the form is
          open. Reads are public; never record secrets.
        </p>
        <p>
          This is a manual release journal, not a deployment control panel.
          Recording “succeeded” does not trigger Jenkins or deploy anything.
          Search and environment filters apply to the latest 100 entries.
        </p>
      </Learn>
    </>
  );
}
