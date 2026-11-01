import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Complaints from '../pages/Complaints';
vi.mock('../auth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../auth';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function mount(role = 'student') { useAuth.mockReturnValue({ user: { role } }); render(<Complaints />); }
function start(extra = []) {
  const fetch = vi.fn().mockResolvedValueOnce(json([{ id: 1, name: 'Electrical' }])).mockResolvedValueOnce(json([]));
  for (const [body, status] of extra) fetch.mockResolvedValueOnce(json(body, status));
  vi.stubGlobal('fetch', fetch); return fetch;
}
it('submits a complaint and refreshes tracking with returned identifier', async () => {
  const fetch = start([[{ complaintId: 23, status: 'submitted' }, 201], [[{ id: 1, name: 'Electrical' }], 200], [[{ id: 23, category: 'Electrical', description: 'Fan broken', status: 'submitted' }], 200]]);
  mount(); const user = userEvent.setup();
  await screen.findByRole('option', { name: 'Electrical' });
  await user.selectOptions(screen.getByLabelText('Category'), '1');
  await user.type(screen.getByLabelText('Location (block/room)'), 'A101'); await user.type(screen.getByLabelText('Description'), 'Fan broken');
  await user.click(screen.getByRole('button', { name: 'Submit complaint' }));
  expect(await screen.findByText('Complaint #23 submitted.')).toBeVisible();
  expect(await screen.findByRole('table')).toHaveTextContent('Fan broken');
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toMatchObject({ categoryId: 1, description: 'Fan broken', location: 'A101' });
});
it('shows server field errors without clearing the student draft', async () => {
  start([[{ message: 'Validation failed', details: { description: 'Explain the problem' } }, 400]]); mount();
  const user = userEvent.setup(); await screen.findByRole('option', { name: 'Electrical' });
  await user.selectOptions(screen.getByLabelText('Category'), '1'); await user.type(screen.getByLabelText('Location (block/room)'), 'A101'); await user.type(screen.getByLabelText('Description'), 'Fan broken');
  await user.click(screen.getByRole('button', { name: 'Submit complaint' }));
  expect(await screen.findByText('Explain the problem')).toBeVisible();
  expect(screen.getByLabelText('Description')).toHaveValue('Fan broken');
  expect(screen.getByLabelText('Description')).toHaveAccessibleDescription('Explain the problem');
});
it('offers retry on load failure and displays the genuine empty state', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(json([])).mockResolvedValueOnce(json([])).mockResolvedValueOnce(json([])));
  mount(); expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  await userEvent.click(screen.getByRole('button', { name: 'Retry complaints' }));
  expect(await screen.findByText('No complaints yet.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Submit complaint' })).toBeDisabled();
});
it('maintenance sees tracking, never student submission controls or fake data', async () => {
  start(); mount('maintenance'); await screen.findByText('No complaints yet.');
  expect(screen.queryByRole('form', { name: 'Submit a complaint' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Submit complaint' })).toBeNull();
});
