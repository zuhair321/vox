const BASE = '/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async fetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    const { token, ...init } = opts;
    const authToken = token || this.token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
    });

    if (res.status === 401) {
      this.token = null;
      localStorage.removeItem('vox_admin_token');
      localStorage.removeItem('vox_admin_refresh');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(path: string, opts?: FetchOptions) {
    return this.fetch<T>(path, { ...opts, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, opts?: FetchOptions) {
    return this.fetch<T>(path, {
      ...opts,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown, opts?: FetchOptions) {
    return this.fetch<T>(path, {
      ...opts,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, opts?: FetchOptions) {
    return this.fetch<T>(path, { ...opts, method: 'DELETE' });
  }
}

export const api = new ApiClient();
