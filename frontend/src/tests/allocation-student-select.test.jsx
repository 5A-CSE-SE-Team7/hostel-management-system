import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import Allocations from '../pages/Allocations';
import AllocationStudentSelect from '../components/AllocationStudentSelect';
vi.mock('../auth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../auth';

const candidate = { id: 501, name: 'Ananya Demo', srn: 'PES2UG24CS101', email: 'ananya@hms.test' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
function fixture(post = async () => json({ id: 77, studentId: 501 }, 201)) {
  let allocated = false;
  const fetch = vi.fn(async (path, options = {}) => {
    if (options.method === 'POST') {
      const result = await post(path, options);
      if (result.ok) allocated = true;
      return result;
    }
    if (path.startsWith('/api/students?')) return json(allocated ? [] : [candidate]);
    if (path === '/api/notifications/unread-count') return json({ count: 0 });
    if (path === '/api/beds/available') return json(allocated ? [] : [{ id: 21, label: '1', block: { name: 'Block A' }, room: { roomNumber: '101' } }]);
    if (path === '/api/occupancy') return json({ occupiedBeds: Number(allocated), totalBeds: 1, availableBeds: Number(!allocated), occupancyPercent: allocated ? 100 : 0, blocks: [] });
    return json([]);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
async function choose(user) {
  await screen.findByRole('option', { name: /Ananya Demo.*PES2UG24CS101/ });
  await user.selectOptions(screen.getByLabelText('Student', { exact: true }), '501');
  await user.selectOptions(screen.getByLabelText('Available bed'), '21');
}
function mount(role = 'warden') {
  useAuth.mockReturnValue({ user: { id: 1, role }, loading: false, logout: vi.fn() });
  return render(<MemoryRouter initialEntries={['/allocations']}><App accountPages={{ Allocations: <Allocations /> }} /></MemoryRouter>);
}

for (const role of ['admin', 'warden']) {
  it(`${role} selects an identified eligible student, submits a numeric id and refreshes availability/occupancy`, async () => {
    const fetch = fixture(); mount(role); const user = userEvent.setup();
    await choose(user);
    expect(screen.queryByLabelText('Student ID')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Allocate bed' }));
    await screen.findByText('Allocation #77 created for student 501.');
    const posts = fetch.mock.calls.filter(([, options]) => options?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1].body)).toEqual({ studentId: 501, bedId: 21 });
    await screen.findByText('No eligible students match this search.');
    for (const path of ['/api/beds/available', '/api/occupancy', '/api/allocations', '/api/allocations/history']) {
      expect(fetch.mock.calls.filter(([url]) => url === path).length).toBeGreaterThanOrEqual(2);
    }
    expect(screen.getByLabelText('Student', { exact: true })).toHaveValue('');
  });
}

it('searches by entered identity with eligibility filtering and clears an old selection', async () => {
  const fetch = fixture(); mount(); const user = userEvent.setup(); await choose(user);
  await user.type(screen.getByLabelText('Search students'), 'Ananya@hms.test');
  expect(screen.getByLabelText('Student', { exact: true })).toHaveValue('');
  await waitFor(() => expect(fetch.mock.calls.some(([path]) => path.includes('search=Ananya%40hms.test') && path.includes('eligibleForAllocation=true'))).toBe(true));
  await user.keyboard('{Enter}');
  expect(fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});

it('preserves useful field validation errors and refreshes stale eligibility after rejection', async () => {
  const fetch = fixture(async () => json({ message: 'Validation failed', details: { studentId: 'An active student account is required' } }, 400));
  mount(); const user = userEvent.setup(); await choose(user);
  await user.click(screen.getByRole('button', { name: 'Allocate bed' }));
  expect(await screen.findByText('An active student account is required')).toBeVisible();
  expect(screen.getByLabelText('Student', { exact: true })).toHaveValue('');
  await waitFor(() => expect(fetch.mock.calls.filter(([path]) => path.startsWith('/api/students?')).length).toBeGreaterThanOrEqual(2));
});

it('a pending allocation cannot be submitted twice', async () => {
  let finish;
  const fetch = fixture(() => new Promise(resolve => { finish = resolve; }));
  mount(); const user = userEvent.setup(); await choose(user);
  const form = screen.getByRole('button', { name: 'Allocate bed' }).closest('form');
  act(() => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  await act(async () => finish(json({ id: 77, studentId: 501 }, 201)));
});

it('late search responses cannot replace newer matches', async () => {
  let oldResult;
  const fetch = vi.fn(async path => {
    const query = new URL(path, 'http://localhost').searchParams.get('search');
    if (query === 'old') return new Promise(resolve => { oldResult = resolve; });
    return json(query === 'new' ? [{ id: 502, name: 'New Match', srn: 'PESNEW', email: 'new@hms.test' }] : []);
  });
  vi.stubGlobal('fetch', fetch);
  render(<AllocationStudentSelect value="" onChange={vi.fn()} disabled={false} refreshKey={0} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Search students'), 'old');
  await waitFor(() => expect(oldResult).toBeTypeOf('function'));
  await user.clear(screen.getByLabelText('Search students'));
  await user.type(screen.getByLabelText('Search students'), 'new');
  await screen.findByRole('option', { name: /New Match/ });
  await act(async () => oldResult(json([candidate])));
  expect(screen.queryByRole('option', { name: /Ananya Demo/ })).toBeNull();
});

it('lookup errors fail closed, offer retry and never fabricate student matches', async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error('Student service unavailable')).mockResolvedValueOnce(json([candidate]));
  vi.stubGlobal('fetch', fetch);
  render(<AllocationStudentSelect value="" onChange={vi.fn()} disabled={false} refreshKey={0} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Student service unavailable');
  expect(screen.getByLabelText('Student', { exact: true })).toBeDisabled();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry student search' }));
  expect(await screen.findByRole('option', { name: /Ananya Demo/ })).toBeVisible();
});
