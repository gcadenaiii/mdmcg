import { useEffect, useState } from "react";
import { Link } from "react-router";
import Layout from "../components/Layout";
import { api, DashboardData } from "../api/client";

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: online ? "rgba(14,124,134,0.12)" : "rgba(107,114,128,0.12)",
        color: online ? "var(--accent)" : "var(--muted-foreground)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: online ? "var(--accent)" : "var(--muted-foreground)" }}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (error)
    return (
      <Layout>
        <div className="text-center py-20" style={{ color: "var(--destructive)" }}>
          Failed to load: {error}
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

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--muted-foreground)" }} className="text-sm">
          Real-time gateway and patient overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Gateways", value: data.gateways.length },
          { label: "Online", value: data.online_count },
          { label: "Patients", value: data.total_patients },
          { label: "Total Samples", value: data.total_samples.toLocaleString() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-5 shadow-sm"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>
              {stat.label}
            </p>
            <p className="text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Gateway list */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Gateways
        </h2>
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--secondary)" }}>
              <tr>
                {["Gateway", "Patient", "Status", "BLE", "Pending", "Last Sync"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.gateways.map((gw, i) => (
                <tr
                  key={gw.id}
                  style={{
                    background: i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/platform/gateway/${gw.id}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      {gw.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {gw.patient_label ? (
                      <Link
                        to={`/platform/patient/${gw.patient_id}`}
                        className="hover:underline"
                        style={{ color: "var(--foreground)" }}
                      >
                        {gw.patient_label}
                      </Link>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge online={gw.is_online} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge online={gw.ble_connected} />
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {gw.pending_samples}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {gw.last_sync ? new Date(gw.last_sync).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {data.gateways.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    No gateways registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Recent Sessions
        </h2>
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--secondary)" }}>
              <tr>
                {["Gateway", "Started", "Duration", "Samples", "Steps"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent_sessions.map((s, i) => {
                const duration =
                  s.started_at && s.ended_at
                    ? Math.round(
                        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000
                      ) + "s"
                    : "—";
                return (
                  <tr
                    key={s.id}
                    style={{
                      background: i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/platform/gateway/${s.gateway_id}`}
                        className="hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        {s.gateway_id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {s.started_at ? new Date(s.started_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {duration}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {s.sample_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {s.total_steps.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {data.recent_sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    No sessions recorded yet.
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
