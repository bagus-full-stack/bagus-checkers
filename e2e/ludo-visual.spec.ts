import AxeBuilder from '@axe-core/playwright';
import { devices, expect, Page, test } from '@playwright/test';

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};

/** Reference Ludo layout (15x15, 52-cell circuit, 4 yards, 4 home columns, 8 safe squares (4 starts + 4 stars)). */
const YARDS = { red: [0, 0], green: [0, 9], blue: [9, 0], yellow: [9, 9] } as const;
const HOME = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
} as const;
const STARTS = { red: [6, 0], green: [0, 8], yellow: [8, 14], blue: [14, 6] } as const;
const ARROWS = { red: [7, 0], green: [0, 7], yellow: [7, 14], blue: [14, 7] } as const;
const MAIN = { red: '#ef4444', green: '#22c55e', yellow: '#eab308', blue: '#3b82f6' } as const;
const YARD_BG = { red: '#fca5a5', green: '#86efac', yellow: '#fde047', blue: '#93c5fd' } as const;

const cell = (page: Page, r: number, c: number) => page.locator('.ludo-cell').nth(r * 15 + c);
const bg = (page: Page, r: number, c: number) => cell(page, r, c).evaluate((e) => getComputedStyle(e).backgroundColor);

async function openLocal(page: Page) {
  await page.goto('/game/local?variant=ludo');
  await expect(page.locator('.ludo-cell')).toHaveCount(225);
}

test.describe('Board matches the standard Ludo layout', () => {
  test.beforeEach(async ({ page }) => openLocal(page));

  test('15x15 grid, square, with the 3x3 center as four triangles', async ({ page }) => {
    const box = await page.locator('.ludo-grid').boundingBox();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
    const center = page.locator('.ludo-center');
    expect(await center.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('conic-gradient');
    const grid = (await page.locator('.ludo-grid').boundingBox())!;
    const c = (await center.boundingBox())!;
    // centered, one fifth of the board
    expect(Math.abs(c.x + c.width / 2 - (grid.x + grid.width / 2))).toBeLessThan(3);
    expect(Math.abs(c.width / grid.width - 0.2)).toBeLessThan(0.02);
    for (const [r, col] of [[6, 6], [6, 7], [6, 8], [7, 6], [7, 7], [7, 8], [8, 6], [8, 7], [8, 8]]) {
      await expect(cell(page, r, col)).toHaveClass(/\bcenter\b/);
    }
  });

  test('four 6x6 yards in the standard corners and colors', async ({ page }) => {
    for (const [color, [r0, c0]] of Object.entries(YARDS)) {
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          await expect(cell(page, r0 + r, c0 + c)).toHaveClass(new RegExp(`base-${color}`));
        }
      }
      expect(await bg(page, r0, c0)).toBe(rgb(YARD_BG[color as keyof typeof YARD_BG]));
    }
  });

  test('each yard has a white nest with 4 colored spots', async ({ page }) => {
    for (const [color, [r0, c0]] of Object.entries(YARDS)) {
      let nest = 0, spots = 0;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
        const cls = (await cell(page, r0 + r, c0 + c).getAttribute('class'))!;
        if (cls.includes('nest')) nest++;
        if (cls.includes('nest-spot')) spots++;
      }
      expect({ color, nest, spots }).toEqual({ color, nest: 16, spots: 4 });
      expect(await bg(page, r0 + 1, c0 + 1)).toBe('rgb(255, 255, 255)');
      expect(await cell(page, r0 + 2, c0 + 2).evaluate((e) => getComputedStyle(e).backgroundImage)).toContain(
        rgb(MAIN[color as keyof typeof MAIN]),
      );
    }
  });

  test('52 shared track cells, four 5-cell home columns in the right colors', async ({ page }) => {
    const track = await page.locator('.ludo-cell.track').count();
    expect(track).toBe(52);
    for (const [color, cells] of Object.entries(HOME)) {
      expect(cells).toHaveLength(5);
      for (const [r, c] of cells) {
        await expect(cell(page, r, c)).toHaveClass(new RegExp(`home-${color}`));
        expect(await bg(page, r, c)).toBe(rgb(MAIN[color as keyof typeof MAIN]));
      }
    }
  });

  test('colored start squares with a star, 4 entries + 4 stars, at the standard cells', async ({ page }) => {
    expect(await page.locator('.ludo-cell.safe').count()).toBe(8);
    for (const [r, c] of [[3, 6], [6, 11], [11, 8], [8, 3]]) {
      await expect(cell(page, r, c)).toHaveClass(/(^| )star( |$)/);
      expect(await bg(page, r, c)).toBe(await bg(page, 6, 3)); // same plain track color as any other track cell
      expect(await cell(page, r, c).evaluate((e) => getComputedStyle(e, '::after').content)).toContain('★');
    }
    for (const [color, [r, c]] of Object.entries(STARTS)) {
      await expect(cell(page, r, c)).toHaveClass(new RegExp(`start-${color}`));
      expect(await bg(page, r, c)).toBe(rgb(MAIN[color as keyof typeof MAIN]));
      expect(await cell(page, r, c).evaluate((e) => getComputedStyle(e, '::after').content)).toContain('★');
    }
  });

  test('home-entry arrows point into each home column, in its color', async ({ page }) => {
    const glyph = { red: '▶', green: '▼', yellow: '◀', blue: '▲' };
    for (const [color, [r, c]] of Object.entries(ARROWS)) {
      const after = await cell(page, r, c).evaluate((e) => {
        const s = getComputedStyle(e, '::after');
        return { content: s.content, color: s.color };
      });
      expect(after.content).toContain(glyph[color as keyof typeof glyph]);
      expect(after.color).toBe(rgb(MAIN[color as keyof typeof MAIN]));
    }
  });

  test('16 tokens, 4 per color, one distinct shape per color, accessible names', async ({ page }) => {
    const marks = { red: '▲', green: '■', yellow: '◆', blue: '●' };
    for (const [color, mark] of Object.entries(marks)) {
      const pieces = page.locator(`app-piece.${color}`);
      await expect(pieces).toHaveCount(4);
      for (let i = 0; i < 4; i++) {
        await expect(pieces.nth(i).locator('.token-inner')).toHaveText(mark);
      }
    }
    expect(new Set(Object.values(marks)).size).toBe(4);
    await expect(page.getByRole('img', { name: 'Pion rouge' }).first()).toBeVisible();
  });
});

