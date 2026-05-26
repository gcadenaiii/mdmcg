import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import Layout from "../components/Layout";

interface LiveSample {
  timestamp: number;
  euler: { x: number; y: number; z: number };
  linear_acceleration: { x: number; y: number; z: number };
  step_count: number;
  calibration: { system: number; gyroscope: number; accelerometer: number; magnetometer: number };
}

function CalDot({ value }: { value: number }) {
  const colors = ["#d4183d", "#f59e0b", "#0E7C86", "#0E7C86"];
  return (
    <span
      className="inline-block w-3 h-3 rounded-full"
      style={{ background: colors[Math.min(value, 3)] }}
      title={`${value}/3`}
    />
  );
}

export default function LiveView() {
  const { gatewayId } = useParams<{ gatewayId: string }>();
  const [samples, setSamples] = useState<LiveSample[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!gatewayId) return;

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/platform/ws/gateway/${gatewayId}`;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as LiveSample;
          setSamples((prev) => [data, ...prev].slice(0, 100));
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setError("WebSocket connection failed");
        ws.close();
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [gatewayId]);

  const latest = samples[0];

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        <Link to="/platform/" style={{ color: "var(--accent)" }}>
          Dashboard
        </Link>
        <span>/</span>
        <Link to={`/platform/gateway/${gatewayId}`} style={{ color: "var(--accent)" }}>
          {gatewayId?.slice(0, 8)}…
        </Link>
        <span>/</span>
        <span>Live</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
          Live Sensor Stream
        </h1>
        <span
          className="flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full"
          style={{
            background: connected ? "rgba(14,124,134,0.12)" : "rgba(107,114,128,0.12)",
            color: connected ? "var(--accent)" : "var(--muted-foreground)",
          }}
        >
          <span
            className={`w-2 h-2 rounded-full ${connected ? "animate-pulse" : ""}`}
            style={{ background: connected ? "var(--accent)" : "var(--muted-foreground)" }}
          />
          {connected ? "Connected" : "Connecting…"}
        </span>
      </div>

      {error && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgba(212,24,61,0.08)", color: "var(--destructive)" }}
        >
          {error}
        </div>
      )}

      {/* Latest reading cards */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Euler X", value: latest.euler.x.toFixed(2) + "°" },
            { label: "Euler Y", value: latest.euler.y.toFixed(2) + "°" },
            { label: "Euler Z", value: latest.euler.z.toFixed(2) + "°" },
            { label: "Accel X", value: latest.linear_acceleration.x.toFixed(3) },
            { label: "Accel Y", value: latest.linear_acceleration.y.toFixed(3) },
            { label: "Steps", value: latest.step_count },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-5 shadow-sm"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>
                {s.label}
              </p>
              <p className="text-2xl font-mono font-semibold" style={{ color: "var(--foreground)" }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Calibration status */}
      {latest && (
        <div
          className="flex items-center gap-6 px-5 py-4 rounded-xl mb-10 shadow-sm"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            Calibration
          </span>
          {(["system", "gyroscope", "accelerometer", "magnetometer"] as const).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <CalDot value={latest.calibration[k]} />
              <span className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>
                {k}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Live feed table */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Live Feed ({samples.length} samples)
        </h2>
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm font-mono">
            <thead style={{ background: "var(--secondary)" }}>
              <tr>
                {["Time", "Euler X", "Y", "Z", "Accel X", "Y", "Z", "Steps", "Cal"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 font-sans font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {samples.slice(0, 50).map((s, i) => (
                <tr
                  key={i}
                  style={{
                    background: i === 0 ? "rgba(14,124,134,0.04)" : i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <td className="px-3 py-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(s.timestamp * 1000).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-1.5">{s.euler.x.toFixed(1)}</td>
                  <td className="px-3 py-1.5">{s.euler.y.toFixed(1)}</td>
                  <td className="px-3 py-1.5">{s.euler.z.toFixed(1)}</td>
                  <td className="px-3 py-1.5">{s.linear_acceleration.x.toFixed(3)}</td>
                  <td className="px-3 py-1.5">{s.linear_acceleration.y.toFixed(3)}</td>
                  <td className="px-3 py-1.5">{s.linear_acceleration.z.toFixed(3)}</td>
                  <td className="px-3 py-1.5">{s.step_count}</td>
                  <td className="px-3 py-1.5">
                    <CalDot value={s.calibration.system} />
                  </td>
                </tr>
              ))}
              {samples.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center font-sans" style={{ color: "var(--muted-foreground)" }}>
                    {connected ? "Waiting for sensor data…" : "Connecting to gateway…"}
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
