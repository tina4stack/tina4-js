/**
 * Tina4 API — Fetch wrapper with auth token management.
 *
 * Compatible with tina4-php and tina4-python backends:
 * - Sends Authorization: Bearer <token>
 * - Reads FreshToken response header for token rotation
 * - Sends formToken in POST/PUT/PATCH/DELETE bodies
 */

export interface ApiConfig {
  baseUrl: string;
  auth: boolean;
  tokenKey: string;
  headers: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  ok: boolean;
  headers: Headers;
  /** @internal Used by debug tracker for request/response correlation. */
  _requestId?: number;
}

export type RequestInterceptor = (config: RequestInit & { headers: Record<string, string> }) => (RequestInit & { headers: Record<string, string> }) | void;
export type ResponseInterceptor = (response: ApiResponse) => ApiResponse | void;

// ── State ───────────────────────────────────────────────────────────

const config: ApiConfig = {
  baseUrl: '',
  auth: false,
  tokenKey: 'tina4_token',
  headers: {},
};

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
let requestIdCounter = 0;

// ── Internal ────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    return localStorage.getItem(config.tokenKey);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  try {
    localStorage.setItem(config.tokenKey, token);
  } catch { /* localStorage unavailable */ }
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

async function request<T = unknown>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  let reqConfig: RequestInit & { headers: Record<string, string>; _url?: string; _requestId?: number } = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
  };

  // Add auth header
  if (config.auth) {
    const token = getToken();
    if (token) {
      reqConfig.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Add body for non-GET requests
  if (body !== undefined && method !== 'GET') {
    let payload = typeof body === 'object' && body !== null ? { ...body as object } : body;

    // Add formToken for write operations (tina4-php/python compatibility)
    if (config.auth && typeof payload === 'object' && payload !== null) {
      const token = getToken();
      if (token) {
        (payload as Record<string, unknown>).formToken = token;
      }
    }

    reqConfig.body = JSON.stringify(payload);
  }

  // Merge per-request headers
  if (options?.headers) {
    Object.assign(reqConfig.headers, options.headers);
  }

  // Build query string from options.params
  if (options?.params) {
    const qs = Object.entries(options.params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    path += (path.includes('?') ? '&' : '?') + qs;
  }

  // Set URL and request ID so interceptors (e.g. debug tracker) can read them
  const url = config.baseUrl + path;
  reqConfig._url = url;
  reqConfig._requestId = ++requestIdCounter;

  // Run request interceptors
  for (const fn of requestInterceptors) {
    const result = fn(reqConfig);
    if (result) reqConfig = result;
  }
  const response = await fetch(url, reqConfig);

  // Token rotation: read FreshToken header (tina4-php/python)
  const freshToken = response.headers.get('FreshToken');
  if (freshToken) setToken(freshToken);

  // Parse response based on content type
  const ct = response.headers.get('Content-Type') ?? '';
  let data: unknown;
  if (ct.includes('json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  let result: ApiResponse = {
    status: response.status,
    data,
    ok: response.ok,
    headers: response.headers,
    _requestId: reqConfig._requestId,
  };

  // Run response interceptors
  for (const fn of responseInterceptors) {
    const intercepted = fn(result);
    if (intercepted) result = intercepted;
  }

  if (!response.ok) {
    throw result;
  }

  return result.data as T;
}

// ── Public API ──────────────────────────────────────────────────────

export const api = {
  configure(c: Partial<ApiConfig>): void {
    Object.assign(config, c);
  },

  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },

  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options);
  },

  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },

  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },

  intercept(type: 'request' | 'response', fn: RequestInterceptor | ResponseInterceptor): void {
    if (type === 'request') {
      requestInterceptors.push(fn as RequestInterceptor);
    } else {
      responseInterceptors.push(fn as ResponseInterceptor);
    }
  },

  /** @internal Reset state (for tests). */
  _reset(): void {
    config.baseUrl = '';
    config.auth = false;
    config.tokenKey = 'tina4_token';
    config.headers = {};
    requestInterceptors.length = 0;
    responseInterceptors.length = 0;
  },
};