test.describe('Dice', () => {
  test('every face 1-6 shows the right number of pips in the standard pattern', async ({ page }) => {
    await openLocal(page);
    const seen = new Set<number>();
    await page.clock.install();
    for (let i = 0; i < 80 && seen.size < 6; i++) {
      const dice = page.locator('.dice');
      if (await dice.isEnabled()) await dice.click();
      await page.clock.runFor(700);
      const face = page.locator('.dice-face');
      const v = Number(await face.getAttribute('data-value'));
      if (v && !seen.has(v)) {
        seen.add(v);
        expect(await face.locator('.dot').count()).toBe(v);
        const fb = (await face.boundingBox())!;
        const dots = await face.locator('.dot').evaluateAll((els) =>
          els.map((e) => {
            const b = e.getBoundingClientRect();
            return [b.x + b.width / 2, b.y + b.height / 2];
          }),
        );
        const rel = dots.map(([x, y]) => [(x - fb.x) / fb.width, (y - fb.y) / fb.height]);
        // all pips inside the face, none overlapping
        for (const [x, y] of rel) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(1); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(1); }
        for (let a = 0; a < rel.length; a++) for (let b = a + 1; b < rel.length; b++) {
          expect(Math.hypot(rel[a][0] - rel[b][0], rel[a][1] - rel[b][1])).toBeGreaterThan(0.1);
        }
        if (v === 1) expect(Math.abs(rel[0][0] - 0.5) + Math.abs(rel[0][1] - 0.5)).toBeLessThan(0.1);
        if (v === 6) expect(new Set(rel.map((p) => Math.round(p[0] * 10))).size).toBe(2); // two columns
      }
      const mov = page.locator('app-piece.movable');
      if (await mov.count()) await mov.first().click();
      await page.clock.runFor(1200);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

const PAGES = [
  ['home', '/ludo'],
  ['local', '/game/local?variant=ludo'],
  ['ai', '/game/ai?variant=ludo'],
  ['online-lobby', '/game/online?variant=ludo'],
  ['tutorial', '/tutorial?variant=ludo'],
] as const;

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Accessibility (axe, WCAG 2.1 A/AA) - ${theme} theme`, () => {
    for (const [name, url] of PAGES) {
      test(`${name}`, async ({ page }) => {
        await page.goto(url);
        await page.waitForTimeout(1200);
        await page.evaluate((t) => {
          document.documentElement.classList.toggle('light-theme', t === 'light');
        }, theme);
        await page.waitForTimeout(300);
        const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const out = res.violations.map((v) => ({
          rule: v.id,
          impact: v.impact,
          n: v.nodes.length,
          sample: v.nodes[0].html.slice(0, 120),
          why: v.nodes[0].any[0]?.message?.slice(0, 140),
        }));
        console.log(`AXE ${theme} ${name}: ${out.length} violation(s)`, out.length ? JSON.stringify(out) : '');
        expect.soft(out).toEqual([]);
      });
    }
  });
}

const VIEWPORTS = [
  ['phone 360x640', 360, 640],
  ['phone 390x844', 390, 844],
  ['tablet 768x1024', 768, 1024],
  ['laptop 1366x768', 1366, 768],
  ['desktop 1920x1080', 1920, 1080],
] as const;

test.describe('Responsive layout', () => {
  for (const [label, w, h] of VIEWPORTS) {
    for (const url of ['/game/local?variant=ludo', '/game/ai?variant=ludo']) {
      test(`${label} ${url.split('/')[2].split('?')[0]}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(url);
        await expect(page.locator('.ludo-cell')).toHaveCount(225);
        const m = await page.evaluate(() => {
          const g = document.querySelector('.ludo-grid')!.getBoundingClientRect();
          const cellEl = document.querySelector('.ludo-cell')!.getBoundingClientRect();
          const h1 = document.querySelector('h1')!;
          const hint = document.querySelector('.roll-hint')!.getBoundingClientRect();
          const lh = parseFloat(getComputedStyle(h1).lineHeight) || parseFloat(getComputedStyle(h1).fontSize) * 1.2;
          return {
            overflowX: document.documentElement.scrollWidth > window.innerWidth,
            left: g.left, right: g.right, w: g.width, h: g.height, cell: cellEl.width,
            titleLines: Math.round(h1.getBoundingClientRect().height / lh),
            hintLines: Math.round(hint.height / (parseFloat(getComputedStyle(document.querySelector('.roll-hint')!).fontSize) * 1.3)),
          };
        });
        console.log(`LAYOUT ${label} ${url}`, JSON.stringify(m));
        expect(m.overflowX, 'horizontal scroll').toBe(false);
        expect(m.left).toBeGreaterThanOrEqual(0);
        expect(m.right).toBeLessThanOrEqual(w);
        expect(Math.abs(m.w - m.h)).toBeLessThan(2);
        // WCAG 2.5.8: 24 CSS px targets. 15 cells x 24px = 360px, so a 360px-wide phone cannot reach it.
        expect.soft(m.cell, 'cell size (tap target)').toBeGreaterThanOrEqual(w >= 390 ? 24 : 22);
        expect(m.titleLines, 'title wraps on too many lines').toBeLessThanOrEqual(2);
        expect(m.hintLines, '"Lancer le dé" label wraps').toBe(1);
        await page.screenshot({ path: `test-results/visual-${label.replace(/\s/g, '_')}-${url.split('/')[2].split('?')[0]}.png` });
      });
    }
  }
});

