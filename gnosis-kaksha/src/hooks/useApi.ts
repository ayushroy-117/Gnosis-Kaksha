'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Error carrying the HTTP status, so pages can tell 401/403 from outages. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * fetch + JSON with consistent error handling. Throws ApiError with the
 * server's `error` message (or a readable fallback) on any non-2xx response.
 */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(url, {
      cache: 'no-store',
      ...rest,
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 401 ? 'Your session has ended. Please sign in again.'
      : res.status === 403 ? 'You do not have permission to do that.'
      : 'Something went wrong. Please try again.';
    throw new ApiError((data as { error?: string }).error || fallback, res.status);
  }
  return data as T;
}

/** Load JSON from `url` (skip when null). Re-fetches when the URL changes. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const call = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(url);
      if (call === latest.current) setData(result);
    } catch (err) {
      if (call === latest.current) setError(err instanceof ApiError ? err : new ApiError(String(err), 0));
    } finally {
      if (call === latest.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
