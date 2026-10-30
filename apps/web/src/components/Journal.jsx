/** Shared journal UI. Overview.jsx and Releases.jsx use the same entries and explanation panel. */
import { DEMO_MODE } from "../mode.js";
import { GitBranch, Plus, CircleHelp } from "lucide-react";
const statusLabels = {
  succeeded: "Succeeded",
  failed: "Failed",
  rolled_back: "Rolled back",
};
const date = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function Learn({ children }) {
  return (
    <details className="learn">
      <summary>
        <CircleHelp size={16} /> How this page works
      </summary>
      <div>{children}</div>
    </details>
  );
}
function Status({ status }) {
  return (
    <span className={`badge ${status}`}>
      <span />
      {statusLabels[status] || status}
    </span>
  );
}

// Shared read-only table. React escapes journal notes rather than interpreting user-supplied HTML.
export function ReleaseList({ releases, onAdd }) {
  if (!releases.length)
    return (
      <div className="empty">
        <GitBranch size={28} />
        <h3>Your first release starts here.</h3>
        <p>
          {DEMO_MODE
            ? "Create a demo entry to explore the journal. It stays in this browser."
            : "Record an outcome after testing a deployment. Nothing is pre-filled or simulated."}
        </p>
        <button className="secondary" onClick={onAdd}>
          Record a release <Plus size={15} />
        </button>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Service / version</th>
            <th>Environment</th>
            <th>Outcome</th>
            <th>Recorded</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.service}</strong>
                <code>{r.version}</code>
                {r.notes && <small>{r.notes}</small>}
              </td>
              <td>
                <span className="environment">{r.environment}</span>
              </td>
              <td>
                <Status status={r.status} />
              </td>
              <td className="muted nowrap">
                {date(r.createdAt)}
                <small>
                  {r.source === "browser-demo" ? "Demo entry" : "Manual entry"}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