test.describe('Turn indicator contrast for every player color', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(theme, async ({ page }) => {
      await openLocal(page);
      await page.evaluate((t) => document.documentElement.classList.toggle('light-theme', t === 'light'), theme);
      await page.clock.install();
      const seen = new Set<string>();
      for (let i = 0; i < 200 && seen.size < 4; i++) {
        const name = (await page.locator('.player-name').textContent())!.trim();
        if (!seen.has(name)) {
          seen.add(name);
          const res = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
          expect.soft(res.violations.map((v) => v.nodes.map((n) => n.html.slice(0, 80))), `${theme} ${name}`).toEqual([]);
        }
        const dice = page.locator('.dice');
        if (await dice.isEnabled()) await dice.click();
        await page.clock.runFor(700);
        const mov = page.locator('app-piece.movable');
        if (await mov.count()) await mov.first().click();
        await page.clock.runFor(1200);
      }
      expect([...seen].sort()).toEqual(['Bleu', 'Jaune', 'Rouge', 'Vert']);
    });
  }
});

test.describe('Keyboard and colour-independence', () => {
  test('a playable token is reachable by Tab and plays with Enter', async ({ page }) => {
    await openLocal(page);
    await page.clock.install();
    for (let i = 0; i < 40 && !(await page.locator('app-piece.movable').count()); i++) {
      await page.locator('.dice').click();
      await page.clock.runFor(700);
      if (!(await page.locator('app-piece.movable').count())) await page.clock.runFor(1200);
    }
    const mov = page.locator('app-piece.movable').first();
    await expect(mov).toHaveAttribute('role', 'button');
    await expect(mov).toHaveAttribute('tabindex', '0');
    // Reach a token with the real Tab key (not focus()) and check a visible focus ring.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    let focused = false;
    for (let i = 0; i < 60 && !focused; i++) {
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.tagName === 'APP-PIECE');
    }
    expect(focused, 'Tab never reached a playable token').toBe(true);
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor };
    });
    console.log('FOCUS ring', JSON.stringify(ring));
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Enter');
    await expect(page.locator('app-piece.movable')).toHaveCount(0);
  });

  test('grayscale render: the four colors stay distinguishable by shape', async ({ page }) => {
    await openLocal(page);
    await page.addStyleTag({ content: 'html{filter:grayscale(1)}' });
    await page.screenshot({ path: 'test-results/visual-grayscale.png' });
    const marks = await page.locator('app-piece .token-inner').allTextContents();
    expect(new Set(marks).size).toBe(4);
  });
});

