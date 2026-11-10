import { useAuth } from '../store/auth';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  form?: FormData;
}

async function request(path: string, { method, body, form }: Options = {}) {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method: method ?? (body !== undefined || form ? 'POST' : 'GET'),
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  // An expired token, or a suspended account on session refresh, ends the session.
  if (token && (res.status === 401 || (res.status === 403 && path === '/auth/me'))) useAuth.getState().clear();
  return res;
}

export async function api<T>(path: string, options?: Options): Promise<T> {
  const res = await request(path, options);
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export async function apiBlob(path: string): Promise<Blob> {
  const res = await request(path);
  if (!res.ok) throw new ApiError(res.status, 'Could not load file');
  return res.blob();
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');
