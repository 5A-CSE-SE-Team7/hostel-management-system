import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notifications from '../pages/Notifications';
import NotificationCount from '../components/NotificationCount';
const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
it('marks a real notification read and refreshes the badge event', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json([{ id: 2, message: 'Assigned', isRead: false }])).mockResolvedValueOnce(json({ ok: true })).mockResolvedValueOnce(json([{ id: 2, message: 'Assigned', isRead: true }]));
  vi.stubGlobal('fetch', fetch); const listener = vi.fn(); window.addEventListener('hms:notifications', listener);
  render(<Notifications />); await userEvent.click(await screen.findByRole('button', { name: 'Mark notification 2 read' }));
  expect(await screen.findByText('Read')).toBeVisible(); expect(fetch.mock.calls[1][0]).toBe('/api/notifications/2/read'); expect(listener).toHaveBeenCalledOnce(); window.removeEventListener('hms:notifications', listener);
});
it('renders an empty state and an accurate unread badge without inventing counts', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(path => Promise.resolve(json(path.includes('unread-count') ? { count: 3 } : []))));
  render(<><Notifications /><NotificationCount /></>);
  expect(await screen.findByLabelText('3 unread notifications')).toBeVisible(); expect(await screen.findByText('No notifications yet.')).toBeVisible();
});
it('exposes retry when notification loading fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline'))); render(<Notifications />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline'); expect(screen.getByRole('button', { name: 'Refresh notifications' })).toBeEnabled();
});
