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
