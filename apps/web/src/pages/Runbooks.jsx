// Page 4: copyable operational steps. Full commands and recovery boundaries live in docs/runbooks.md.
import { useState } from "react";
import { GitBranch, Database, Activity, Terminal, Check } from "lucide-react";
import { Learn } from "../components/Journal.jsx";
export default function Runbooks() {
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const guides = [
    {
      icon: Terminal,
      title: "Start the local workspace",
      text: "Generate local secrets once, then build and start the application.",
      command:
        "node scripts/setup.mjs\ndocker compose up --build -d\ndocker compose ps",
      link: "README.md",
    },
    {
      icon: Activity,
      title: "Check application readiness",
      text: "Readiness verifies the database; liveness verifies the API process.",
      command:
        "curl --fail http://localhost:8080/health/ready\ncurl --fail http://localhost:8080/api/system",
      link: "docs/runbooks.md",
    },
    {
      icon: Database,
      title: "Back up the journal",
      text: "Create a MongoDB archive before recovery exercises. See the runbook before restoring.",
      command: "bash scripts/backup.sh",
      link: "scripts/backup.sh → docs/runbooks.md",
    },
    {
      icon: GitBranch,
      title: "Observe a cluster rollout",
      text: "After configuring kubectl for your cluster, wait for readiness and inspect events.",
      command:
        "kubectl -n shipyard rollout status deployment/api --timeout=180s\nkubectl -n shipyard get pods\nkubectl -n shipyard get events --sort-by=.lastTimestamp",
      link: "deploy/base/api.yaml",
    },
  ];
  async function copy(text, title) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(title);
      setCopyError("");
    } catch {
      setCopyError("Clipboard unavailable. Select and copy the command text.");
    }
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">PRACTISE THE RECOVERY</span>
        <h2>Calm, repeatable operations.</h2>
        <p>
          Small runbooks for the moments that matter. Run commands from the
          repository root.
        </p>
      </div>
      {copyError && (
        <p role="alert" className="error">
          {copyError}
        </p>
      )}
      <div className="runbook-grid">
        {guides.map((g) => (
          <section className="panel runbook" key={g.title}>
            <g.icon size={23} />
            <h3>{g.title}</h3>
            <p>{g.text}</p>
            <pre>
              <code>{g.command}</code>
            </pre>
            <div className="runbook-bottom">
              <small>{g.link}</small>
              <button
                className="text-button"
                onClick={() => copy(g.command, g.title)}
              >
                {copied === g.title ? (
                  <>
                    <Check size={15} /> Copied
                  </>
                ) : (
                  "Copy commands"
                )}
              </button>
            </div>
          </section>
        ))}
      </div>
      <Learn>
        <p>
          These commands are reference instructions; this page does not execute
          them or access your AWS account. Local operations use{" "}
          <code>compose.yaml</code>. Cluster operations use your configured
          Kubernetes context.
        </p>
        <p>
          Recovery and teardown steps are explained in{" "}
          <code>docs/runbooks.md</code>. Record actual observations and
          measurements in <code>evidence/</code> for your portfolio.
        </p>
      </Learn>
    </>
  );
}
