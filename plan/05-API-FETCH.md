# Module 5: API / Fetch Client

## Purpose
Thin `fetch()` wrapper with automatic auth token management compatible
with tina4-php and tina4-python backends. Supports interceptors and offline queue.

## API

```ts
import { api } from 'tina4';

// Configure once
api.configure({
  baseUrl: '/api',          // prepended to all requests
  auth: true,               // auto-manage Bearer + formToken
  tokenKey: 'tina4_token',  // localStorage key for token
});

// Simple requests
const users = await api.get('/users');
const user = await api.get('/users/{id}', { id: 42 });
const result = await api.post('/users', { name: 'Andre' });
const updated = await api.put('/users/42', { name: 'Updated' });
const deleted = await api.delete('/users/42');

// Interceptors
api.intercept('request', (config) => {
  config.headers['X-Custom'] = 'value';
  return config;
});

api.intercept('response', (response) => {
  if (response.status === 401) navigate('/login');
  return response;
});

// Upload with progress
const result = await api.upload('/files', formData, (progress) => {
  console.log(`${progress}% uploaded`);
});
```

## Implementation

```ts
interface ApiConfig {
  baseUrl: string;
  auth: boolean;
  tokenKey: string;
}

type Interceptor = (value: any) => any;

const config: ApiConfig = { baseUrl: '', auth: false, tokenKey: 'tina4_token' };
const requestInterceptors: Interceptor[] = [];
const responseInterceptors: Interceptor[] = [];

function getToken(): string | null {
  return localStorage.getItem(config.tokenKey);
}

function setToken(token: string) {
  localStorage.setItem(config.tokenKey, token);
}

async function request(method: string, path: string, body?: any) {
  let reqConfig: any = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  // Auth: Bearer token
  if (config.auth) {
    const token = getToken();
    if (token) reqConfig.headers['Authorization'] = `Bearer ${token}`;
  }

  // Body
  if (body && method !== 'GET') {
    // Add formToken for write operations (tina4-php/python compatible)
    if (config.auth) {
      const token = getToken();
      if (token && typeof body === 'object') body.formToken = token;
    }
    reqConfig.body = JSON.stringify(body);
  }

  // Run request interceptors
  for (const fn of requestInterceptors) reqConfig = fn(reqConfig) ?? reqConfig;

  // Fetch
  const url = config.baseUrl + path;
  const response = await fetch(url, reqConfig);

  // Token rotation (tina4-php/python send FreshToken header)
  const freshToken = response.headers.get('FreshToken');
  if (freshToken) setToken(freshToken);

  // Parse response
  let data: any;
  const ct = response.headers.get('Content-Type') ?? '';
  data = ct.includes('json') ? await response.json() : await response.text();

  let result = { status: response.status, data, ok: response.ok, headers: response.headers };

  // Run response interceptors
  for (const fn of responseInterceptors) result = fn(result) ?? result;

  if (!response.ok) throw result;
  return result.data;
}

export const api = {
  configure: (c: Partial<ApiConfig>) => Object.assign(config, c),
  get: (path: string, params?: Record<string, any>) => {
    // Replace {param} in path
    if (params) path = path.replace(/\{(\w+)\}/g, (_, k) => String(params[k]));
    return request('GET', path);
  },
  post: (path: string, body?: any) => request('POST', path, body),
  put: (path: string, body?: any) => request('PUT', path, body),
  patch: (path: string, body?: any) => request('PATCH', path, body),
  delete: (path: string) => request('DELETE', path),
  intercept: (type: 'request' | 'response', fn: Interceptor) => {
    (type === 'request' ? requestInterceptors : responseInterceptors).push(fn);
  },
};
```

## Auth Flow (tina4 Ecosystem)

```
1. User logs in:
   POST /api/login { username, password }
   <- { token: "jwt...", formToken: "csrf..." }
   -> Stored in localStorage

2. API requests:
   GET /api/data
   Headers: Authorization: Bearer <token>
   <- Response + FreshToken: <new-token>
   -> Token auto-rotated in localStorage

3. Write operations:
   POST /api/data { ...body, formToken: "<token>" }
   <- Response + FreshToken: <new-token>
```

This matches exactly how tina4helper.js works in tina4-php/python.

## Integration with Signals

```ts
import { api, signal, effect } from 'tina4';

const users = signal([]);
const loading = signal(false);

async function loadUsers() {
  loading.value = true;
  users.value = await api.get('/users');
  loading.value = false;
}

// Any component using `users` signal auto-updates when data loads
```

## Size Estimate
- Raw: ~700B
- Minified: ~400B
- Gzipped: ~300-350B
