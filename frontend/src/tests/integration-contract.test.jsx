import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth';
import { get, post, put, patch } from '../api';
import App from '../App';
const reply = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
it('supports the genuine M1 named API methods with cookie/error behavior retained', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(reply({ ok: true }))); vi.stubGlobal('fetch',fetch);
  await get('/auth/me'); await post('/auth/register',{ name:'Synthetic' }); await put('/api/profile',{}); await patch('/profile',{});
  expect(fetch.mock.calls.map(call=>[call[0],call[1].method || 'GET',call[1].credentials])).toEqual([['/api/auth/me','GET','include'],['/api/auth/register','POST','include'],['/api/profile','PUT','include'],['/api/profile','PATCH','include']]);
});
it('an old session refresh cannot restore the user after logout', async () => {
  let resolveRefresh;
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(reply({ role:'student',name:'Student' })).mockImplementationOnce(()=>new Promise(resolve=>{resolveRefresh=resolve;})).mockResolvedValueOnce(reply({ sessionStatus:'ended' })));
  function Probe(){const {user,refresh,logout}=useAuth();return <><span>{user?.name || 'anonymous'}</span><button onClick={refresh}>Refresh</button><button onClick={logout}>Logout</button></>;}
  render(<AuthProvider><Probe /></AuthProvider>); await screen.findByText('Student');
  await userEvent.click(screen.getByText('Refresh')); await userEvent.click(screen.getByText('Logout')); await screen.findByText('anonymous');
  await act(async()=>{resolveRefresh(reply({role:'student',name:'Stale user'}));});
  expect(screen.queryByText('Stale user')).toBeNull(); expect(screen.getByText('anonymous')).toBeVisible();
});
it('mounts teammate-owned registration as an explicit page extension without replacing its logic', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:401,headers:{'content-type':'application/json'}})));
  render(<MemoryRouter initialEntries={['/register']}><AuthProvider><App registrationPage={<h1>Genuine registration extension</h1>} /></AuthProvider></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Genuine registration extension'})).toBeVisible();
});

for (const role of ['student', 'warden', 'maintenance', 'admin']) {
  it(`preserves real account page extensions and their role restrictions for ${role}`, async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ role, name: role })));
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/profile']}><AuthProvider><App accountPages={{ Profile: <main><h1>Account profile extension</h1></main>, Students: <main><h1>Student management extension</h1></main>, Users: <main><h1>Account management extension</h1></main> }} /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Account profile extension' })).toBeVisible();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Manage students' }) !== null).toBe(['warden', 'admin'].includes(role));
    expect(screen.queryByRole('link', { name: 'Users & roles' }) !== null).toBe(role === 'admin');
    if (role === 'admin') {
      await user.click(screen.getByRole('link', { name: 'Users & roles' }));
      expect(await screen.findByRole('heading', { name: 'Account management extension' })).toBeVisible();
    }
  });
}
it('rejects direct navigation to restricted account extensions', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ role: 'student', name: 'Student' })));
  render(<MemoryRouter initialEntries={['/users']}><AuthProvider><App accountPages={{ Users: <h1>Restricted account management</h1> }} /></AuthProvider></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeVisible();
  expect(screen.queryByText('Restricted account management')).toBeNull();
});

it('keeps complaint submission and tracking reachable beside account pages after the base merge', async () => {
  let submitted = false;
  vi.stubGlobal('fetch', vi.fn(async (path, options = {}) => {
    if (path === '/api/auth/me') return reply({ role: 'student', name: 'Student' });
    if (path === '/api/complaint-categories') return reply([{ id: 1, name: 'Electrical' }]);
    if (path === '/api/complaints' && options.method === 'POST') {
      expect(JSON.parse(options.body)).toMatchObject({ categoryId: 1, location: 'A101', description: 'Fan broken after merge' });
      submitted = true;
      return reply({ complaintId: 23, status: 'submitted' });
    }
    if (path === '/api/complaints?limit=100') return reply(submitted ? [{ id: 23, category: 'Electrical', description: 'Fan broken after merge', status: 'submitted' }] : []);
    throw new Error(`Unexpected request: ${path}`);
  }));
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/profile']}><AuthProvider><App accountPages={{ Profile: <main><h1>Account profile extension</h1></main> }} /></AuthProvider></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Account profile extension' });
  await user.click(screen.getByRole('link', { name: 'Complaints' }));
  await screen.findByRole('heading', { name: 'My complaints' });
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Category' }), '1');
  await user.type(screen.getByLabelText('Location (block/room)'), 'A101');
  await user.type(screen.getByLabelText('Description'), 'Fan broken after merge');
  await user.click(screen.getByRole('button', { name: 'Submit complaint' }));
  expect(await screen.findByText('Complaint #23 submitted.')).toBeVisible();
  expect(await screen.findByRole('table', { name: 'Complaint history' })).toHaveTextContent('Fan broken after merge');
  await user.click(screen.getByRole('link', { name: 'My profile' }));
  expect(await screen.findByRole('heading', { name: 'Account profile extension' })).toBeVisible();
  expect(screen.getAllByRole('main')).toHaveLength(1);
});
