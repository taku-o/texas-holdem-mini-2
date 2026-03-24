import { test, expect } from '@playwright/test';

const PLAYER_COUNT = 5;
const PLAYER_CONTAINER_SELECTOR = '[data-testid^="player-"]:not([data-testid^="player-cards-"])';

test.describe('テスト用セレクター（data-testid）の検証', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
  });

  test.describe('2.1 App.tsx + Table.tsx のdata-testid', () => {

    test('ゲーム画面にaction-logsのdata-testidが存在する', async ({ page }) => {
      const actionLogs = page.getByTestId('action-logs');
      await expect(actionLogs).toBeAttached();
    });

    test('ゲーム画面にpoker-tableのdata-testidが存在する', async ({ page }) => {
      const pokerTable = page.getByTestId('poker-table');
      await expect(pokerTable).toBeVisible();
    });

    test('ゲーム画面にpot-displayのdata-testidが存在する', async ({ page }) => {
      const potDisplay = page.getByTestId('pot-display');
      await expect(potDisplay).toBeVisible();
      await expect(potDisplay).toContainText('Current Pot');
    });

    test('ゲーム画面にcommunity-cardsのdata-testidが存在する', async ({ page }) => {
      const communityCards = page.getByTestId('community-cards');
      await expect(communityCards).toBeVisible();
      const slots = communityCards.locator('> div');
      await expect(slots).toHaveCount(5);
    });
  });

  test.describe('2.2 Player.tsx のdata-testid', () => {

    test('各プレイヤーにplayer-{id}のdata-testidが存在する', async ({ page }) => {
      const humanPlayer = page.getByTestId('player-p1');
      await expect(humanPlayer).toBeAttached();

      const allPlayers = page.locator(PLAYER_CONTAINER_SELECTOR);
      await expect(allPlayers).toHaveCount(PLAYER_COUNT);
    });

    test('各プレイヤーにplayer-cards-{id}のdata-testidが存在する', async ({ page }) => {
      const humanCards = page.getByTestId('player-cards-p1');
      await expect(humanCards).toBeAttached();

      const allPlayerCards = page.locator('[data-testid^="player-cards-"]');
      await expect(allPlayerCards).toHaveCount(PLAYER_COUNT);
    });

    test('ロールが割り当てられたプレイヤーにrole-badge-{id}のdata-testidが存在する', async ({ page }) => {
      const roleBadges = page.locator('[data-testid^="role-badge-"]');
      await expect(roleBadges).toHaveCount(3);

      const badgeTexts = await roleBadges.allTextContents();
      const validRoles = ['D', 'SB', 'BB'];
      for (const text of badgeTexts) {
        expect(validRoles).toContain(text);
      }
    });

    test('アクションを実行したプレイヤーにaction-badge-{id}のdata-testidが存在する', async ({ page }) => {
      // コントロールが有効になるまで待機してからFoldを実行
      const controls = page.getByTestId('controls');
      await expect(controls).not.toHaveCSS('opacity', '0.5', { timeout: 15000 });
      await page.getByRole('button', { name: 'Fold' }).click();

      const humanActionBadge = page.getByTestId('action-badge-p1');
      await expect(humanActionBadge).toBeAttached();
      await expect(humanActionBadge).toHaveText(/fold/i);
    });
  });

  test.describe('2.3 Controls.tsx のdata-testid', () => {

    test('ゲーム画面にcontrolsのdata-testidが存在する', async ({ page }) => {
      const controls = page.getByTestId('controls');
      await expect(controls).toBeAttached();
    });

    test('controlsコンテナ内にFold, Check/Call, Raiseボタンが含まれる', async ({ page }) => {
      const controls = page.getByTestId('controls');
      await expect(controls.getByRole('button', { name: 'Fold' })).toBeAttached();
      await expect(controls.getByRole('button', { name: /Check|Call/ })).toBeAttached();
      await expect(controls.getByRole('button', { name: /Raise/ })).toBeAttached();
    });
  });

  test.describe('data-testidの一意性検証', () => {

    test('poker-table, pot-display, community-cards, action-logs, controlsが各1つずつ存在する', async ({ page }) => {
      await expect(page.getByTestId('poker-table')).toHaveCount(1);
      await expect(page.getByTestId('pot-display')).toHaveCount(1);
      await expect(page.getByTestId('community-cards')).toHaveCount(1);
      await expect(page.getByTestId('action-logs')).toHaveCount(1);
      await expect(page.getByTestId('controls')).toHaveCount(1);
    });

    test('各プレイヤーのdata-testidが一意である', async ({ page }) => {
      const playerElements = page.locator(PLAYER_CONTAINER_SELECTOR);
      await expect(playerElements).toHaveCount(PLAYER_COUNT);
      const testIds = await playerElements.evaluateAll(
        elements => elements.map(el => el.getAttribute('data-testid'))
      );

      const uniqueIds = new Set(testIds);
      expect(uniqueIds.size).toBe(testIds.length);
    });
  });
});
