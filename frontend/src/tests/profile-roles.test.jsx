import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../pages/Profile';
import { get, put } from '../api';
vi.mock('../api', () => ({ get: vi.fn(), put: vi.fn() }));

for (const role of ['student', 'admin', 'warden', 'maintenance']) {
  it(`${role} sees role-appropriate fields and sends only editable profile values`, async () => {
    const original = { id: 5, name: 'Demo Account', role, email: `${role}@hms.test`,
      srn: 'PES123', contact: role === 'student' ? '9000000000' : null,
      department: null, yearOfStudy: null, guardianName: null, guardianContact: null, address: null };
    let saved = { ...original };
    get.mockImplementation(async () => saved);
    put.mockImplementation(async (_path, body) => { saved = { ...saved, ...body }; return saved; });
    const view = render(<MemoryRouter><Profile /></MemoryRouter>);
    const name = await screen.findByLabelText('Full name');
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Role')).toHaveAttribute('readonly');
    if (role === 'student') {
      expect(screen.getByLabelText('SRN')).toHaveAttribute('readonly');
      expect(screen.getByLabelText('Contact number')).toBeVisible();
    } else {
      expect(screen.queryByLabelText('SRN')).toBeNull();
      expect(screen.queryByLabelText('Contact number')).toBeNull();
      expect(screen.queryByLabelText('Year of study')).toBeNull();
    }
    const user = userEvent.setup();
    await user.clear(name); await user.type(name, 'Updated Demo');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByText('Profile updated.');
    const [path, payload] = put.mock.calls.at(-1);
    expect(path).toBe('/profile');
    expect(payload.name).toBe('Updated Demo');
    for (const key of ['id', 'srn', 'email', 'role']) expect(payload).not.toHaveProperty(key);
    if (role !== 'student') expect(payload).toEqual({ name: 'Updated Demo' });
    view.unmount(); render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(await screen.findByLabelText('Full name')).toHaveValue('Updated Demo');
  });
}
