import { api } from './client';

export interface TurboFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface TurboStatus {
  hasTurbo: boolean;
  turboSince: string | null;
  features: TurboFeature[];
}

// Get current user's Turbo status
export async function getTurboStatus(): Promise<TurboStatus> {
  return api('/api/turbo/status');
}

// Get all Turbo features
export async function getTurboFeatures(): Promise<{ features: TurboFeature[] }> {
  return api('/api/turbo/features');
}

// Enable Turbo for current user
export async function enableTurbo(): Promise<TurboStatus> {
  return api('/api/turbo/enable', { method: 'POST' });
}

// Disable Turbo for current user
export async function disableTurbo(): Promise<{ hasTurbo: boolean; turboSince: null; features: [] }> {
  return api('/api/turbo/disable', { method: 'POST' });
}

// Enable Turbo for all users (admin only)
export async function enableTurboForAll(): Promise<{ message: string; count: number }> {
  return api('/api/turbo/enable-all', { method: 'POST' });
}
