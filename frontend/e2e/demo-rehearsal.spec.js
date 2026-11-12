import { test, expect } from '@playwright/test';

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Institutional email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Hostel@123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}
async function signOut(page) {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
}
async function register(context, tag) {
  const data = { name: `Selector ${tag}`, srn: `SEL${tag}`, email: `selector.${tag}@hms.test`, password: 'Hostel@123', contact: '9000000000' };
  const response = await context.post('/api/auth/register', { data });
  expect(response.status()).toBe(201);
  return { ...data, srn: data.srn.toUpperCase(), email: data.email.toLowerCase(), id: (await response.json()).userId };
}

for (const role of ['admin', 'warden']) {
  test(`${role} searchable allocation excludes ineligible students and completes check-in, transfer and checkout`, async ({ page, playwright, baseURL }) => {
    const unique = `${role}${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const eligible = await register(page.request, `${unique}A`);
    const inactive = await register(page.request, `${unique}I`);
    const occupied = await register(page.request, `${unique}O`);
    const admin = await playwright.request.newContext({ baseURL });
    try {
      expect((await admin.post('/api/auth/login', { data: { email: 'admin@hms.test', password: 'Hostel@123' } })).ok()).toBe(true);
      expect((await admin.patch(`/api/admin/users/${inactive.id}`, { data: { isActive: false } })).ok()).toBe(true);
      const beds = await (await admin.get('/api/beds/available')).json();
      expect(beds.length).toBeGreaterThanOrEqual(3);
      expect((await admin.post('/api/allocations', { data: { studentId: occupied.id, bedId: beds[0].id } })).status()).toBe(201);

      await signIn(page, `${role}@hms.test`);
      await page.goto('/allocations');
      await expect(page.getByLabel('Student ID', { exact: true })).toHaveCount(0);
      for (const person of [inactive, occupied]) {
        await page.getByLabel('Search students').fill(person.email);
        await expect(page.getByText('No eligible students match this search.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Allocate bed', exact: true })).toBeDisabled();
      }
      for (const search of [eligible.name, eligible.srn, eligible.email]) {
        await page.getByLabel('Search students').fill(search);
        await expect(page.getByLabel('Student', { exact: true }).getByRole('option', { name: `${eligible.name} — ${eligible.srn} (${eligible.email})`, exact: true })).toHaveCount(1);
      }
      await page.getByLabel('Student', { exact: true }).selectOption(String(eligible.id));
      await page.getByLabel('Available bed').selectOption(String(beds[1].id));
      const sent = page.waitForRequest(req => req.method() === 'POST' && new URL(req.url()).pathname === '/api/allocations');
      await page.getByRole('button', { name: 'Allocate bed', exact: true }).click();
      expect((await sent).postDataJSON()).toEqual({ studentId: eligible.id, bedId: beds[1].id });
      await expect(page.getByText(new RegExp(`Allocation #\\d+ created for student ${eligible.id}`))).toBeVisible();
      const current = page.locator('[aria-labelledby="active-allocation-heading"]');
      const row = current.getByRole('row').filter({ hasText: eligible.name });
      await row.getByRole('button', { name: 'Check in', exact: true }).click();
      await expect(row).toContainText('checked_in');
      await row.getByLabel(`Target bed for ${eligible.name}`, { exact: true }).selectOption(String(beds[2].id));
      await row.getByRole('button', { name: 'Transfer', exact: true }).click();
      await expect(page.getByText(new RegExp(`Student ${eligible.name} transferred`))).toBeVisible();
      await expect(row).toContainText('checked_in');
      await row.getByRole('button', { name: 'Check out', exact: true }).click();
      await expect(row).toHaveCount(0);
      const history = page.locator('[aria-labelledby="allocation-history-heading"]').getByRole('row').filter({ hasText: eligible.name });
      await expect(history).toHaveCount(2);
      await expect(history.filter({ hasText: 'transferred' })).toHaveCount(1);
      await expect(history.filter({ hasText: 'checked_out' })).toHaveCount(1);
      await expect(page.getByLabel('Student', { exact: true }).getByRole('option', { name: new RegExp(eligible.srn) })).toHaveCount(1);
      expect((await (await admin.get('/api/admin/audit/verify')).json()).valid).toBe(true);
    } finally { await admin.dispose(); }
  });
}

