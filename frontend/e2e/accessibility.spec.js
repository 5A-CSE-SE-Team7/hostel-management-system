import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockSignedIn, mockSignedOut, student } from './helpers.js';

const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
];

async function expectNoHorizontalOverflow(page, width, screen) {
  const scrollWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
  expect(scrollWidth, `${screen} should fit within ${width}px`).toBeLessThanOrEqual(width);
}

test('available role pages have no WCAG 2.1 A/AA axe violations at target widths', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    await mockSignedOut(page);
    await page.goto('/login');
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, `login at ${viewport.width}px`).toEqual([]);
    await expectNoHorizontalOverflow(page, viewport.width, 'login');

    await page.goto('/register');
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, `registration at ${viewport.width}px`).toEqual([]);
    await expectNoHorizontalOverflow(page, viewport.width, 'registration');
    await page.unroute('**/api/auth/me');

    await mockSignedIn(page, student);
    await page.goto('/');
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, `student dashboard at ${viewport.width}px`).toEqual([]);
    await expectNoHorizontalOverflow(page, viewport.width, 'student dashboard');

    await page.goto('/profile');
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, `student profile at ${viewport.width}px`).toEqual([]);
    await expectNoHorizontalOverflow(page, viewport.width, 'student profile');

    const warden = { ...student, role: 'warden' };
    await page.unroute('**/api/auth/me');
    await mockSignedIn(page, warden);
    await page.goto('/students');
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, `warden students page at ${viewport.width}px`).toEqual([]);
    await expectNoHorizontalOverflow(page, viewport.width, 'warden students');

    const admin = { ...student, role: 'admin' };
    await page.unroute('**/api/auth/me');
    await mockSignedIn(page, admin);
    await page.goto('/users');
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, `admin users page at ${viewport.width}px`).toEqual([]);
    await expectNoHorizontalOverflow(page, viewport.width, 'admin users');
  }
});
