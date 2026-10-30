import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
vi.mock('../auth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../auth';
for (const role of ['student', 'warden', 'maintenance', 'admin']) {
  it(`renders authenticated account links without a missing Link import for ${role}`, () => {
    useAuth.mockReturnValue({ user: { id: 1, name: 'Account user', role }, loading: false, error: '', logout: vi.fn() });
    // The shared shell accepts these real-page extension points; the original
    // M1 App owns its account pages directly. This contract applies to both.
    render(<MemoryRouter><App accountPages={{ Profile: <main>Profile</main>, Students: <main>Students</main>, Users: <main>Users</main> }} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/profile');
    expect(!!screen.queryByRole('link', { name: 'Manage students' })).toBe(['warden', 'admin'].includes(role));
    expect(!!screen.queryByRole('link', { name: 'Users & roles' })).toBe(role === 'admin');
  });
}
