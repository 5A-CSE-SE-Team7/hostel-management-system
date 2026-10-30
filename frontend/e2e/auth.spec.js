import { expect, test } from '@playwright/test';
import { mockSignedOut, student } from './helpers.js';

test('student registration displays inline server validation and success feedback', async ({ page }) => {
  await mockSignedOut(page);
  await page.route('**/api/auth/register', async (route) => {
    const data = route.request().postDataJSON();
    if (!data.email.endsWith('@hms.test')) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'Invalid input', details: { email: 'Use your institutional email.' } }),
      });
    }
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ userId: student.id, role: 'student' }),
    });
  });

  await page.goto('/register');
  await page.locator('#srn').fill(student.srn);
  await page.getByLabel('Full name').fill(student.name);
  await page.getByLabel('Institutional email').fill('ava@outside.test');
  await page.getByLabel('Password').fill('Student123');
  await page.getByLabel('Contact number').fill(student.contact);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Use your institutional email.')).toBeVisible();
  await expect(page.getByLabel('Institutional email')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Institutional email').fill(student.email);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('status')).toContainText('Your student account was created');
});

test('student can sign in, reach profile, and sign out using keyboard navigation', async ({ page }) => {
  await mockSignedOut(page);
  let authenticated = false;
  await page.route('**/api/auth/login', async (route) => {
    authenticated = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'student' }) });
  });
  await page.route('**/api/auth/me', async (route) => route.fulfill({
    status: authenticated ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify(authenticated ? student : { errorCode: 'UNAUTHENTICATED', message: 'Sign in required' }),
  }));
  await page.route('**/api/auth/logout', async (route) => {
    authenticated = false;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessionStatus: 'ended' }) });
  });
  await page.route('**/api/profile', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(student) }));

  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Institutional email')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.getByLabel('Institutional email').fill(student.email);
  await page.getByLabel('Password').fill('Student123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: `Welcome, ${student.name}` })).toBeVisible();
  await page.getByRole('link', { name: 'My profile' }).click();
  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Hostel Management System' })).toBeVisible();
});
