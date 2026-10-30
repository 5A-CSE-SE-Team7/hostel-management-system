import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
vi.mock('../auth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../auth';
for (const role of ['student', 'warden', 'maintenance', 'admin']) {
  it(`protects audit navigation and direct access for ${role}`, () => {
    useAuth.mockReturnValue({ user: { id: 1, role }, loading: false, error: '', logout: vi.fn() });
    render(<MemoryRouter initialEntries={['/audit']}><App accountPages={{ Audit: <main>Real audit extension</main> }} /></MemoryRouter>);
    expect(!!screen.queryByRole('link', { name: 'Audit log' })).toBe(role === 'admin');
    if (role === 'admin') expect(screen.getByText('Real audit extension')).toBeVisible();
    else expect(screen.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });
}
