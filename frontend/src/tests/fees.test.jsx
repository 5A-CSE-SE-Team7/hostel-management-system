import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Fees, { money } from '../pages/Fees';
vi.mock('../auth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../auth';
const ledger = { studentId: 5, totals: { assessed: 100, paid: 30.5, outstanding: 69.5 }, assessments: [{ id: 9, description: 'Hostel fees', dueDate: '2026-10-30', amount: 100, paid: 30.5, outstanding: 69.5 }], payments: [{ id: 3, amount: 30.5, paidOn: '2026-10-29', reference: 'Receipt', assessmentId: 9 }] };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function fixture(mutate = () => json({ id: 1 }, 201)) {
  const fetch = vi.fn().mockImplementation((path, options) => {
    if (options?.method === 'POST') return Promise.resolve(mutate(path, options));
    return Promise.resolve(json(path.startsWith('/api/students') ? [{ id: 5, name: 'Student One', srn: 'PES017' }] : path === '/api/fees/dues' ? [] : ledger));
  }); vi.stubGlobal('fetch', fetch); return fetch;
}
it('student sees only their ledger with two-decimal amounts', async () => {
  useAuth.mockReturnValue({ user: { role: 'student' } }); const fetch = fixture(); render(<Fees />);
  expect(await screen.findByRole('table', { name: 'Fee assessments' })).toHaveTextContent('100.00');
  expect(screen.getByRole('table', { name: 'Payments received' })).toHaveTextContent('30.50'); expect(fetch.mock.calls[0][0]).toBe('/api/fees/me'); expect(screen.queryByRole('form')).toBeNull();
  expect(money(0)).toBe('0.00'); expect(money('1.2')).toBe('1.20'); expect(money(undefined)).toBe('Unavailable');
});
it('warden selects a student and records an assessment with the verified API contract', async () => {
  useAuth.mockReturnValue({ user: { role: 'warden' } }); const fetch = fixture(); render(<Fees />); const user = userEvent.setup();
  await user.selectOptions(await screen.findByLabelText('Student'), '5'); const form = within(await screen.findByRole('form', { name: 'Add assessment' }));
  await user.type(form.getByLabelText('Description'), 'Additional fee'); await user.type(form.getByLabelText('Assessment amount (₹)'), '15.25'); await user.type(form.getByLabelText('Due date'), '2026-10-30'); await user.click(form.getByRole('button', { name: 'Record assessment' }));
  expect(await screen.findByText('Fee record saved.')).toBeVisible();
  const [, options] = fetch.mock.calls.find(([path, options]) => path === '/api/fees/assessments' && options.method === 'POST');
  expect(JSON.parse(options.body)).toEqual({ studentId: 5, description: 'Additional fee', amount: 15.25, dueDate: '2026-10-30' });
});
it('payment errors remain attached to the field and preserve the draft', async () => {
  useAuth.mockReturnValue({ user: { role: 'admin' } }); fixture(() => json({ message: 'Invalid amount', details: { amount: 'Amount is not accepted' } }, 400)); render(<Fees />); const user = userEvent.setup();
  await user.selectOptions(await screen.findByLabelText('Student'), '5'); const form = within(await screen.findByRole('form', { name: 'Record payment' }));
  await user.type(form.getByLabelText('Payment amount (₹)'), '2.50'); await user.type(form.getByLabelText('Paid on'), '2026-10-29'); await user.click(form.getByRole('button', { name: 'Record payment' }));
  expect(await screen.findByText('Amount is not accepted')).toBeVisible(); expect(form.getByLabelText('Payment amount (₹)')).toHaveValue(2.5); expect(form.getByLabelText('Payment amount (₹)')).toHaveAccessibleDescription('Amount is not accepted');
});
it('maintenance never requests or displays fee data', () => {
  useAuth.mockReturnValue({ user: { role: 'maintenance' } }); const fetch = fixture(); render(<Fees />);
  expect(screen.getByRole('heading', { name: 'Access denied' })).toBeVisible(); expect(fetch).not.toHaveBeenCalled();
});
it('unavailable fee service is an error with retry, not a zero balance', async () => {
  useAuth.mockReturnValue({ user: { role: 'student' } }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Fee service unavailable' }, 404))); render(<Fees />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Fee service unavailable'); expect(screen.getByRole('button', { name: 'Retry ledger' })).toBeEnabled(); expect(screen.queryByText('₹ 0.00')).toBeNull();
});

it('sends the current M1 search contract while retaining original q compatibility', async () => {
  useAuth.mockReturnValue({ user: { role: 'warden' } }); const fetch = fixture(); render(<Fees />); const user = userEvent.setup();
  await screen.findByLabelText('Student'); await user.type(screen.getByLabelText('Search students by name or SRN'),'PES 017'); await user.click(screen.getByRole('button',{name:'Search students'}));
  expect(fetch.mock.calls.some(([path]) => path === '/api/students?search=PES%20017&q=PES%20017')).toBe(true);
});

it('an older search cannot overwrite the latest student picker and dues', async () => {
  useAuth.mockReturnValue({ user: { role: 'warden' } });
  const fetch = fixture();
  render(<Fees />); const user = userEvent.setup();
  await screen.findByLabelText('Student');
  let finishOld;
  fetch.mockImplementation((path) => {
    if (path.startsWith('/api/students?search=old')) return new Promise(resolve => { finishOld = resolve; });
    return Promise.resolve(json(path.startsWith('/api/students') ? [{ id: 6, srn: 'NEW', name: 'Latest Student' }] : []));
  });
  const query = screen.getByLabelText('Search students by name or SRN');
  await user.type(query, 'old'); fireEvent.submit(query.closest('form'));
  fireEvent.change(query, { target: { value: 'new' } }); fireEvent.submit(query.closest('form'));
  expect(await screen.findByRole('option', { name: 'NEW — Latest Student' })).toBeVisible();
  await act(async () => finishOld(json([{ id: 5, srn: 'OLD', name: 'Stale Student' }])));
  expect(screen.queryByRole('option', { name: 'OLD — Stale Student' })).toBeNull();
  expect(screen.getByRole('option', { name: 'NEW — Latest Student' })).toBeVisible();
});
