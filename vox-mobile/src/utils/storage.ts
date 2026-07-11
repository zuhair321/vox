// Vox Mobile — Secure storage wrappers for tokens

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'vox_access_token',
  REFRESH_TOKEN: 'vox_refresh_token',
  USER_DATA: 'vox_user_data',
  API_BASE: 'vox_api_base',
} as const;

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    setAccessToken(access),
    setRefreshToken(refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.USER_DATA),
  ]);
}

export async function getUserData(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.USER_DATA);
}

export async function setUserData(data: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER_DATA, data);
}

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(`vox_${key}`);
}

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(`vox_${key}`, value);
}
