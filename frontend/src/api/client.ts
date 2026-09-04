import {
  RainfallNowcastResponse,
  FloodMapResponse,
  FloodHotspot,
  DrainageStatusResponse,
  RoadStatusResponse,
  RouteResponse,
  RouteRequest,
  WhatIfRequest,
  MLMetrics
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export interface HealthCheckResult {
  connected: boolean;
  error?: string;
  health?: any;
}

export async function fetchHealth(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      throw new Error(`Health check returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error(`[HydroCast AI] Backend health check failed at ${API_BASE}/health. Error: ${err.message}`);
    throw err;
  }
}

export async function checkBackendConnection(): Promise<HealthCheckResult> {
  try {
    const health = await fetchHealth();
    return { connected: true, health };
  } catch (err: any) {
    return {
      connected: false,
      error: `FastAPI backend is unreachable at ${API_BASE}. Please ensure the backend is running: python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`
    };
  }
}

export async function fetchRainfallForecast(timeOffsetMin: number = 0, multiplier: number = 1.0): Promise<RainfallNowcastResponse> {
  const url = `${API_BASE}/rainfall/forecast?time_offset_min=${timeOffsetMin}&multiplier=${multiplier}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } catch (err: any) {
    console.error(`[HydroCast AI] Failed to fetch rainfall forecast:`, err);
    throw err;
  }
}

export async function fetchFloodMap(timeOffsetMin: number = 0): Promise<FloodMapResponse> {
  const url = `${API_BASE}/flood/map?time_offset_min=${timeOffsetMin}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } catch (err: any) {
    console.error(`[HydroCast AI] Failed to fetch flood map:`, err);
    throw err;
  }
}

export async function fetchFloodLocations(timeOffsetMin: number = 0): Promise<FloodHotspot[]> {
  const res = await fetch(`${API_BASE}/flood/locations?time_offset_min=${timeOffsetMin}`);
  if (!res.ok) throw new Error('Failed to fetch flood locations');
  return res.json();
}

export async function fetchDrainageStatus(timeOffsetMin: number = 0): Promise<DrainageStatusResponse> {
  const res = await fetch(`${API_BASE}/drainage/status?time_offset_min=${timeOffsetMin}`);
  if (!res.ok) throw new Error('Failed to fetch drainage status');
  return res.json();
}

export async function fetchRoadsStatus(timeOffsetMin: number = 0): Promise<RoadStatusResponse> {
  const res = await fetch(`${API_BASE}/roads/status?time_offset_min=${timeOffsetMin}`);
  if (!res.ok) throw new Error('Failed to fetch roads status');
  return res.json();
}

export async function runWhatIfSimulation(params: WhatIfRequest): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to run simulation');
  return res.json();
}

export async function fetchRoute(req: RouteRequest): Promise<RouteResponse> {
  const res = await fetch(`${API_BASE}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!res.ok) throw new Error('Failed to calculate route');
  return res.json();
}

export async function fetchMLMetrics(): Promise<MLMetrics> {
  const res = await fetch(`${API_BASE}/ml/metrics`);
  if (!res.ok) throw new Error('Failed to fetch ML metrics');
  return res.json();
}

export async function fetchCityOverview(): Promise<any> {
  const res = await fetch(`${API_BASE}/city/overview`);
  if (!res.ok) throw new Error('Failed to fetch city overview');
  return res.json();
}
