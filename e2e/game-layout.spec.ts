import { test, expect } from '@playwright/test';
import { PLAYER_COUNT, PLAYER_CONTAINER_SELECTOR } from './constants';
import { startGame } from './helpers';

test.describe('ゲーム画面レイアウト', () => {
  test.beforeEach(async ({ page }) => {
    await startGame(page);
  });

  test('プレイヤー情報要素が5つ表示される (3.1)', async ({ page }) => {
    const players = page.locator(PLAYER_CONTAINER_SELECTOR);
    await expect(players).toHaveCount(PLAYER_COUNT);
  });

  test('ポット金額テキストが「$」と数値を含む (3.2)', async ({ page }) => {
    const potDisplay = page.getByTestId('pot-display');
    await expect(potDisplay).toBeVisible();
    await expect(potDisplay).toHaveText(/\$\d/);
  });

  test('Fold / Check(Call) / Raise ボタンが存在する (3.3)', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Check|Call/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Raise/ })).toBeVisible();
  });

  test('ロールバッジ（D / SB / BB）が表示される (3.4)', async ({ page }) => {
    const roleBadges = page.locator('[data-testid^="role-badge-"]');
    await expect(roleBadges).toHaveCount(3);

    const badgeTexts = await roleBadges.allTextContents();
    expect(badgeTexts).toContain('D');
    expect(badgeTexts).toContain('SB');
    expect(badgeTexts).toContain('BB');
  });

  test('各プレイヤーのBoundingBoxが画面内に収まっている (3.5)', async ({ page }, testInfo) => {
    const players = page.locator(PLAYER_CONTAINER_SELECTOR);
    await expect(players).toHaveCount(PLAYER_COUNT);

    const viewport = testInfo.project.use.viewport!;

    for (let i = 0; i < PLAYER_COUNT; i++) {
      const player = players.nth(i);
      await expect(player).toBeVisible();

      const box = await player.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    }
  });

  test('テーブルのBoundingBoxが最低値以上である (3.6)', async ({ page }) => {
    const pokerTable = page.getByTestId('poker-table');
    await expect(pokerTable).toBeVisible();

    const box = await pokerTable.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });

  test('ゲーム画面のスクリーンショットベースライン (3.7)', async ({ page }) => {
    // ゲーム画面はカード内容やプレイヤー配置がランダムなため、高めの閾値を設定
    await expect(page).toHaveScreenshot('game-screen.png', {
      maxDiffPixelRatio: 0.25,
    });
  });
});
