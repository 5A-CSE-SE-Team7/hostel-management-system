import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComplaintProgress from '../components/ComplaintProgress';
it('starts assigned work using the status contract', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } })); vi.stubGlobal('fetch', fetch);
  render(<ComplaintProgress complaint={{ id: 1, status: 'assigned' }} onDone={vi.fn()} />); await userEvent.click(screen.getByRole('button', { name: 'Start work' }));
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ status: 'in_progress' });
});
it('requires a resolution and preserves errors/draft when denied', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Conflict', details: { resolutionDetails: 'Explain repair' } }), { status: 409, headers: { 'content-type': 'application/json' } })));
  render(<ComplaintProgress complaint={{ id: 1, status: 'in_progress' }} onDone={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Mark resolved' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Resolution details for complaint 1'), 'Repaired'); await userEvent.click(screen.getByRole('button', { name: 'Mark resolved' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Conflict'); expect(screen.getByLabelText('Resolution details for complaint 1')).toHaveValue('Repaired');
});
