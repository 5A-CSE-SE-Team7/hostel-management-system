// Live network tests: real M1/M2/M4 and our actual React components. The
// fetch bridge only resolves relative URLs and carries genuine session cookies.
import React from 'react';
import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth';
import App from '../App';
import Login from '../pages/Login';
import Register from '../pages/Register';
const nativeFetch=globalThis.fetch;
let lastComplaint;
beforeEach(()=>{
  if(!process.env.HMS_API_BASE) throw new Error('Live integration requires the real fixture API');
  let cookie=''; lastComplaint=null;
  vi.stubGlobal('fetch',async(path,options={})=>{
    const headers=new Headers(options.headers);if(cookie)headers.set('Cookie',cookie);
    const response=await nativeFetch(new URL(path,process.env.HMS_API_BASE),{...options,headers});
    for(const value of response.headers.getSetCookie()) if(value.startsWith('hms.sid=')) cookie=value.split(';')[0];
    if(path==='/api/complaints'&&options.method==='POST'&&response.status===201) lastComplaint=(await response.clone().json()).complaintId;
    return response;
  });
});
function mount(path='/login'){render(<MemoryRouter initialEntries={[path]}><AuthProvider><App loginPage={<Login />} registrationPage={<Register />} /></AuthProvider></MemoryRouter>);}
async function login(user,email,password='Hostel@123'){
  await user.type(await screen.findByLabelText('Institutional email'),email);
  await user.type(screen.getByLabelText('Password'),password);
  await user.click(screen.getByRole('button',{name:'Sign in'}));
}
async function logout(user){await user.click(screen.getByRole('button',{name:'Sign out'}));await screen.findByRole('button',{name:'Sign in'});}
it('actual M1 registration and login work through the shared shell adapters',async()=>{
  const user=userEvent.setup();mount('/register');
  await user.type(await screen.findByRole('textbox',{name:/^SRN/}),'PES2UG24CS899');await user.type(screen.getByLabelText('Full name'),'Integration Student');await user.type(screen.getByLabelText('Institutional email'),'integration@hms.test');await user.type(screen.getByLabelText(/^Password/),'Synthetic123');await user.type(screen.getByLabelText('Contact number'),'9876543210');
  await user.click(screen.getByRole('button',{name:'Register'}));expect(await screen.findByRole('status')).toHaveTextContent('account was created');
  await user.click(screen.getByRole('link',{name:'Sign in'}));await login(user,'integration@hms.test','Synthetic123');expect(await screen.findByText('Welcome, Integration Student.')).toBeVisible();await logout(user);
},30000);
it('real fee creation, student complaint, staff assignment, resolution and notifications integrate',async()=>{
  const user=userEvent.setup();mount();await login(user,'admin@hms.test');await screen.findByRole('heading',{name:'Dashboard'});
  await user.click(screen.getByRole('link',{name:'Fees'}));const picker=await screen.findByLabelText('Student');await user.type(screen.getByLabelText('Search students by name or SRN'),'PES2UG24CS101');await user.click(screen.getByRole('button',{name:'Search students'}));await waitFor(()=>expect(within(screen.getByLabelText('Student')).getAllByRole('option')).toHaveLength(2));
  const option=screen.getByRole('option',{name:/PES2UG24CS101/});await user.selectOptions(screen.getByLabelText('Student'),option.value);
  const assessment=within(await screen.findByRole('form',{name:'Add assessment'}));await user.type(assessment.getByLabelText('Description'),'Live integration fee');await user.type(assessment.getByLabelText('Assessment amount (₹)'),'123.45');await user.type(assessment.getByLabelText('Due date'),'2026-12-01');await user.click(assessment.getByRole('button',{name:'Record assessment'}));
  await waitFor(()=>expect(screen.getByRole('table',{name:'Fee assessments'})).toHaveTextContent('Live integration fee'));
  await logout(user);await login(user,'student1@hms.test');await screen.findByRole('heading',{name:'Dashboard'});await user.click(screen.getByRole('link',{name:'Fees'}));expect(await screen.findByRole('table',{name:'Fee assessments'})).toHaveTextContent('123.45');
  await user.click(screen.getByRole('link',{name:'Complaints'}));await screen.findByRole('option',{name:'Electrical'});await user.selectOptions(screen.getByLabelText('Category'),screen.getByRole('option',{name:'Electrical'}).value);await user.type(screen.getByLabelText('Location (block/room)'),'A101');await user.type(screen.getByLabelText('Description'),'Live integration fan repair');await user.click(screen.getByRole('button',{name:'Submit complaint'}));await screen.findByText(/Complaint #\d+ submitted/);expect(lastComplaint).toBeTypeOf('number');const id=lastComplaint;
  await logout(user);await login(user,'warden@hms.test');await screen.findByRole('heading',{name:'Dashboard'});await user.click(screen.getByRole('link',{name:'Complaints'}));const assignment=within(await screen.findByRole('region',{name:`Assignment for complaint ${id}`}));await user.selectOptions(assignment.getByLabelText(`Assignee for complaint ${id}`),assignment.getByRole('option',{name:'Maintenance One'}).value);await user.click(assignment.getByRole('button',{name:'Assign'}));await screen.findByText(`Complaint #${id} assigned.`);
  await logout(user);await login(user,'maint1@hms.test');await screen.findByRole('heading',{name:'Assigned maintenance work'});let progress=within(await screen.findByRole('region',{name:`Progress for complaint ${id}`}));await user.click(progress.getByRole('button',{name:'Start work'}));await screen.findByText(`Complaint #${id} started.`);progress=within(await screen.findByRole('region',{name:`Progress for complaint ${id}`}));await user.type(progress.getByLabelText(`Resolution details for complaint ${id}`),'Repaired with genuine workflow');await user.click(progress.getByRole('button',{name:'Mark resolved'}));await screen.findByText(`Complaint #${id} resolved.`);
  await logout(user);await login(user,'student1@hms.test');await screen.findByRole('heading',{name:'Dashboard'});await user.click(screen.getByRole('link',{name:/Notifications/}));expect(await screen.findByText(`Your complaint #${id} is now resolved.`)).toBeVisible();await user.click(screen.getByRole('button',{name:'Mark all read'}));await screen.findByLabelText('0 unread notifications');
},30000);
