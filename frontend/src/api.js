// Thin fetch wrapper for the REST/JSON API (SRS 3.3). Cookies carry the server-side session.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `Request failed (${status})`);
    this.status = status;
    this.errorCode = body?.errorCode;
    this.details = body?.details;
    this.requestId = body?.requestId;
  }
}

async function request(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, isJson ? data : { message: data });
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b = {}) => request('POST', u, b),
  put: (u, b) => request('PUT', u, b),
  patch: (u, b) => request('PATCH', u, b),
};

/** Turns an ApiError with field details into a readable string. */
export function errorText(e) {
  if (!e) return '';
  const d = e.details ? Object.values(e.details).join('; ') : '';
  return d ? `${e.message}: ${d}` : e.message;
}
