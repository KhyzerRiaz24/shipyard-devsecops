// Page 3: a deliberately labelled design reference, linked to docs/architecture.md and Jenkinsfile.
import {
  LayoutDashboard,
  Box,
  Database,
  Server,
  ChevronRight,
  Check,
} from "lucide-react";
import { Learn } from "../components/Journal.jsx";
export default function Architecture() {
  const nodes = [
    {
      icon: LayoutDashboard,
      name: "Browser",
      detail: "React pages",
      file: "apps/web/src/App.jsx",
    },
    {
      icon: Server,
      name: "Web gateway",
      detail: "Static files + /api proxy",
      file: "apps/web/nginx.conf",
    },
    {
      icon: Box,
      name: "API service",
      detail: "Validate, authorise, measure",
      file: "apps/api/src/app.js",
    },
    {
      icon: Database,
      name: "MongoDB",
      detail: "Persist release entries",
      file: "apps/api/src/store.js",
    },
  ];
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">DESIGN REFERENCE · NOT LIVE TOPOLOGY</span>
        <h2>One request. Four stops.</h2>
        <p>
          Understand the application path before exploring the delivery
          platform.
        </p>
      </div>
      <section className="panel architecture">
        <div className="section-title">
          <h3>The application path</h3>
          <span className="subtle-tag">Three-tier application</span>
        </div>
        <div className="flow">
          {nodes.map((n, i) => (
            <div className="flow-item" key={n.name}>
              <div className="flow-node">
                <n.icon size={25} />
                <h4>{n.name}</h4>
                <p>{n.detail}</p>
                <code>{n.file}</code>
              </div>
              {i < nodes.length - 1 && (
                <ChevronRight className="flow-arrow" size={19} />
              )}
            </div>
          ))}
        </div>
        <p className="caption">
          The browser never connects to MongoDB. Compose and Kubernetes give
          services stable internal names.
        </p>
      </section>
      <section className="panel pipeline">
        <div className="section-title">
          <h3>The delivery path</h3>
          <code>Jenkinsfile → deploy/ → Argo CD</code>
        </div>
        {[
          ["01", "Test", "Run API, database integration, and UI tests."],
          [
            "02",
            "Inspect",
            "Check source, dependencies, secrets, and image vulnerabilities.",
          ],
          [
            "03",
            "Package",
            "Build containers and publish commit-tagged images.",
          ],
          [
            "04",
            "Promote",
            "Approve a Git change to the deployment image digests.",
          ],
          [
            "05",
            "Reconcile",
            "Argo CD applies the desired state; probes decide readiness.",
          ],
        ].map(([n, title, body]) => (
          <div className="pipeline-row" key={n}>
            <span>{n}</span>
            <strong>{title}</strong>
            <p>{body}</p>
          </div>
        ))}
      </section>
      <Learn>
        <p>
          Docker Compose runs the three application services locally.{" "}
          <code>deploy/base</code> defines Kubernetes workloads.{" "}
          <code>infra/terraform</code> creates AWS networking, EKS Auto Mode,
          and container registries.
        </p>
        <p>
          Jenkins builds artifacts; a reviewed Git change promotes them; Argo CD
          reconciles that Git configuration. Monitoring resources scrape API
          metrics. These components require setup before they are running.
        </p>
      </Learn>
    </>
  );
}
