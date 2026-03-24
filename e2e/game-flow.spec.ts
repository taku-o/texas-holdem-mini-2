import { test, expect } from '@playwright/test';
import { TESTID_POT_DISPLAY, TESTID_ACTION_LOGS, FLOP_CARD_COUNT, TURN_CARD_COUNT, RIVER_CARD_COUNT, UNREACHABLE_CARD_COUNT, GAME_FLOW_TEST_TIMEOUT } from './constants';
import { startGame, advanceToPhaseOrShowdown, getCommunityFaceUpCards } from './helpers';

test.describe('ゲームフロー統合', () => {
  test.beforeEach(async ({ page }) => {
    await startGame(page);
  });

  test('pre-flopでコミュニティカードが0枚である (6.1)', async ({ page }) => {
    const faceUpCards = getCommunityFaceUpCards(page);
    await expect(faceUpCards).toHaveCount(0);
  });

  test('ゲーム開始後にアクションログが1件以上存在する (6.5)', async ({ page }) => {
    const actionLogs = page.getByTestId(TESTID_ACTION_LOGS);
    await expect(actionLogs).toBeVisible();
    // ゲーム開始時点でブラインド投入等のログが記録されている
    await expect(actionLogs.locator('> div').first()).toBeVisible({ timeout: 10000 });
  });

  test('全フェーズを通過しショーダウン後ポットが$0になる (6.2, 6.3, 6.4, 6.6)', async ({ page }) => {
    test.setTimeout(GAME_FLOW_TEST_TIMEOUT);

    const potDisplay = page.getByTestId(TESTID_POT_DISPLAY);
    // flop→turn→river→showdown の順に進行。途中でshowdownに到達することもある。
    const phaseTargets = [FLOP_CARD_COUNT, TURN_CARD_COUNT, RIVER_CARD_COUNT] as const;
    let reachedShowdown = false;

    for (const target of phaseTargets) {
      const result = await advanceToPhaseOrShowdown(page, target);
      if (result === 'showdown') {
        reachedShowdown = true;
        break;
      }
    }

    if (!reachedShowdown) {
      // river到達後の最終ベッティングラウンド。到達不可能なカード枚数を指定しshowdownまで進行。
      await advanceToPhaseOrShowdown(page, UNREACHABLE_CARD_COUNT);
    }

    await expect(potDisplay).toContainText('$0');
  });
});
