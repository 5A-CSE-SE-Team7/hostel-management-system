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
