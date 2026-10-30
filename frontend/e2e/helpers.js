export const student = {
  id: 501,
  name: 'Ava Student',
  email: 'ava@hms.test',
  role: 'student',
  srn: 'PES2UG24CS501',
  contact: '9876543210',
  department: 'CSE',
  yearOfStudy: 2,
};

export async function mockSignedOut(page) {
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ errorCode: 'UNAUTHENTICATED', message: 'Sign in required' }),
  }));
}

export async function mockSignedIn(page, user) {
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(user),
  }));
  await page.route('**/api/profile', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(user),
  }));
  await page.route('**/api/students?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([]),
  }));
  await page.route('**/api/admin/users', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([user]),
  }));
}
