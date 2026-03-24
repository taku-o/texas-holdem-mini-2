import { test, expect } from '@playwright/test';
import { getViewport } from './helpers';

test.describe('初期画面（idle画面）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('タイトル「Texas Hold\'em」が表示される', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /Texas Hold'em/ });
    await expect(heading).toBeVisible();
  });

  test('「Start Game」ボタンが1つ存在する', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Start Game' });
    await expect(button).toBeVisible();
    await expect(button).toHaveCount(1);
  });

  test('「Start Game」ボタンのBoundingBoxが画面内に収まっている', async ({ page }, testInfo) => {
    const button = page.getByRole('button', { name: 'Start Game' });
    await expect(button).toBeVisible();

    const box = await button.boundingBox();
    if (!box) throw new Error('Start Game button bounding box is null');

    const viewport = getViewport(testInfo);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });

  test('初期画面のスクリーンショットベースライン', async ({ page }) => {
    await expect(page).toHaveScreenshot('idle-screen.png');
  });
});
