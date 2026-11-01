import { ApiError } from '../api';
// CSV is a distinct response contract; the shared JSON client remains strict.
export async function getReportCsv(path) {
  if (!path.startsWith('/reports/')) throw new Error('Expected a report API path');
  const response = await fetch(`/api${path}`, { credentials: 'include', redirect: 'error', headers: { Accept: 'text/csv' } });
  if (!response.ok) {
    const body = response.headers.get('content-type')?.includes('application/json') ? await response.json() : {};
    throw new ApiError(response.status, body);
  }
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('text/csv')) throw new Error('The server returned an unexpected report format.');
  return response.text();
}
