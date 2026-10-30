import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../auth';
import { api } from '../api';
import { Field, DataTable } from '../components/ui';
function reply(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); }
function mount(path = '/') { return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>); }
describe('HMS-S03', () => {
  it.each(['student', 'warden', 'maintenance', 'admin'])('filters navigation for %s', async role => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ user: { name: 'Demo', role } })));
    mount(); await screen.findByRole('heading', { name: 'Dashboard' });
    expect(screen.getByRole('link', { name: 'Complaints' })).toBeVisible();
    expect(!!screen.queryByRole('link', { name: 'Fees' })).toBe(role !== 'maintenance');
  });
  it('accepts the actual flat M1 session response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ id: 1, name: 'Aayaan', role: 'student' })));
    mount();
    expect(await screen.findByText('Welcome, Aayaan.')).toBeVisible();
  });
  it('denies direct fee navigation for maintenance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ user: { role: 'maintenance' } })));
    mount('/fees'); expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeVisible();
  });
  it('redirects anonymous callers and submits credentials to M1', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(reply({}, 401)).mockResolvedValueOnce(reply({ message: 'Invalid credentials' }, 401));
    vi.stubGlobal('fetch', fetch); mount('/complaints');
    await screen.findByRole('heading', { name: 'Sign in' });
    const user = userEvent.setup(); await user.type(screen.getByLabelText('Institutional email'), 'student@hms.test'); await user.type(screen.getByLabelText('Password'), 'invalid'); await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(fetch.mock.calls[1][1]).toMatchObject({ credentials: 'include', method: 'POST', body: JSON.stringify({ email: 'student@hms.test', password: 'invalid' }) });
  });
  it('reports missing M1 without inventing a session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({}, 404))); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication service is not available yet');
    expect(screen.queryByRole('navigation')).toBeNull();
  });
  it('preserves API field errors and rejects HTML fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(reply({ message: 'Invalid', details: { email: 'Required' }, requestId: 'r1' }, 400)).mockResolvedValueOnce(new Response('<html/>')));
    await expect(api('/api/example')).rejects.toMatchObject({ status: 400, details: { email: 'Required' }, requestId: 'r1' });
    await expect(api('/api/example')).rejects.toThrow('unexpected response');
  });
  it('associates field errors and displays empty data', () => {
    render(<><Field label="Name" error="Required" /><DataTable caption="Records" columns={[]} rows={[]} /></>);
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Required');
    expect(screen.getByRole('status')).toHaveTextContent('No records yet');
  });
});
