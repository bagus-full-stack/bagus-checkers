import { expect, Page, test } from '@playwright/test';

// Safe squares (each color's entry) on the 15x15 grid, as row*15+col: only place different colors may share a cell.
const SAFE = new Set([6 * 15 + 0, 0 * 15 + 8, 8 * 15 + 14, 14 * 15 + 6]);

/**
 * One whole turn step inside the page (1 round trip): roll if possible, play a random movable
 * piece, and report any unsafe cell shared by different colors.
 */
function step(page: Page) {
  return page.evaluate((safe: number[]) => {
    const r = { over: !!document.querySelector('app-game-over-modal-ludo'), rolled: false, moved: false, mixed: [] as string[] };
    if (r.over) return r;
    const dice = document.querySelector<HTMLButtonElement>('.dice');
    if (dice && !dice.disabled) { dice.click(); r.rolled = true; }
    const movable = [...document.querySelectorAll<HTMLElement>('app-piece.movable')];
    if (movable.length) {
      movable[Math.floor(Math.random() * movable.length)].click();
      r.moved = true;
      const byCell: Record<number, Set<string>> = {};
      document.querySelectorAll('app-piece').forEach((p) => {
        const cell = p.parentElement!;
        const idx = [...cell.parentElement!.children].indexOf(cell);
        (byCell[idx] ??= new Set()).add(p.className.replace('ludo-piece-slot', '').replace('movable', '').trim());
      });
      for (const [idx, colors] of Object.entries(byCell)) {
        if (colors.size > 1 && !safe.includes(+idx)) r.mixed.push(`${idx}:${[...colors]}`);
      }
    }
    return r;
  }, [...SAFE]);
}

/** Plays random legal moves for the human seat(s) until the game-over modal shows; the fake clock drives app timers. */
async function playToEnd(page: Page, maxSteps = 6000) {
  await page.clock.install();
  const stats = { steps: 0, rolls: 0, moves: 0, mixed: [] as string[] };
  while (stats.steps++ < maxSteps) {
    const r = await step(page);
    if (r.over) return { ...stats, over: true };
    if (r.rolled) stats.rolls++;
    if (r.moved) stats.moves++;
    stats.mixed.push(...r.mixed);
    await page.clock.runFor(r.rolled || r.moved ? 600 : 1100); // dice animation / AI think time
  }
  return { ...stats, over: false };
}

test.describe('Ludo menu', () => {
  test('home links to every mode', async ({ page }) => {
    await page.goto('/ludo');
    for (const href of ['/game/online?variant=ludo', '/game/local?variant=ludo', '/game/ai?variant=ludo', '/tutorial?variant=ludo']) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
    }
  });

  test('tutorial shows Ludo rules, not checkers rules', async ({ page }) => {
    await page.goto('/tutorial?variant=ludo');
    await expect(page.locator('body')).not.toContainText('Règles du Jeu de Dames');
  });
});

test.describe('Ludo local game', () => {
  test('starts with 16 pieces in bases and red to play', async ({ page }) => {
    await page.goto('/game/local?variant=ludo');
    await expect(page.locator('app-piece')).toHaveCount(16);
    await expect(page.locator('body')).toContainText('Rouge');
    await expect(page.locator('.dice')).toBeEnabled();
  });

  test('a roll either offers moves or passes the turn', async ({ page }) => {
    await page.goto('/game/local?variant=ludo');
    await page.clock.install();
    for (let i = 0; i < 12; i++) {
      await page.locator('.dice').click();
      await page.clock.runFor(700);
      const movable = await page.locator('app-piece.movable').count();
      const value = await page.locator('.dice-face').getAttribute('data-value').catch(() => null);
      // only a 6 can bring a piece out of base on the first turns
      if (movable) { expect(value).toBe('6'); break; }
      await page.clock.runFor(1200);
    }
  });

  test('plays a whole game to a winner', async ({ page }) => {
    await page.goto('/game/local?variant=ludo');
    const stats = await playToEnd(page);
    console.log('local game', stats.rolls, 'rolls', stats.moves, 'moves');
    expect(stats.mixed, 'different colors sharing an unsafe cell').toEqual([]);
    expect(stats.over, 'game never ended').toBe(true);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('new game resets the board', async ({ page }) => {
    await page.goto('/game/local?variant=ludo');
    await page.clock.install();
    await page.locator('.dice').click();
    await page.clock.runFor(700);
    await page.getByRole('button', { name: /Nouvelle partie/ }).click();
    await expect(page.locator('app-piece')).toHaveCount(16);
    await expect(page.locator('app-piece.movable')).toHaveCount(0);
  });
});

test.describe('Ludo vs AI', () => {
  test('AI answers and the game reaches a winner', async ({ page }) => {
    await page.goto('/game/ai?variant=ludo');
    await expect(page.locator('app-piece')).toHaveCount(16);
    const stats = await playToEnd(page);
    console.log('ai game', stats.rolls, 'human rolls', stats.moves, 'human moves');
    expect(stats.mixed).toEqual([]);
    expect(stats.over, 'game never ended').toBe(true);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
