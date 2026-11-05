import { test, expect } from '@playwright/test';

// Real seeded API sessions, with every interactive step driven by the keyboard.
// This regression does not substitute for a human screen-reader assessment.
async function tabTo(page, target, key = 'Tab') {
  await expect(target).toBeVisible();
  for (let step = 0; step < 80; step += 1) {
    if (await target.evaluate(element => element === document.activeElement)) {
      const outline = await target.evaluate(element => getComputedStyle(element).outlineWidth);
      expect(parseFloat(outline), 'keyboard target has a visible focus outline').toBeGreaterThanOrEqual(2);
      return;
    }
    await page.keyboard.press(key);
  }
  throw new Error('Expected control was unreachable within a complete keyboard traversal');
}

for (const [role, email, destination] of [
  ['student', 'student1@hms.test', '/my-room'],
  ['warden', 'warden@hms.test', '/allocations'],
  ['maintenance', 'maint1@hms.test', '/complaints'],
  ['admin', 'admin@hms.test', '/users'],
]) {
  test(`TC-UX-01 ${role}: keyboard login, navigation, skip link and logout`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/login');
    await tabTo(page, page.getByLabel('Institutional email'));
    await page.keyboard.insertText(email);
    await tabTo(page, page.getByLabel('Password', { exact: true }));
    await page.keyboard.insertText('Hostel@123');
    await tabTo(page, page.getByRole('button', { name: 'Sign in', exact: true }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();

    const link = page.getByRole('navigation', { name: 'Main navigation' }).locator(`a[href="${destination}"]`);
    await tabTo(page, link);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    // These controls precede the current focus in document order. Traverse
    // backward rather than assuming Tab wraps through browser chrome identically.
    await tabTo(page, page.getByRole('link', { name: 'Skip to content' }), 'Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('#content')).toBeFocused();
    await tabTo(page, page.getByRole('button', { name: 'Sign out', exact: true }), 'Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });
}
