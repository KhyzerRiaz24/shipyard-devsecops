// Page 1: derives all counts from the latest 100 journal entries returned by /api/releases.
import {
  GitBranch,
  Anchor,
  ArrowUpRight,
  Plus,
  Box,
  Database,
  ShieldCheck,
  Network,
} from "lucide-react";
import { Learn, ReleaseList } from "../components/Journal.jsx";
import { DEMO_MODE } from "../mode.js";
export default function Overview({
  releases,
  system,
  loading,
  onAdd,
  onNavigate,
}) {
  const successful = releases.filter((r) => r.status === "succeeded").length;
  const latest = releases[0];
  return (
    <>
      <div className="hero">
        <div>
          <span className="eyebrow">THE DELIVERY WORKSPACE</span>
          <h2>
            Ship with confidence.
            <br />
            <span>Understand every step.</span>
          </h2>
          <p>
            A small application. A complete delivery story.
            <br />
            Follow your releases from code to running containers.
          </p>
          <button className="primary" onClick={onAdd}>
            Record a release <Plus size={17} />
          </button>
        </div>
        <div className="hero-graphic" aria-hidden="true">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="graphic-center">
            <Anchor size={44} />
          </div>
          <span className="graphic-tag t1">
            <Box size={15} /> build
          </span>
          <span className="graphic-tag t2">
            <ShieldCheck size={15} /> verify
          </span>
          <span className="graphic-tag t3">
            <GitBranch size={15} /> deliver
          </span>
          <span className="graphic-caption">CODE → CONTAINER → CLUSTER</span>
        </div>
      </div>
      <div className="metrics">
        <div>
          <span>Journal entries</span>
          <strong>{loading ? "—" : releases.length}</strong>
          <small>Latest 100 records</small>
        </div>
        <div>
          <span>Successful outcomes</span>
          <strong>
            {loading || !releases.length
              ? "—"
              : `${Math.round((successful / releases.length) * 100)}%`}
          </strong>
          <small>Manually recorded outcomes</small>
        </div>
        <div>
          <span>{DEMO_MODE ? "Storage mode" : "Database connection"}</span>
          <strong className="text-status">
            {DEMO_MODE
              ? "This browser"
              : system
                ? system.database === "connected"
                  ? "Connected"
                  : "Unavailable"
                : "Checking…"}
          </strong>
          <small>
            {DEMO_MODE
              ? "No server database connected"
              : "Live API readiness check"}
          </small>
        </div>
        <div>
          <span>{DEMO_MODE ? "Showcase mode" : "API version"}</span>
          <strong className="text-status version">
            {system?.version || "—"}
          </strong>
          <small>Running application version</small>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">RELEASE ACTIVITY</span>
              <h3>The latest chapter</h3>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("releases")}
            >
              View journal <ArrowUpRight size={16} />
            </button>
          </div>
          <ReleaseList releases={releases.slice(0, 5)} onAdd={onAdd} />
        </section>
        <aside className="delivery-note">
          <span className="eyebrow">BUILT TO BE EXPLAINED</span>
          <Network size={30} />
          <h3>
            Know what connects
            <br />
            to what.
          </h3>
          <p>
            Explore the request path, delivery pipeline, and the files behind
            each component.
          </p>
          <button
            className="text-button"
            onClick={() => onNavigate("architecture")}
          >
            Explore architecture <ArrowUpRight size={16} />
          </button>
          <div className="note-footer">
            <span className="dot" />{" "}
            {latest
              ? `Last entry: ${latest.service}`
              : "Ready for your first release"}
          </div>
        </aside>
      </div>
      <Learn>
        {DEMO_MODE && (
          <p>
            This public showcase uses <code>demo.js</code> and browser storage.
            It does not connect to MongoDB or a live AWS cluster. Build without{" "}
            <code>--mode demo</code> to use the full application described
            below.
          </p>
        )}
        <p>
          This page calls <code>GET /api/system</code> and{" "}
          <code>GET /api/releases</code>. The API checks MongoDB, then returns
          saved journal entries. Counts describe those entries; they do not
          measure Jenkins success or production availability.
        </p>
        <p>
          Files: <code>App.jsx → api.js → apps/api/src/app.js → store.js</code>.
          Prometheus collects separate real request metrics from{" "}
          <code>/metrics</code>.
        </p>
      </Learn>
    </>
  );
}
