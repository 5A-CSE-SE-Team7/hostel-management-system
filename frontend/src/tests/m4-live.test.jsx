// Real HTTP/M1 sessions/MySQL. Only browser download mechanics are observed.
import React from 'react';
import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth';
import App from '../App';
import Login from '../pages/Login';
const nativeFetch=globalThis.fetch;
let csvRequest, csvBody, csvType;
beforeEach(()=>{
  if(!process.env.HMS_API_BASE)throw new Error('M4 network tests require the genuine integrated API');
  let cookie='';csvRequest=null;csvBody=null;csvType=null;
  vi.stubGlobal('fetch',async(path,options={})=>{
    const headers=new Headers(options.headers);if(cookie)headers.set('Cookie',cookie);
    const response=await nativeFetch(new URL(path,process.env.HMS_API_BASE),{...options,headers});
    for(const value of response.headers.getSetCookie())if(value.startsWith('hms.sid='))cookie=value.split(';')[0];
    if(String(path).includes('format=csv')){csvRequest=path;csvType=response.headers.get('content-type');csvBody=await response.clone().text();}
    return response;
  });
});
function mount(){render(<MemoryRouter><AuthProvider><App loginPage={<Login />} /></AuthProvider></MemoryRouter>);}
async function login(user,email){await user.type(await screen.findByLabelText('Institutional email'),email);await user.type(screen.getByLabelText('Password'),'Hostel@123');await user.click(screen.getByRole('button',{name:'Sign in'}));await screen.findByRole('heading',{name:'Dashboard'});}
async function logout(user){await user.click(screen.getByRole('button',{name:'Sign out'}));await screen.findByRole('button',{name:'Sign in'});}
it('real visitor and leave screens preserve student/staff workflows and rejection field errors',async()=>{
 const user=userEvent.setup();mount();await login(user,'student1@hms.test');
 expect(screen.queryByRole('link',{name:'Reports'})).toBeNull();
 await user.click(screen.getByRole('link',{name:'Visitors'}));
 await user.type(await screen.findByLabelText('Visitor name'),'Integrated Parent');await user.type(screen.getByLabelText('ID type'),'DL');await user.type(screen.getByLabelText('ID number'),'INTEGRATION-1');await user.type(screen.getByLabelText('Visit date & time'),'2026-11-01T10:00');await user.type(screen.getByLabelText('Purpose'),'Integrated visit');await user.click(screen.getByRole('button',{name:'Save'}));
 await waitFor(()=>expect(screen.getByRole('table',{name:'Visitor records'})).toHaveTextContent('Integrated Parent'));
 await user.click(screen.getByRole('link',{name:'Leave & outpass'}));await user.type(await screen.findByLabelText('From'),'2026-11-02T10:00');await user.type(screen.getByLabelText('To'),'2026-11-02T12:00');await user.type(screen.getByLabelText('Reason'),'Integrated leave request');await user.click(screen.getByRole('button',{name:'Submit request'}));
 await waitFor(()=>expect(screen.getByRole('table',{name:'Leave and outpass requests'})).toHaveTextContent('Integrated leave request'));
 await logout(user);await login(user,'warden@hms.test');await user.click(screen.getByRole('link',{name:'Visitors'}));
 let row=(await screen.findByText('Integrated Parent')).closest('tr');await user.click(within(row).getByRole('button',{name:'Approve'}));await waitFor(()=>expect(screen.getByText('Integrated Parent').closest('tr')).toHaveTextContent('approved'));
 await user.click(within(screen.getByText('Integrated Parent').closest('tr')).getByRole('button',{name:'Mark completed'}));await waitFor(()=>expect(screen.getByText('Integrated Parent').closest('tr')).toHaveTextContent('completed'));
 await user.click(screen.getByRole('link',{name:'Leave & outpass'}));row=(await screen.findByText('Integrated leave request')).closest('tr');await user.click(within(row).getByRole('button',{name:'Reject'}));
 await waitFor(()=>expect(screen.getByLabelText(/Remarks for request/)).toHaveAttribute('aria-invalid','true'));
 await user.type(screen.getByLabelText(/Remarks for request/),'Verified rejection remark');await user.click(within(screen.getByText('Integrated leave request').closest('tr')).getByRole('button',{name:'Reject'}));
 await waitFor(()=>expect(screen.getByText('Integrated leave request').closest('tr')).toHaveTextContent('rejected'));expect(screen.getByText('Verified rejection remark')).toBeVisible();
},30000);
it('real report generation downloads CSV for the displayed report rather than edited filters',async()=>{
 const user=userEvent.setup();mount();await login(user,'warden@hms.test');await user.click(screen.getByRole('link',{name:'Reports'}));await user.click(screen.getByRole('button',{name:'Generate'}));await screen.findByRole('table',{name:'Report data'});
 vi.stubGlobal('URL',class extends URL {});URL.createObjectURL=vi.fn(()=> 'blob:integration-csv');URL.revokeObjectURL=vi.fn();const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 await user.selectOptions(screen.getByLabelText('Report'),'visitors');await user.click(screen.getByRole('button',{name:'Download CSV'}));
 await waitFor(()=>expect(click).toHaveBeenCalledOnce());expect(csvRequest).toMatch(/^\/api\/reports\/occupancy\?/);expect(csvType).toMatch(/^text\/csv/);expect(csvBody).toContain('Block A');expect(URL.createObjectURL.mock.calls[0][0].type).toBe('text/csv');await waitFor(()=>expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:integration-csv'));
},30000);
