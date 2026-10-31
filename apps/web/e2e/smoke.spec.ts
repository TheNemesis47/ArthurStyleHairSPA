import { expect, test, type Page } from '@playwright/test';
import { pageKeys, routes } from '../src/i18n/routes';

const locales = ['it', 'en'] as const;

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

for (const locale of locales) {
  for (const key of pageKeys) {
    const path = routes[key][locale];
    test(`${locale} ${path}: 200, lang, un solo h1, hreflang, nessun errore`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page).toHaveTitle(/Arthur Style/);
      // hreflang: confronto sul pathname (Next scrive la home senza "/" finale)
      const alt = async (lang: string) =>
        new URL((await page.locator(`link[rel="alternate"][hreflang="${lang}"]`).getAttribute('href')) ?? '')
          .pathname;
      expect(await alt('it')).toBe(routes[key].it);
      expect(await alt('en')).toBe(routes[key].en === '/en' ? '/en' : routes[key].en);
      expect(await alt('x-default')).toBe(routes[key].it);
      await expect(page.locator('a.skip')).toHaveAttribute('href', '#main');
      expect(errors).toEqual([]);
    });
  }
}

test('navigazione: dalla home ai servizi, poi cambio lingua', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.getByText('Menu', { exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Navigazione principale' })
    .getByRole('link', { name: 'Servizi', exact: true })
    .click();
  await expect(page).toHaveURL(/\/servizi$/);
  await expect(page.locator('h1')).toHaveText('Servizi e prezzi');
  await expect(page.getByText('Colore radici + piega')).toBeVisible();
  if (isMobile) await page.getByText('Menu', { exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Navigazione principale' })
    .getByRole('link', { name: 'Read in English' })
    .click();
  await expect(page).toHaveURL(/\/en\/services$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveText('Services and prices');
});

test('contatti: telefono, WhatsApp e Instagram corretti', async ({ page }) => {
  await page.goto('/contatti');
  await expect(page.locator('a[href="tel:+393534918255"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://wa.me/393317545064"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://www.instagram.com/arthurstylehairspa/"]').first()).toBeVisible();
  await expect(page.getByRole('row', { name: /Lunedì/ })).toContainText('Chiuso');
  await expect(page.getByRole('row', { name: /Sabato/ })).toContainText('09:00–18:00');
});

test('Malta: il form valida e NON invia dati (solo anteprima)', async ({ page }) => {
  const requests: string[] = [];
  await page.goto('/malta');
  page.on('request', (r) => {
    if (r.method() !== 'GET') requests.push(r.url());
  });
  await page.getByRole('button', { name: 'Avvisami' }).click();
  await expect(page.getByText('Scrivi il tuo nome.')).toBeVisible();
  await expect(page.getByText('Serve il consenso per poterti scrivere.')).toBeVisible();
  await page.getByLabel('Nome', { exact: true }).fill('Maria');
  await page.getByLabel('Email', { exact: true }).fill('maria@esempio.it');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Avvisami' }).click();
  await expect(page.getByRole('status')).toContainText('nessun dato');
  expect(requests).toEqual([]);
});

test('hero: le ciocche si aprono con un velo animato; con prefers-reduced-motion niente animazione', async ({
  browser,
}) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const ctx = await browser.newContext({ reducedMotion });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('.strands path')).toHaveCount(108);
    await expect(page.locator('.strands')).toHaveAttribute('aria-hidden', 'true');
    const animation = await page
      .locator('.strands-veil')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe(reducedMotion === 'reduce' ? 'none' : 'strands-reveal');
    // a fine apertura il velo è fuori campo: le ciocche sono visibili
    await expect
      .poll(
        async () =>
          page
            .locator('.strands-veil')
            .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41 > 0),
        { timeout: 5000 },
      )
      .toBe(true);
    await ctx.close();
  }
});

test('404 bilingue per percorsi inesistenti', async ({ page }) => {
  const res = await page.goto('/questa-pagina-non-esiste');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('sitemap e robots', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const key of pageKeys)
    for (const l of locales) expect(xml).toContain(`${routes[key][l] === '/' ? '' : routes[key][l]}</loc>`);
  expect((await request.get('/robots.txt')).status()).toBe(200);
});
