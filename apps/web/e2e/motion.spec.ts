import { expect, test, type Page } from '@playwright/test';
import { t } from '../src/i18n';

const it = t('it');

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('servizi: il filtro mostra una sola categoria e torna a "Tutti" (con e senza movimento ridotto)', async ({
  browser,
}) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const ctx = await browser.newContext({ reducedMotion });
    const page = await ctx.newPage();
    const errors = trackConsoleErrors(page);
    await page.goto('/servizi');
    const groups = page.locator('.price-group');
    await expect(groups).toHaveCount(5);

    const colore = page.getByRole('button', { name: 'Colore', exact: true });
    // il click funziona solo dopo l'idratazione: riprova finché il filtro risponde
    await expect(async () => {
      await colore.click();
      await expect(colore).toHaveAttribute('aria-pressed', 'true', { timeout: 500 });
    }).toPass();
    await expect(page.locator('.price-group[data-category="colore"]')).toBeVisible();
    await expect(page.locator('.price-group[data-category="taglio-piega"]')).toBeHidden();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(/: Colore$/);

    await page.getByRole('button', { name: it.services.filterAll, exact: true }).click();
    await expect(page.locator('.price-group:visible')).toHaveCount(5);
    expect(errors).toEqual([]);
    await ctx.close();
  }
});

test('titoli: con lo scroll compaiono per righe, il nome accessibile resta intero e il DOM torna com’era', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');
  const title = page.locator('#work-title');
  // MotionLayer parte a browser inattivo: SplitText mette sul titolo l'aria-label con il testo completo
  await expect(title).toHaveAttribute('aria-label', it.home.workTitle, { timeout: 6000 });
  await title.scrollIntoViewIfNeeded();
  await expect.poll(() => title.getAttribute('aria-label'), { timeout: 5000 }).toBeNull();
  await expect(page.getByRole('heading', { level: 2, name: it.home.workTitle })).toBeVisible();
  expect(errors).toEqual([]);
});

test('titoli: con prefers-reduced-motion il testo non viene diviso', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForTimeout(3500);
  await expect(page.locator('#work-title')).not.toHaveAttribute('aria-label', /.+/);
  await expect(page.locator('#work-title')).toHaveText(it.home.workTitle);
  await ctx.close();
});
