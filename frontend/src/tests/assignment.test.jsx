import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComplaintAssignment from '../components/ComplaintAssignment';
const complaint = { id: 7, priority: 'medium', status: 'submitted' };
it('assigns selected maintenance staff with the selected priority', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } })); vi.stubGlobal('fetch', fetch);
  const done = vi.fn(); render(<ComplaintAssignment complaint={complaint} staff={[{ id: 9, name: 'Maintenance One' }]} onDone={done} />);
  const user = userEvent.setup(); expect(screen.getByRole('button', { name: 'Assign' })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Assignee for complaint 7'), '9'); await user.selectOptions(screen.getByLabelText('Priority for complaint 7'), 'high');
  await user.click(screen.getByRole('button', { name: 'Assign' }));
  expect(fetch.mock.calls[0][0]).toBe('/api/complaints/7/assign');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ assignedTo: 9, priority: 'high' }); expect(done).toHaveBeenCalledOnce();
});
it('shows actionable field errors and hides reassignment for resolved records', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid', details: { priority: 'Choose a priority' } }), { status: 400, headers: { 'content-type': 'application/json' } })));
  render(<ComplaintAssignment complaint={{ ...complaint, status: 'resolved' }} staff={[]} onDone={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Update priority' }));
  expect(await screen.findByText('Choose a priority')).toBeVisible(); expect(screen.getByLabelText('Priority for complaint 7')).toHaveAccessibleDescription('Choose a priority');
});
