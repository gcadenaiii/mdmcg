/**
 * Platform API client — thin fetch wrapper targeting the FastAPI backend
 * at /platform/api/*. All requests are relative so they work in both
 * local dev (proxied by Vite) and production (served by nginx).
 */

const BASE = "/platform/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────

export interface Gateway {
  id: string;
  label: string;
  patient_label: string | null;
  patient_id: string | null;
  is_online: boolean;
  ble_connected: boolean;
  last_heartbeat: string | null;
  last_sync: string | null;
  pending_samples: number;
  software_version: string | null;
}

export interface Session {
  id: string;
  gateway_id: string;
  started_at: string | null;
  ended_at: string | null;
  sample_count: number;
  total_steps: number;
}

export interface Patient {
  id: string;
  label: string;
  notes: string | null;
  created_at: string;
}

export interface SyncEvent {
  id: number;
  gateway_id: string;
  received_at: string;
  batch_sequence: number;
  samples_accepted: number;
  success: boolean;
  error_message: string | null;
}

export interface Sample {
  timestamp: string;
  euler: { x: number; y: number; z: number };
  linear_acceleration: { x: number; y: number; z: number };
  step_count: number;
  calibration: {
    system: number;
    gyroscope: number;
    accelerometer: number;
    magnetometer: number;
  };
}

export interface DashboardData {
  gateways: Gateway[];
  recent_sessions: Session[];
  total_samples: number;
  total_patients: number;
  online_count: number;
}

export interface GatewayDetail {
  gateway: Gateway;
  patient: Patient | null;
  sessions: Session[];
  samples: Sample[];
  sync_events: SyncEvent[];
}

export interface PatientDetail {
  patient: Patient;
  gateways: Gateway[];
  sessions: Session[];
  is_online: boolean;
  ble_connected: boolean;
  total_samples: number;
  total_steps: number;
}

// ── Endpoints ────────────────────────────────────────────────────────

export const api = {
  dashboard: () => get<DashboardData>("/dashboard"),
  gateway: (id: string) => get<GatewayDetail>(`/gateway/${id}`),
  gatewaySamples: (id: string, limit = 200) =>
    get<Sample[]>(`/gateway/${id}/samples?limit=${limit}`),
  patient: (id: string) => get<PatientDetail>(`/patient/${id}`),
};
