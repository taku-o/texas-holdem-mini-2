import { test, expect } from '@playwright/test';
import {
  PLAYER_COUNT,
  PLAYER_CONTAINER_SELECTOR,
  TESTID_POKER_TABLE,
  TESTID_POT_DISPLAY,
  TESTID_COMMUNITY_CARDS,
  TESTID_ACTION_LOGS,
  TESTID_CONTROLS,
  ROLE_BADGE_SELECTOR,
  ROLE_BADGE_COUNT,
  COMMUNITY_CARD_SLOT_COUNT,
} from './constants';
import { startGame, waitForControlsReady } from './helpers';

test.describe('テスト用セレクター（data-testid）の検証', () => {

  test.beforeEach(async ({ page }) => {
    await startGame(page);
  });

  test.describe('2.1 App.tsx + Table.tsx のdata-testid', () => {

    test('ゲーム画面にaction-logsのdata-testidが存在する', async ({ page }) => {
      const actionLogs = page.getByTestId(TESTID_ACTION_LOGS);
      await expect(actionLogs).toBeAttached();
    });

    test('ゲーム画面にpoker-tableのdata-testidが存在する', async ({ page }) => {
      const pokerTable = page.getByTestId(TESTID_POKER_TABLE);
      await expect(pokerTable).toBeVisible();
    });

    test('ゲーム画面にpot-displayのdata-testidが存在する', async ({ page }) => {
      const potDisplay = page.getByTestId(TESTID_POT_DISPLAY);
      await expect(potDisplay).toBeVisible();
      await expect(potDisplay).toContainText('Current Pot');
    });

    test('ゲーム画面にcommunity-cardsのdata-testidが存在する', async ({ page }) => {
      const communityCards = page.getByTestId(TESTID_COMMUNITY_CARDS);
      await expect(communityCards).toBeVisible();
      const slots = communityCards.locator('> div');
      await expect(slots).toHaveCount(COMMUNITY_CARD_SLOT_COUNT);
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
      const roleBadges = page.locator(ROLE_BADGE_SELECTOR);
      await expect(roleBadges).toHaveCount(ROLE_BADGE_COUNT);

      const badgeTexts = await roleBadges.allTextContents();
      const validRoles = ['D', 'SB', 'BB'];
      for (const text of badgeTexts) {
        expect(validRoles).toContain(text);
      }
    });

    test('アクションを実行したプレイヤーにaction-badge-{id}のdata-testidが存在する', async ({ page }) => {
      // コントロールが有効になるまで待機してからFoldを実行
      await waitForControlsReady(page);
      await page.getByRole('button', { name: 'Fold' }).click();

      const humanActionBadge = page.getByTestId('action-badge-p1');
      await expect(humanActionBadge).toBeAttached();
      await expect(humanActionBadge).toHaveText(/fold/i);
    });
  });

  test.describe('2.3 Controls.tsx のdata-testid', () => {

    test('ゲーム画面にcontrolsのdata-testidが存在する', async ({ page }) => {
      const controls = page.getByTestId(TESTID_CONTROLS);
      await expect(controls).toBeAttached();
    });

    test('controlsコンテナ内にFold, Check/Call, Raiseボタンが含まれる', async ({ page }) => {
      const controls = page.getByTestId(TESTID_CONTROLS);
      await expect(controls.getByRole('button', { name: 'Fold' })).toBeAttached();
      await expect(controls.getByRole('button', { name: /Check|Call/ })).toBeAttached();
      await expect(controls.getByRole('button', { name: /Raise/ })).toBeAttached();
    });
  });

  test.describe('data-testidの一意性検証', () => {

    test('poker-table, pot-display, community-cards, action-logs, controlsが各1つずつ存在する', async ({ page }) => {
      await expect(page.getByTestId(TESTID_POKER_TABLE)).toHaveCount(1);
      await expect(page.getByTestId(TESTID_POT_DISPLAY)).toHaveCount(1);
      await expect(page.getByTestId(TESTID_COMMUNITY_CARDS)).toHaveCount(1);
      await expect(page.getByTestId(TESTID_ACTION_LOGS)).toHaveCount(1);
      await expect(page.getByTestId(TESTID_CONTROLS)).toHaveCount(1);
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
