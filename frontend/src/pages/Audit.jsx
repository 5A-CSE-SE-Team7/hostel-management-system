import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 50;

async function getJson(url) {
  const response = await fetch(url, { credentials: 'include' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body;
}

function displayDetails(value) {
  if (!value) return '—';
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
}

export default function Audit() {
  const [page, setPage] = useState(1);
  const [auditPage, setAuditPage] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getJson(`/api/admin/audit?page=${page}&pageSize=${PAGE_SIZE}`);
      setAuditPage(data);
    } catch (err) {
      setError(err.message || 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function verifyIntegrity() {
    setVerifying(true);
    setError('');
    try {
      setVerification(await getJson('/api/admin/audit/verify'));
    } catch (err) {
      setError(err.message || 'Could not verify the audit log.');
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  }

  const total = auditPage?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main>
      <header>
        <h1>Audit log</h1>
        <p>Review recorded system actions and check the integrity of the audit chain.</p>
      </header>

      <section aria-labelledby="integrity-heading">
        <h2 id="integrity-heading">Integrity check</h2>
        <button type="button" onClick={verifyIntegrity} disabled={verifying}>
          {verifying ? 'Verifying…' : 'Verify integrity'}
        </button>
        {verification && (
          <p role="status" aria-live="polite">
            {verification.valid
              ? `Integrity verified across ${verification.checked} audit events.`
              : `Integrity check failed after checking ${verification.checked} events${
                verification.firstInvalidId == null ? '' : `; first invalid event: ${verification.firstInvalidId}`
              }${verification.headMismatch ? '; audit head does not match the chain' : ''}.`}
          </p>
        )}
      </section>

      {error && <p role="alert">{error}</p>}

      <section aria-labelledby="events-heading">
        <h2 id="events-heading">Recorded actions</h2>
        {loading ? (
          <p role="status">Loading audit events…</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">Action</th>
                    <th scope="col">Entity</th>
                    <th scope="col">Details</th>
                    <th scope="col">IP address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPage?.items?.length ? auditPage.items.map((event) => (
                    <tr key={event.id}>
                      <td>{event.created_at}</td>
                      <td>{event.user_id ?? '—'}</td>
                      <td>{event.role ?? '—'}</td>
                      <td>{event.action}</td>
                      <td>{event.entity ? `${event.entity}${event.entity_id ? ` #${event.entity_id}` : ''}` : '—'}</td>
                      <td>{displayDetails(event.details)}</td>
                      <td>{event.ip ?? '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7">No audit events recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <nav aria-label="Audit log pages">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                Previous
              </button>
              <span aria-live="polite"> Page {page} of {pageCount} · {total} events </span>
              <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>
                Next
              </button>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}
