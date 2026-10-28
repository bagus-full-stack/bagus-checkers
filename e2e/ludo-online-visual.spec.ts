import AxeBuilder from '@axe-core/playwright';
import { Browser, expect, Page, test } from '@playwright/test';

/** Host + guest in one Ludo room, both ready, game running. Returns the host page (where the board is checked). */
async function startOnlineGame(browser: Browser) {
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const roomName = `visuel-${Date.now()}`;

  await host.goto('/game/online?variant=ludo');
  await host.getByLabel('Votre pseudo').fill('Hote');
  await host.getByRole('button', { name: 'Se connecter' }).click();
  await host.getByPlaceholder('Ma partie...').fill(roomName);
  await host.getByRole('button', { name: /Cr[ée]er/ }).click();

  await guest.goto('/game/online?variant=ludo');
  await guest.getByLabel('Votre pseudo').fill('Invite');
  await guest.getByRole('button', { name: 'Se connecter' }).click();
  const card = guest.locator('.room-card', { hasText: roomName });
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.getByRole('button', { name: 'Rejoindre' }).click();

  for (const p of [host, guest]) {
    await p.getByLabel('Je suis prêt').check();
  }
  await expect(host.locator('.ludo-cell')).toHaveCount(225, { timeout: 15000 });
  return { host, guest, close: async () => { await hostCtx.close(); await guestCtx.close(); } };
}

test.describe('Online Ludo game page', () => {
  let g: Awaited<ReturnType<typeof startOnlineGame>>;
  test.beforeEach(async ({ browser }) => { g = await startOnlineGame(browser); });
  test.afterEach(async () => { await g.close(); });

  test('board follows the standard layout', async () => {
    const info = await g.host.evaluate(() => {
      const cells = [...document.querySelectorAll('.ludo-cell')];
      const count = (re: RegExp) => cells.filter((c) => re.test(c.className)).length;
      const grid = document.querySelector('.ludo-grid')!.getBoundingClientRect();
      return {
        cells: cells.length,
        track: count(/(^| )track( |$)/),
        safe: count(/(^| )safe( |$)/),
        center: count(/(^| )center( |$)/),
        yards: ['red', 'green', 'yellow', 'blue'].map((c) => count(new RegExp(`base-${c}`))),
        home: ['red', 'green', 'yellow', 'blue'].map((c) => count(new RegExp(`home-${c}`))),
        spots: count(/nest-spot/),
        square: Math.abs(grid.width - grid.height) < 2,
        centerGradient: getComputedStyle(document.querySelector('.ludo-center')!).backgroundImage.includes('conic-gradient'),
        role: document.querySelector('.ludo-grid')?.closest('[role=group]')?.getAttribute('aria-label'),
      };
    });
    expect(info).toEqual({
      cells: 225, track: 52, safe: 8, center: 9,
      yards: [36, 36, 36, 36], home: [5, 5, 5, 5], spots: 16,
      square: true, centerGradient: true, role: 'Plateau de Ludo',
    });
  });

  test('two players: 8 tokens, one shape per color, dice shows a face after the roll', async () => {
    await expect(g.host.locator('app-piece')).toHaveCount(8);
    const marks = await g.host.locator('app-piece .token-inner').allTextContents();
    expect(new Set(marks).size).toBe(2);
    await g.host.locator('.dice').click();
    await expect(g.host.locator('.dice-face')).toHaveAttribute('data-value', /[1-6]/, { timeout: 10000 });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`axe WCAG 2.1 AA - ${theme} theme`, async () => {
      await g.host.evaluate((t) => document.documentElement.classList.toggle('light-theme', t === 'light'), theme);
      await g.host.waitForTimeout(300);
      const res = await new AxeBuilder({ page: g.host }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const out = res.violations.map((v) => ({ rule: v.id, n: v.nodes.length, sample: v.nodes[0].html.slice(0, 120), why: v.nodes[0].any[0]?.message }));
      console.log(`AXE online ${theme}`, JSON.stringify(out));
      expect(out).toEqual([]);
    });
  }

  for (const [w, h] of [[360, 640], [390, 844], [768, 1024], [1366, 768]]) {
    test(`layout ${w}x${h}`, async () => {
      await g.host.setViewportSize({ width: w, height: h });
      await g.host.waitForTimeout(300);
      const m = await g.host.evaluate(() => {
        const grid = document.querySelector('.ludo-grid')!.getBoundingClientRect();
        const h1 = document.querySelector('h1');
        const hint = document.querySelector('.roll-hint')!;
        const line = (e: Element) => parseFloat(getComputedStyle(e).fontSize) * 1.4;
        return {
          overflowX: document.documentElement.scrollWidth > window.innerWidth,
          fits: grid.left >= 0 && grid.right <= window.innerWidth,
          cell: document.querySelector('.ludo-cell')!.getBoundingClientRect().width,
          hintLines: Math.round(hint.getBoundingClientRect().height / line(hint)),
          titleLines: h1 ? Math.round(h1.getBoundingClientRect().height / line(h1)) : 1,
        };
      });
      console.log(`ONLINE LAYOUT ${w}x${h}`, JSON.stringify(m));
      expect(m.overflowX).toBe(false);
      expect(m.fits).toBe(true);
      expect(m.cell).toBeGreaterThanOrEqual(w >= 390 ? 24 : 22);
      expect(m.hintLines).toBe(1);
      expect(m.titleLines).toBeLessThanOrEqual(2);
    });
  }

  test('a playable token is reachable by Tab and keyboard Enter plays it', async () => {
    // both seats roll in turn until one gets a six (the only roll that moves a token out of the yard)
    let page: Page | undefined;
    for (let i = 0; i < 80 && !page; i++) {
      for (const p of [g.host, g.guest]) {
        if (await p.locator('app-piece.movable').count()) { page = p; break; }
        const dice = p.locator('.dice');
        if (await dice.isEnabled()) await dice.click();
      }
      await g.host.waitForTimeout(700);
    }
    expect(page, 'no six rolled in 80 rounds').toBeTruthy();
    await page!.locator('body').click({ position: { x: 1, y: 1 } });
    let focused = false;
    for (let i = 0; i < 80 && !focused; i++) {
      await page!.keyboard.press('Tab');
      focused = await page!.evaluate(() => document.activeElement?.tagName === 'APP-PIECE');
    }
    expect(focused).toBe(true);
    await page!.keyboard.press('Enter');
    await expect(page!.locator('app-piece.movable')).toHaveCount(0, { timeout: 5000 });
  });
});
