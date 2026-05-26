import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import Layout from "../components/Layout";
import { api, GatewayDetail } from "../api/client";

function CalBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{
              background: i < value ? "var(--accent)" : "var(--border)",
            }}
          />
        ))}
      </div>
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {value}/3
      </span>
    </div>
  );
}

export default function GatewayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GatewayDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .gateway(id)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <Layout>
        <div className="text-center py-20" style={{ color: "var(--destructive)" }}>
          {error}
        </div>
      </Layout>
    );

  if (!data)
    return (
      <Layout>
        <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>
          Loading…
        </div>
      </Layout>
    );

  const { gateway: gw, patient, sessions, samples, sync_events } = data;
  const online = gw.is_online;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        <Link to="/platform/" style={{ color: "var(--accent)" }}>
          Dashboard
        </Link>
        <span>/</span>
        <span>{gw.label}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            {gw.label}
          </h1>
          {patient && (
            <Link
              to={`/platform/patient/${patient.id}`}
              className="text-sm hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Patient: {patient.label}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: online ? "rgba(14,124,134,0.12)" : "rgba(107,114,128,0.12)",
              color: online ? "var(--accent)" : "var(--muted-foreground)",
            }}
          >
            {online ? "● Online" : "○ Offline"}
          </span>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: gw.ble_connected ? "rgba(14,124,134,0.12)" : "rgba(107,114,128,0.12)",
              color: gw.ble_connected ? "var(--accent)" : "var(--muted-foreground)",
            }}
          >
            {gw.ble_connected ? "BLE Connected" : "BLE Disconnected"}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Pending Samples", value: gw.pending_samples },
          { label: "Sessions", value: sessions.length },
          { label: "Last Heartbeat", value: gw.last_heartbeat ? new Date(gw.last_heartbeat).toLocaleTimeString() : "—" },
          { label: "Last Sync", value: gw.last_sync ? new Date(gw.last_sync).toLocaleTimeString() : "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 shadow-sm"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>
              {s.label}
            </p>
            <p className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Live button */}
      <div className="mb-10">
        <Link
          to={`/platform/live/${gw.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          ▶ Open Live View
        </Link>
      </div>

      {/* Recent samples */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Recent Samples
        </h2>
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--secondary)" }}>
              <tr>
                {["Time", "Euler X/Y/Z", "Steps", "Cal System"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {samples.slice(0, 20).map((s, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(s.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: "var(--foreground)" }}>
                    {s.euler.x.toFixed(1)} / {s.euler.y.toFixed(1)} / {s.euler.z.toFixed(1)}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--muted-foreground)" }}>
                    {s.step_count}
                  </td>
                  <td className="px-4 py-2">
                    <CalBar value={s.calibration.system} />
                  </td>
                </tr>
              ))}
              {samples.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    No samples yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync events */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Recent Sync Events
        </h2>
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--secondary)" }}>
              <tr>
                {["Time", "Batch", "Received", "Accepted", "Dupes"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sync_events.map((e, i) => (
                <tr
                  key={e.id}
                  style={{
                    background: i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(e.received_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--muted-foreground)" }}>
                    #{e.batch_sequence}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--muted-foreground)" }}>
                    {e.samples_received}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--muted-foreground)" }}>
                    {e.samples_accepted}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--muted-foreground)" }}>
                    {e.samples_duplicate}
                  </td>
                </tr>
              ))}
              {sync_events.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    No sync events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
