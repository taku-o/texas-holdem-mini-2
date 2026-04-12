import { test, expect } from '@playwright/test';
import { CARD_FACE_UP_SELECTOR, HUMAN_HAND_CARD_COUNT, GAME_FLOW_TEST_TIMEOUT, FLOP_CARD_COUNT } from './constants';
import { findPlayerIds, startGame, advanceToPhaseOrShowdown, advanceToShowdown } from './helpers';

test.describe('カード表示', () => {
  let humanId: string;
  let cpuIds: string[];

  test.beforeEach(async ({ page }) => {
    await startGame(page);
    const playerIds = await findPlayerIds(page);
    humanId = playerIds.humanId;
    cpuIds = playerIds.cpuIds;
  });

  test('ヒューマンプレイヤーのカードにランク文字が表示される (4.1)', async ({ page }) => {
    const cardsContainer = page.getByTestId(`player-cards-${humanId}`);
    await expect(cardsContainer).toBeVisible();

    const faceUpCards = cardsContainer.locator(CARD_FACE_UP_SELECTOR);

    await expect(faceUpCards).toHaveCount(HUMAN_HAND_CARD_COUNT);
    for (let i = 0; i < HUMAN_HAND_CARD_COUNT; i++) {
      await expect(faceUpCards.nth(i)).toContainText(/(2|3|4|5|6|7|8|9|10|J|Q|K|A)/);
    }
  });

  test('CPUプレイヤーのカードにランク文字が表示されていない (4.2)', async ({ page }) => {
    expect(cpuIds.length).toBeGreaterThan(0);

    for (const cpuId of cpuIds) {
      const cardsContainer = page.getByTestId(`player-cards-${cpuId}`);
      await expect(cardsContainer).toBeVisible();

      const faceUpCards = cardsContainer.locator(CARD_FACE_UP_SELECTOR);
      await expect(faceUpCards).toHaveCount(0);
    }
  });

  test('ゲーム進行中のオールインCPUカードが裏面である (4.4)', async ({ page }) => {
    test.setTimeout(GAME_FLOW_TEST_TIMEOUT);

    // flopまで進行し、途中でshowdownに到達した場合は検証をスキップ
    const result = await advanceToPhaseOrShowdown(page, FLOP_CARD_COUNT);
    if (result === 'showdown') return;

    // 各CPUプレイヤーのカードが裏面であることを検証（ALL-INバッジの有無に関わらず）
    for (const cpuId of cpuIds) {
      const cardsContainer = page.getByTestId(`player-cards-${cpuId}`);
      const faceUpCards = cardsContainer.locator(CARD_FACE_UP_SELECTOR);
      // ALL-INバッジの有無に関わらず、ショーダウン前のCPUカードは全て裏面
      await expect(faceUpCards).toHaveCount(0);
    }
  });

  test('ショーダウン時に全CPUカードが表面表示される (4.5)', async ({ page }) => {
    test.setTimeout(GAME_FLOW_TEST_TIMEOUT);

    await advanceToShowdown(page);

    // ショーダウン到達後、全CPUプレイヤーのカードが表面表示されていること
    for (const cpuId of cpuIds) {
      const cardsContainer = page.getByTestId(`player-cards-${cpuId}`);
      const faceUpCards = cardsContainer.locator(CARD_FACE_UP_SELECTOR);
      await expect(faceUpCards).toHaveCount(HUMAN_HAND_CARD_COUNT);
    }
  });

  test('カード要素のBoundingBoxが有効なサイズである (4.3)', async ({ page }) => {
    const cardsContainer = page.getByTestId(`player-cards-${humanId}`);
    await expect(cardsContainer).toBeVisible();

    const cards = cardsContainer.locator('> div');
    const cardCount = await cards.count();
    expect(cardCount).toBe(HUMAN_HAND_CARD_COUNT);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();

      const box = await card.boundingBox();
      if (!box) throw new Error(`Card ${i} bounding box is null`);

      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });
});
