'use client';

import { useCallback, useEffect, useState } from 'react';

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

/** Load JSON from `url` (skip when null). Re-fetches when the URL changes or on reload(). */
export function useApi<T>(url: string | null) {
  const [nonce, setNonce] = useState(0);
  const key = url === null ? null : `${url}#${nonce}`;
  const [result, setResult] = useState<{ key: string | null; data: T | null; error: ApiError | null }>({
    key: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (url === null) return;
    let cancelled = false;
    apiFetch<T>(url).then(
      (data) => {
        if (!cancelled) setResult({ key, data, error: null });
      },
      (err) => {
        if (!cancelled) {
          setResult((prev) => ({ key, data: prev.data, error: err instanceof ApiError ? err : new ApiError(String(err), 0) }));
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [url, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (update: T | null | ((prev: T | null) => T | null)) =>
      setResult((prev) => ({
        ...prev,
        data: typeof update === 'function' ? (update as (p: T | null) => T | null)(prev.data) : update,
      })),
    []
  );

  // Previous data stays visible while a reload is in flight.
  const loading = key !== null && result.key !== key;
  return { data: result.data, error: loading ? null : result.error, loading, reload, setData };
}
