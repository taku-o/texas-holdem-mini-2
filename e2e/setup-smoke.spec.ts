import { test, expect } from '@playwright/test';

test.describe('Playwright環境セットアップ検証', () => {
  test('devサーバーに接続してアプリケーションが読み込まれる', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toBeAttached();
  });

  test('Reactアプリケーションのルート要素がマウントされている', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeAttached();
    await expect(root).not.toBeEmpty();
  });
});
