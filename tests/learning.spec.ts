import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('lesson completion, highlighted notes, editing and history survive a reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'Start learning', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is a market?', exact: true })).toBeVisible();
  const text = page.locator('.article-body > p');
  await text.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.getByRole('button', { name: 'Save to notebook', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Add your thoughts (optional)').fill('A market needs an agreed price.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Mark lesson complete', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Completed · mark as unread' })).toBeVisible();
  await page.getByRole('link', { name: /My notebook/ }).click();
  await expect(page.locator('.note-card')).toHaveCount(1);
  await expect(page.locator('.note-card')).toContainText('A market needs an agreed price.');
  await page.getByRole('button', { name: 'Edit note', exact: true }).click();
  await page.getByLabel('Add your thoughts (optional)').fill('Edited reflection.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.reload();
  await expect(page.locator('.note-card')).toContainText('Edited reflection.');
  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  await expect(page.locator('.note-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.note-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(4);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.getByRole('link', { name: 'My progress', exact: true }).click();
  await expect(page.locator('.progress-overview')).toContainText('1 lesson.');
  expect(errors).toEqual([]);
});

test('curriculum, search, phase checkpoint and theme preferences work', async ({ page }) => {
  await page.goto('/?view=path');
  await expect(page.locator('.curriculum-card')).toHaveCount(7);
  await expect(page.locator('.curriculum-card .lesson-row')).toHaveCount(61);
  await page.getByRole('button', { name: 'Phase 5', exact: true }).click();
  await expect(page.locator('.curriculum-card')).toHaveCount(1);
  await expect(page.locator('.curriculum-card')).toContainText('Position sizing');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Find your next lesson' })).toBeVisible();
  await page.getByLabel('Search lessons', { exact: true }).fill('spread');
  await page
    .locator('#search-results')
    .getByRole('link', { name: /The spread/ })
    .click();
  await expect(page.getByRole('heading', { name: 'The spread', exact: true })).toBeVisible();
  await page.getByLabel('$50', { exact: true }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.locator('.quiz-feedback')).toContainText('That’s right.');
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.quiz-feedback')).toContainText('That’s right.');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Large', exact: true }).click();
  await page.goto('/learn/candlesticks');
  await expect(page.locator('.article-body')).toHaveCSS('--reading-size', '20px');
});

test('backup export, safe merge, and malformed backup rejection', async ({ page }) => {
  await page.goto('/?view=notes');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByLabel('Your note', { exact: true }).fill('Keep my existing note.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await event;
  expect(download.suggestedFilename()).toMatch(/lett-backup.*json/);
  const payload = {
    version: 1,
    completed: ['what-is-a-market'],
    notes: [],
    history: [],
    quiz: {},
    fontSize: 18,
  };
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(page.getByRole('status')).toContainText('Backup restored');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.getByRole('status')).toContainText('Could not restore');
  await page.getByRole('link', { name: /My notebook/ }).click();
  await expect(page.locator('.note-card')).toContainText('Keep my existing note.');
});

for (const theme of ['light', 'dark'] as const) {
  test(`accessible ${theme} dashboard and reader`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.week .week-day')).toHaveCount(7);
    let results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.goto('/learn/what-is-a-market');
    await page.getByRole('button', { name: 'Save takeaway to notebook' }).click();
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.goto('/?view=settings');
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('mobile navigation, reading, and reduced motion stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('link', { name: 'Learning path', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your learning path.' })).toBeVisible();
  await page
    .locator('.curriculum-card')
    .first()
    .getByRole('link', { name: /What is a market/ })
    .click();
  await expect(page.getByRole('heading', { name: 'What is a market?', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/mobile-reader.png', fullPage: true });
});

test('compact summary and keyboard search work across viewport sizes', async ({ page }) => {
  await page.goto('/');
  const summary = page.getByRole('banner', { name: 'Your learning summary' });
  await expect(summary).toContainText('Lessons completed');
  await expect(summary).toContainText('Phases explored fully');
  await expect(summary).toContainText('Ideas in your notebook');
  await expect(summary.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(summary.locator('.compact-stats')).toContainText('day streak');
  await expect(summary.getByRole('button', { name: 'Open lesson search' })).toHaveCount(0);
  const origin = page.getByRole('link', { name: 'Start learning', exact: true });
  await origin.focus();
  await page.keyboard.press('Meta+k');
  const modal = page.getByRole('dialog', { name: 'Find your next lesson' });
  const input = page.getByRole('textbox', { name: 'Search lessons', exact: true });
  await expect(modal).toBeVisible();
  await expect(input).toBeFocused();
  await input.fill('no-matching-lesson-xyz');
  await expect(modal).toContainText('No lessons found.');
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(origin).toBeFocused();
  await page.keyboard.press('Control+k');
  await input.fill('spread');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/search-modal.png' });
  await page.keyboard.press('Enter');
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'The spread', exact: true })).toBeVisible();
  await page.goto('/');
  await page.screenshot({ path: 'test-results/compact-dashboard.png', fullPage: true });
  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(summary.getByRole('progressbar')).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(input).toBeFocused();
    await page.getByRole('button', { name: 'Close search', exact: true }).click();
    await expect(modal).not.toBeVisible();
  }
  await page.screenshot({ path: 'test-results/compact-mobile.png', fullPage: true });
});
