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
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  ok: boolean;
  headers: Headers;
}

export type RequestInterceptor = (config: RequestInit & { headers: Record<string, string> }) => (RequestInit & { headers: Record<string, string> }) | void;
export type ResponseInterceptor = (response: ApiResponse) => ApiResponse | void;

// ── State ───────────────────────────────────────────────────────────

const config: ApiConfig = {
  baseUrl: '',
  auth: false,
  tokenKey: 'tina4_token',
};

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

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

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  let reqConfig: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {
      'Content-Type': 'application/json',
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

  // Run request interceptors
  for (const fn of requestInterceptors) {
    const result = fn(reqConfig);
    if (result) reqConfig = result;
  }

  // Execute fetch
  const url = config.baseUrl + path;
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

  get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    if (params) {
      path = path.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
    }
    return request<T>('GET', path);
  },

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, body);
  },

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  delete<T = unknown>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },

  intercept(type: 'request', fn: RequestInterceptor): void;
  intercept(type: 'response', fn: ResponseInterceptor): void;
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
    requestInterceptors.length = 0;
    responseInterceptors.length = 0;
  },
};