for (const [role, email] of [['student', 'student1@hms.test'], ['admin', 'admin@hms.test'], ['warden', 'warden@hms.test'], ['maintenance', 'maint1@hms.test']]) {
  test(`${role} personal profile has the correct identity fields and persists permitted edits`, async ({ page }) => {
    await signIn(page, email); await page.goto('/profile');
    await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('Role', { exact: true })).toHaveAttribute('readonly', '');
    if (role === 'student') await expect(page.getByLabel('SRN', { exact: true })).toHaveAttribute('readonly', '');
    else {
      await expect(page.getByLabel('SRN', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Contact number', { exact: true })).toHaveCount(0);
    }
    const name = `Browser ${role} ${Date.now()}`;
    await page.getByLabel('Full name', { exact: true }).fill(name);
    if (role === 'student') await page.getByLabel('Contact number', { exact: true }).fill('9111111111');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByText('Profile updated.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(name);
    if (role === 'student') await expect(page.getByLabel('Contact number', { exact: true })).toHaveValue('9111111111');
  });
}

test('populated M4 demo: inventory, fees, visitor/outpass approval, notifications, CSV and audit', async ({ page }) => {
  const tag = Date.now().toString();
  const today = new Date().toISOString().slice(0, 10);
  await signIn(page, 'student1@hms.test');
  const student = await (await page.request.get('/api/auth/me')).json();
  const before = (await (await page.request.get('/api/fees/me')).json()).totals;
  await page.goto('/visitors');
  await page.getByLabel('Visitor name', { exact: true }).fill(`Visitor ${tag}`);
  await page.getByLabel('ID type', { exact: true }).fill('Synthetic ID');
  await page.getByLabel('ID number', { exact: true }).fill(`DEMO${tag}`);
  await page.getByLabel('Visit date & time', { exact: true }).fill(`${today}T10:00`);
  await page.getByLabel('Purpose', { exact: true }).fill('Synthetic rehearsal');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: `Visitor ${tag}` })).toContainText('pending');
  await page.goto('/leave');
  await page.getByLabel('From', { exact: true }).fill(`${today}T14:00`);
  await page.getByLabel('To', { exact: true }).fill(`${today}T16:00`);
  await page.getByLabel('Reason', { exact: true }).fill(`Outpass ${tag}`);
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: `Outpass ${tag}` })).toContainText('pending');
  await signOut(page);

  await signIn(page, 'warden@hms.test'); await page.goto('/inventory');
  await page.getByLabel('Block name', { exact: true }).fill(`Demo Block ${tag}`);
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await expect(page.getByText('Block created.', { exact: true })).toBeVisible();
  await page.getByLabel('Block', { exact: true }).selectOption({ label: `Demo Block ${tag}` });
  await page.getByLabel('Room number', { exact: true }).fill('901');
  await page.getByRole('button', { name: 'Add room', exact: true }).click();
  await expect(page.getByText('Room created.', { exact: true })).toBeVisible();
  await page.getByLabel('Room', { exact: true }).selectOption({ label: `Demo Block ${tag} · 901` });
  await page.getByLabel('Bed label', { exact: true }).fill('Demo1');
  await page.getByRole('button', { name: 'Add bed', exact: true }).click();
  await expect(page.getByText('Bed created.', { exact: true })).toBeVisible();

  await page.goto('/visitors');
  await page.getByRole('row').filter({ hasText: `Visitor ${tag}` }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('row').filter({ hasText: `Visitor ${tag}` })).toContainText('approved');
  await page.goto('/leave');
  await page.getByRole('row').filter({ hasText: `Outpass ${tag}` }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('row').filter({ hasText: `Outpass ${tag}` })).toContainText('approved');

  await page.goto('/fees');
  await page.getByLabel('Student', { exact: true }).selectOption(String(student.id));
  const assessment = page.getByRole('form', { name: 'Add assessment' });
  await assessment.getByLabel('Description', { exact: true }).fill(`Rehearsal fee ${tag}`);
  await assessment.getByLabel('Assessment amount (₹)', { exact: true }).fill('1000');
  await assessment.getByLabel('Due date', { exact: true }).fill(today);
  await assessment.getByRole('button', { name: 'Record assessment' }).click();
  await expect(page.getByRole('table', { name: 'Fee assessments' }).getByText(`Rehearsal fee ${tag}`)).toBeVisible();
  const payment = page.getByRole('form', { name: 'Record payment' });
  const assessmentOption = payment.getByRole('option', { name: new RegExp(`Rehearsal fee ${tag}`) });
  await payment.getByLabel('Against assessment').selectOption(await assessmentOption.getAttribute('value'));
  await payment.getByLabel('Payment amount (₹)').fill('250');
  await payment.getByLabel('Paid on').fill(today);
  await payment.getByLabel('Receipt/reference').fill(`Receipt ${tag}`);
  await payment.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('table', { name: 'Payments received' })).toContainText(`Receipt ${tag}`);
  const totals = (await (await page.request.get(`/api/fees/ledger/${student.id}`)).json()).totals;
  expect(totals.assessed).toBe(Number(before.assessed) + 1000);
  expect(totals.paid).toBe(Number(before.paid) + 250);
  expect(totals.outstanding).toBe(Number(before.outstanding) + 750);
  await page.goto('/reports');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Report data' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^occupancy_.*\.csv$/);
  await signOut(page);

  await signIn(page, 'student1@hms.test'); await page.goto('/fees');
  await expect(page.getByRole('table', { name: 'Payments received' })).toContainText(`Receipt ${tag}`);
  await page.goto('/notifications');
  await expect(page.getByRole('button', { name: 'Mark all read' })).toBeEnabled();
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  expect((await (await page.request.get('/api/notifications/unread-count')).json()).count).toBe(0);
  await signOut(page);
  await signIn(page, 'admin@hms.test'); await page.goto('/audit');
  await page.getByRole('button', { name: 'Verify integrity' }).click();
  await expect(page.getByText(/Integrity verified across/)).toBeVisible();
});
