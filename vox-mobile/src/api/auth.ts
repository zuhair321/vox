// Vox Mobile — Auth API

import { api } from './client';
import type { AuthResponse, TwoFactorChallenge, User } from '../types';

export async function register(email: string, username: string, password: string): Promise<AuthResponse> {
  return api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
    skipAuth: true,
  });
}

export async function login(emailOrUsername: string, password: string): Promise<AuthResponse | TwoFactorChallenge> {
  return api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername, password }),
    skipAuth: true,
  });
}

export async function twoFactorLogin(tempToken: string, code: string): Promise<AuthResponse> {
  return api('/api/auth/2fa/login', {
    method: 'POST',
    body: JSON.stringify({ tempToken, code }),
    skipAuth: true,
  });
}

export async function refreshToken(refreshTokenValue: string): Promise<AuthResponse> {
  return api('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
    skipAuth: true,
  });
}

export async function logout(refreshTokenValue: string): Promise<void> {
  return api('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });
}

export async function getMe(): Promise<{ user: User }> {
  return api('/api/auth/me');
}

export async function updateMe(data: { displayName?: string; bio?: string; status?: string }): Promise<{ user: User }> {
  return api('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function forgotPassword(email: string): Promise<{ ok: boolean }> {
  return api('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

export async function resetPassword(token: string, password: string): Promise<{ ok: boolean }> {
  return api('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    skipAuth: true,
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return api('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function setup2FA(): Promise<{ secret: string; otpauth: string; qr: string }> {
  return api('/api/auth/2fa/setup', { method: 'POST' });
}

export async function verify2FA(code: string): Promise<{ enabled: boolean }> {
  return api('/api/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
