// Native modal supplies focus trapping and Escape handling. Token is erased on unmount.
import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { request } from "../api.js";
import { DEMO_MODE } from "../mode.js";
export default function ReleaseDialog({ onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const { token, ...release } = data;
    try {
      await request("/api/releases", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(!DEMO_MODE && { authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(release),
      });
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      aria-labelledby="release-title"
    >
      <div className="dialog-title">
        <div>
          <span className="eyebrow">MANUAL JOURNAL ENTRY</span>
          <h2 id="release-title">Record a release</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={saving}
        >
          <X size={20} />
        </button>
      </div>
      <p className="muted">
        {DEMO_MODE
          ? "Try a journal entry. It is saved only in this browser; no deployment is triggered."
          : "Document an observed outcome. This form does not deploy software."}
      </p>
      <form onSubmit={submit}>
        <div className="form-row">
          <label>
            Service
            <input
              name="service"
              autoFocus
              required
              maxLength={60}
              pattern="[a-zA-Z0-9][a-zA-Z0-9 ._\-]*"
              placeholder="e.g. api"
            />
          </label>
          <label>
            Version / commit
            <input
              name="version"
              required
              maxLength={80}
              placeholder="e.g. a1b2c3d"
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Environment
            <select name="environment" defaultValue="staging">
              <option>development</option>
              <option>staging</option>
              <option>production</option>
            </select>
          </label>
          <label>
            Outcome
            <select name="status">
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="rolled_back">Rolled back</option>
            </select>
          </label>
        </div>
        <label>
          What happened?
          <textarea
            name="notes"
            maxLength={500}
            rows={3}
            placeholder="What changed, what you checked, and what you learned."
          />
        </label>
        {!DEMO_MODE && (
          <label>
            Write token
            <input
              type="password"
              name="token"
              aria-label="Write token"
              required
              minLength={32}
              autoComplete="off"
              placeholder="Your local WRITE_TOKEN"
            />
            <small>
              From your .env file. Kept only while this form is open.
            </small>
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary submit" disabled={saving}>
          {saving ? "Saving…" : "Save release"}
          {!saving && <Plus size={16} />}
        </button>
      </form>
    </dialog>
  );
}
