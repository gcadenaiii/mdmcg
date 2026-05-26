import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useParams, Link } from "react-router";
import Layout from "../components/Layout";
import { api, PatientDetail } from "../api/client";

export default function PatientView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PatientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .patient(id)
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

  const { patient, gateways, sessions, is_online, ble_connected, total_samples, total_steps } = data;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        <Link to="/platform/" style={{ color: "var(--accent)" }}>
          Dashboard
        </Link>
        <span>/</span>
        <span>{patient.label}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            {patient.label}
          </h1>
          {patient.notes && (
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              {patient.notes}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Enrolled {new Date(patient.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            background: is_online ? "rgba(14,124,134,0.12)" : "rgba(107,114,128,0.12)",
            color: is_online ? "var(--accent)" : "var(--muted-foreground)",
          }}
        >
          {is_online ? "● Online" : "○ Offline"}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Gateways", value: gateways.length },
          { label: "Sessions", value: sessions.length },
          { label: "Total Samples", value: total_samples.toLocaleString() },
          { label: "Total Steps", value: total_steps.toLocaleString() },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-5 shadow-sm"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>
              {s.label}
            </p>
            <p className="text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Assigned gateways */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Assigned Gateways
        </h2>
        <div className="grid gap-3">
          {gateways.map((gw) => (
            <div
              key={gw.id}
              className="flex items-center justify-between px-5 py-4 rounded-xl shadow-sm"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div>
                <Link
                  to={`/platform/gateway/${gw.id}`}
                  className="font-medium hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  {gw.label}
                </Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {gw.pending_samples} pending samples
                </p>
              </div>
              <div className="flex gap-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: gw.is_online ? "rgba(14,124,134,0.12)" : "rgba(107,114,128,0.12)",
                    color: gw.is_online ? "var(--accent)" : "var(--muted-foreground)",
                  }}
                >
                  {gw.is_online ? "Online" : "Offline"}
                </span>
                {gw.is_online && (
                  <Link
                    to={`/platform/live/${gw.id}`}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                  >
                    Live
                  </Link>
                )}
              </div>
            </div>
          ))}
          {gateways.length === 0 && (
            <p style={{ color: "var(--muted-foreground)" }} className="text-sm">
              No gateways assigned.
            </p>
          )}
        </div>
      </div>

      {/* Steps chart */}
      {sessions.length > 0 && (() => {
        const chartData = [...sessions].reverse().map((s, i) => ({
          date: s.started_at
            ? new Date(s.started_at).toLocaleDateString([], { month: "short", day: "numeric" })
            : `#${i + 1}`,
          Steps: s.total_steps,
        }));
        return (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
              Steps per Session
            </h2>
            <div className="rounded-xl p-5 shadow-sm" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--border)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--border)" width={44} />
                  <Tooltip />
                  <Bar dataKey="Steps" fill="#0E7C86" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Sessions */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Sessions
        </h2>
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--secondary)" }}>
              <tr>
                {["Started", "Duration", "Samples", "Steps"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const duration =
                  s.started_at && s.ended_at
                    ? Math.round(
                        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000
                      ) + "s"
                    : "In progress";
                return (
                  <tr
                    key={s.id}
                    style={{
                      background: i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
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
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    No sessions yet.
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
