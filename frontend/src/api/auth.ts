import { api } from './client';

export interface SessionInfo {
  id: string;
  expiresAt: string;
  createdAt: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  token?: string;
}

export interface AuthResponse {
  user: any;
  tokens: {
    access: string;
    refresh: string;
  };
  loginAlert?: {
    isNewLogin: boolean;
    alertMessage: string | null;
  };
}

export interface TwoFactorChallenge {
  twoFactorRequired: true;
  tempToken: string;
}

export async function register(email: string, username: string, password: string): Promise<AuthResponse> {
  return api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
    skipAuth: true,
  } as any);
}

export async function login(emailOrUsername: string, password: string): Promise<AuthResponse | TwoFactorChallenge> {
  return api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername, password }),
    skipAuth: true,
  } as any);
}

export async function twoFactorLogin(tempToken: string, code: string): Promise<AuthResponse> {
  return api('/api/auth/2fa/login', {
    method: 'POST',
    body: JSON.stringify({ tempToken, code }),
    skipAuth: true,
  } as any);
}

export async function refreshToken(refreshTokenValue: string): Promise<AuthResponse> {
  return api('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
    skipAuth: true,
  } as any);
}

export async function logout(refreshTokenValue?: string): Promise<void> {
  await api('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  } as any);
}

export async function getMe(): Promise<{ user: any }> {
  return api('/api/auth/me');
}

export async function updateMe(data: { displayName?: string; bio?: string; status?: string }): Promise<{ user: any }> {
  return api('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  } as any);
}

export async function forgotPassword(email: string): Promise<{ ok: boolean }> {
  return api('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  } as any);
}

export async function resetPassword(token: string, password: string): Promise<{ ok: boolean }> {
  return api('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    skipAuth: true,
  } as any);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return api('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  } as any);
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  return api('/api/auth/sessions') as Promise<SessionInfo[]>;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await api(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function revokeAllSessions(): Promise<void> {
  await api('/api/auth/sessions', { method: 'DELETE' });
}

export interface LoginHistoryEntry {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  alertSent: boolean;
  createdAt: string;
}

export async function getLoginHistory(): Promise<{ history: LoginHistoryEntry[] }> {
  return api('/api/auth/login-history');
}

export async function deleteLoginHistoryEntry(id: string): Promise<{ deleted: boolean }> {
  return api(`/api/auth/login-history/${id}`, { method: 'DELETE' });
}

export async function clearLoginHistory(): Promise<{ cleared: boolean }> {
  return api('/api/auth/login-history', { method: 'DELETE' });
}

export async function googleAuth(code: string): Promise<AuthResponse> {
  return api('/api/auth/google', { method: 'POST', body: JSON.stringify({ code }), skipAuth: true } as any);
}

export async function getGoogleAuthUrl(): Promise<{ url: string }> {
  return api('/api/auth/google', { method: 'GET', skipAuth: true } as any);
}
