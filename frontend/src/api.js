export class ApiError extends Error {
  constructor(status, body) {
    super(body.message || `Request failed (${status})`);
    this.status = status;
    this.errorCode = body.errorCode;
    this.details = body.details;
    this.requestId = body.requestId;
  }
}
export async function api(path, { body, ...options } = {}) {
  if (!path.startsWith('/api/')) throw new Error('API paths must begin with /api/');
  const response = await fetch(path, {
    ...options, credentials: 'include',
    headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = response.status === 204 ? null : isJson ? await response.json() : null;
  if (!response.ok) throw new ApiError(response.status, data || {});
  if (response.status !== 204 && !isJson) throw new Error('The server returned an unexpected response. Please retry.');
  return data;
}

// M1 PR #42's pages use named methods with /auth/... paths. Keep one
// implementation for credentials, validation and error metadata.
function apiPath(path) { return path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`; }
export const get = (path, options) => api(apiPath(path), options);
export const post = (path, body) => api(apiPath(path), { method: 'POST', body });
export const put = (path, body) => api(apiPath(path), { method: 'PUT', body });
export const patch = (path, body) => api(apiPath(path), { method: 'PATCH', body });
