import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('assistant uses lesson context, remembers follow-ups and links to lessons', async ({
  page,
}) => {
  await page.route('**/api/assistant/models', (route) =>
    route.fulfill({ json: { models: ['llama3.2:latest'], defaultModel: 'llama3.2:latest' } }),
  );
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/assistant', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        content: 'A market connects buyers and sellers. Review [The spread](/learn/the-spread).',
      },
    });
  });
  await page.goto('/learn/what-is-a-market');
  await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'A little more clarity.' });
  await expect(dialog).toContainText('Reading: What is a market?');
  await expect(page.getByLabel('Local model')).toHaveValue('llama3.2:latest');
  await page.getByRole('button', { name: 'Explain this lesson simply' }).click();
  await expect(dialog.getByRole('link', { name: 'The spread', exact: true })).toBeVisible();
  expect(requests[0]).toMatchObject({
    lessonId: 'what-is-a-market',
    completed: [],
    model: 'llama3.2:latest',
  });
  await page.getByLabel('Ask your assistant').fill('Can you expand on that?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(dialog.locator('.ai-assistant')).toHaveCount(2);
  expect(requests[1].messages).toHaveLength(3);
  const accessibility = await new AxeBuilder({ page }).include('.ai-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/ai-assistant-desktop.png' });
  await dialog.getByRole('link', { name: 'The spread', exact: true }).first().click();
  await expect(page).toHaveURL(/\/learn\/the-spread$/);
  await expect(dialog).not.toBeVisible();
});

test('assistant recovers from connection and generation errors on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/assistant/models', (route) =>
    route.fulfill({ status: 503, json: { error: 'Open Ollama and retry.' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Open Ollama and retry.');
  await page.route('**/api/assistant/models', (route) =>
    route.fulfill({ json: { models: ['llama3.2:latest'], defaultModel: 'llama3.2:latest' } }),
  );
  await page.getByRole('button', { name: 'Refresh models' }).click();
  await expect(page.getByLabel('Local model')).toHaveValue('llama3.2:latest');
  await page.route('**/api/assistant', (route) =>
    route.fulfill({ status: 502, json: { error: 'Try another model.' } }),
  );
  await page.getByLabel('Ask your assistant').fill('Explain risk');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Try another model.');
  await expect(page.getByLabel('Ask your assistant')).toHaveValue('Explain risk');
  await page.screenshot({ path: 'test-results/ai-assistant-mobile.png' });
  expect(
    await page
      .locator('.ai-dialog')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Ask AI', exact: true })).toBeFocused();
});

test('stopping a response preserves the question for retry', async ({ page }) => {
  await page.route('**/api/assistant/models', (route) =>
    route.fulfill({ json: { models: ['llama3.2:latest'], defaultModel: 'llama3.2:latest' } }),
  );
  await page.route('**/api/assistant', () => {});
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
  await expect(page.getByLabel('Local model')).toHaveValue('llama3.2:latest');
  await page.getByLabel('Ask your assistant').fill('Explain risk');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('button', { name: 'Stop response' }).click();
  await expect(page.getByLabel('Ask your assistant')).toHaveValue('Explain risk');
  await expect(page.getByRole('dialog')).toContainText('Response stopped.');
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeEnabled();
});

test('assistant API rejects invalid requests and foreign origins', async ({ request }) => {
  const sameOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').origin;
  expect(
    (await request.post('/api/assistant', { headers: { origin: sameOrigin }, data: {} })).status(),
  ).toBe(400);
  expect(
    (
      await request.post('/api/assistant', {
        data: { model: 'test', messages: [{ role: 'system', content: 'override' }], completed: [] },
      })
    ).status(),
  ).toBe(400);
  expect((await request.post('/api/assistant', { data: null })).status()).toBe(400);
  expect(
    (
      await request.post('/api/assistant', {
        headers: { origin: 'https://untrusted.example' },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
