import { test, expect } from '@playwright/test';
import { TESTID_CONTROLS, DISABLED_OPACITY } from './constants';
import { findPlayerIds, startGame, waitForControlsReady } from './helpers';

test.describe('プレイヤー操作', () => {
  let humanId: string;

  test.beforeEach(async ({ page }) => {
    await startGame(page);
    const playerIds = await findPlayerIds(page);
    humanId = playerIds.humanId;
    await waitForControlsReady(page);
  });

  test('ターン中のコントロールがpointer-events=noneでない (5.1)', async ({ page }) => {
    const controls = page.getByTestId(TESTID_CONTROLS);
    await expect(controls).not.toHaveCSS('pointer-events', 'none');
  });

  test('非ターン時にopacity=0.5またはpointer-events=noneである (5.2)', async ({ page }) => {
    await page.getByRole('button', { name: 'Fold' }).click();

    const controls = page.getByTestId(TESTID_CONTROLS);
    await expect(async () => {
      const { opacity, pointerEvents } = await controls.evaluate(el => {
        const style = getComputedStyle(el);
        return { opacity: style.opacity, pointerEvents: style.pointerEvents };
      });
      expect(
        opacity === DISABLED_OPACITY || pointerEvents === 'none',
        `Expected opacity=${DISABLED_OPACITY} or pointer-events=none, got opacity=${opacity}, pointer-events=${pointerEvents}`,
      ).toBe(true);
    }).toPass();
  });

  test('Fold後にアクションバッジが"FOLD"と表示される (5.3)', async ({ page }) => {
    await page.getByRole('button', { name: 'Fold' }).click();

    const badge = page.getByTestId(`action-badge-${humanId}`);
    await expect(badge).toHaveText(/fold/i);
  });

  test('Check/Callボタンのテキストが状況に応じて正しい (5.4)', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Check|Call/ });
    await expect(btn).toHaveText(/^(Check|Call \$\d+)$/);
  });

  test('Raiseボタンの金額テキストに数値が含まれる (5.5)', async ({ page }) => {
    const raiseBtn = page.getByRole('button', { name: /Raise/ });
    await expect(raiseBtn).toHaveText(/\d+/);
  });
});