test.describe('Screen-reader view (accessibility tree)', () => {
  test('board, tokens, dice and turn status are announced with meaningful names', async ({ page }) => {
    await openLocal(page);
    const tree = await page.locator('body').ariaSnapshot();
    console.log('ARIA', tree.split('\n').filter((l) => /group|img|button|status|heading/.test(l)).slice(0, 20).join(' | '));
    expect(tree).toContain('Plateau de Ludo');
    expect(tree).toContain('Pion rouge');
    expect(tree).toContain('Pion vert');
    expect(tree).toContain('Pion jaune');
    expect(tree).toContain('Pion bleu');
    expect(tree).toMatch(/Lancer le dé/);
    expect(tree).toMatch(/Tour du joueur/);
  });

  test('axe best-practice and WCAG 2.2 AA rules', async ({ page }) => {
    await openLocal(page);
    const res = await new AxeBuilder({ page }).withTags(['best-practice', 'wcag22aa']).analyze();
    const out = res.violations.map((v) => ({ rule: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].html.slice(0, 100) }));
    console.log('AXE best-practice', JSON.stringify(out));
    expect(out).toEqual([]);
  });
});

test.describe('Touch devices (emulated phones)', () => {
  for (const name of ['iPhone 13', 'Pixel 7']) {
    test(`${name}: board fits and a token can be played by tap`, async ({ browser }) => {
      const ctx = await browser.newContext({ ...devices[name] });
      const page = await ctx.newPage();
      await page.goto('/game/local?variant=ludo');
      await expect(page.locator('.ludo-cell')).toHaveCount(225);
      const fit = await page.evaluate(() => {
        const g = document.querySelector('.ludo-grid')!.getBoundingClientRect();
        return { overflowX: document.documentElement.scrollWidth > window.innerWidth, inside: g.left >= 0 && g.right <= window.innerWidth, cell: g.width / 15 };
      });
      console.log(`TOUCH ${name}`, JSON.stringify(fit));
      expect(fit.overflowX).toBe(false);
      expect(fit.inside).toBe(true);
      await page.clock.install();
      for (let i = 0; i < 60 && !(await page.locator('app-piece.movable').count()); i++) {
        await page.locator('.dice').tap();
        await page.clock.runFor(700);
        await page.clock.runFor(1200);
      }
      await expect(page.locator('app-piece.movable').first()).toBeVisible();
      await page.locator('app-piece.movable').first().tap();
      await expect(page.locator('app-piece.movable')).toHaveCount(0);
      await ctx.close();
    });
  }
});
