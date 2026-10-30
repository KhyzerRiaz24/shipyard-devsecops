/** App shell. Four navigable pages share the same live API data.
 * Overview -> release journal -> POST /api/releases -> app.js -> store.js -> MongoDB.
 * Architecture and Runbooks explain the corresponding infrastructure/docs; they aren't live cloud status.
 */
import { useEffect, useState } from "react";
import {
  Anchor,
  LayoutDashboard,
  GitBranch,
  Network,
  BookOpen,
  RefreshCw,
  Check,
  ChevronRight,
  Clock,
  Menu,
} from "lucide-react";
import { useWorkspace } from "./hooks/useWorkspace.js";
import { DEMO_MODE, SOURCE_URL } from "./mode.js";

import Overview from "./pages/Overview.jsx";
import Releases from "./pages/Releases.jsx";
import Architecture from "./pages/Architecture.jsx";
import Runbooks from "./pages/Runbooks.jsx";
import ReleaseDialog from "./components/ReleaseDialog.jsx";
const pages = [
  ["overview", "Overview", LayoutDashboard, Overview],
  ["releases", "Release journal", GitBranch, Releases],
  ["architecture", "Architecture", Network, Architecture],
  ["runbooks", "Runbooks", BookOpen, Runbooks],
];
export default function App() {
  const initialPage = () =>
    pages.some(([id]) => id === location.hash.slice(1))
      ? location.hash.slice(1)
      : "overview";
  const [page, setPage] = useState(initialPage);
  const [menu, setMenu] = useState(false);
  const { releases, system, loading, error, refresh } = useWorkspace();
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const onHash = () => {
      // The skip-to-content anchor must not navigate away from the current page.
      if (location.hash !== "#main") setPage(initialPage());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [, pageTitle, , Page] = pages.find(([id]) => id === page) || pages[0];
  function navigate(id) {
    location.hash = id;
    setPage(id);
    setMenu(false);
  }
  const add = () => {
    setMessage("");
    setRecording(true);
  };
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand"
          href="#overview"
          onClick={() => navigate("overview")}
        >
          <span>
            <Anchor size={24} />
          </span>
          shipyard<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {pages.map(([id, label, Icon]) => (
            <a
              key={id}
              href={`#${id}`}
              className={page === id ? "active" : ""}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {page === id && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">A DEVOPS FIELD GUIDE</span>
          <p>
            Build it.
            <br />
            Break it.
            <br />
            <strong>Know how to fix it.</strong>
          </p>
          <span className="small">A portfolio you can explain.</span>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">SY</span>
          <div>
            <strong>Portfolio workspace</strong>
            <small>DevOps portfolio</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{pageTitle}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <span
                className={`dot ${system?.database === "connected" ? "" : "offline"}`}
              />
              {DEMO_MODE
                ? "Browser demo"
                : system?.database === "connected"
                  ? "API connected"
                  : "API not ready"}
            </span>
            <button
              className="icon-button"
              aria-label="Refresh data"
              disabled={loading}
              onClick={refresh}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {DEMO_MODE && (
            <aside className="demo-banner" aria-label="About this demo">
              <div>
                <strong>Interactive portfolio demo</strong>
                <span>
                  Entries stay in this browser. The full API, database and
                  DevOps setup are in the repository.
                </span>
              </div>
              <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                View source ↗
              </a>
            </aside>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button className="text-button" onClick={refresh}>
                Retry
              </button>
            </div>
          )}
          {message && (
            <div className="success" role="status">
              <Check size={16} />
              {message}
            </div>
          )}
          <Page
            releases={releases}
            system={system}
            loading={loading}
            onAdd={add}
            onNavigate={navigate}
          />
          <footer className="page-footer">
            <span>Shipyard / Built to be understood.</span>
            <span>
              <Clock size={13} /> Journal entries are manually recorded.
            </span>
          </footer>
        </main>
      </div>
      {recording && (
        <ReleaseDialog
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            setMessage("Release recorded.");
            refresh();
          }}
        />
      )}
    </div>
  );
}
