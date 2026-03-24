import { test, expect } from '@playwright/test';
import { PLAYER_CONTAINER_SELECTOR, HUMAN_PLAYER_LABEL } from './constants';

interface PlayerIds {
  humanId: string;
  cpuIds: string[];
}

async function findPlayerIds(page: import('@playwright/test').Page): Promise<PlayerIds> {
  const players = page.locator(PLAYER_CONTAINER_SELECTOR);
  const results = await players.evaluateAll(elements =>
    elements.map(el => ({
      testId: el.getAttribute('data-testid'),
      text: el.textContent,
    }))
  );

  let humanId: string | null = null;
  const cpuIds: string[] = [];

  for (const { testId, text } of results) {
    if (!testId) continue;
    const id = testId.replace('player-', '');
    if (text?.includes(HUMAN_PLAYER_LABEL)) {
      humanId = id;
    } else {
      cpuIds.push(id);
    }
  }

  if (!humanId) {
    throw new Error(`Human player not found: no element contains "${HUMAN_PLAYER_LABEL}"`);
  }

  return { humanId, cpuIds };
}

test.describe('カード表示', () => {
  let humanId: string;
  let cpuIds: string[];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByTestId('poker-table')).toBeVisible();
    const playerIds = await findPlayerIds(page);
    humanId = playerIds.humanId;
    cpuIds = playerIds.cpuIds;
  });

  test('ヒューマンプレイヤーのカードにランク文字が表示される (4.1)', async ({ page }) => {
    const cardsContainer = page.getByTestId(`player-cards-${humanId}`);
    await expect(cardsContainer).toBeVisible();

    const faceUpCards = cardsContainer.locator('[data-testid="card-face-up"]');

    await expect(faceUpCards).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(faceUpCards.nth(i)).toContainText(/(2|3|4|5|6|7|8|9|10|J|Q|K|A)/);
    }
  });

  test('CPUプレイヤーのカードにランク文字が表示されていない (4.2)', async ({ page }) => {
    expect(cpuIds.length).toBeGreaterThan(0);

    for (const cpuId of cpuIds) {
      const cardsContainer = page.getByTestId(`player-cards-${cpuId}`);
      await expect(cardsContainer).toBeVisible();

      const faceUpCards = cardsContainer.locator('[data-testid="card-face-up"]');
      await expect(faceUpCards).toHaveCount(0);
    }
  });

  test('カード要素のBoundingBoxが有効なサイズである (4.3)', async ({ page }) => {
    const cardsContainer = page.getByTestId(`player-cards-${humanId}`);
    await expect(cardsContainer).toBeVisible();

    const cards = cardsContainer.locator('> div');
    const cardCount = await cards.count();
    expect(cardCount).toBe(2);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();

      const box = await card.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }
    }
  });
});
