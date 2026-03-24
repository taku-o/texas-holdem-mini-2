import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test.describe('Playwright設定契約検証', () => {
  test('playwright.config.tsでforbidOnlyがCI環境変数に連動している', async ({}, testInfo) => {
    const config = testInfo.config;
    if (process.env.CI) {
      expect(config.forbidOnly).toBe(true);
    } else {
      expect(config.forbidOnly).toBe(false);
    }
  });

  test('.gitignoreにPlaywright生成物が登録されている', async () => {
    const gitignorePath = resolve(import.meta.dirname, '..', '.gitignore');
    const content = readFileSync(gitignorePath, 'utf-8');

    expect(content).toContain('test-results/');
    expect(content).toContain('playwright-report/');
  });

  test('project設定でviewportが明示的に固定されている', async ({}, testInfo) => {
    const projectConfig = testInfo.config.projects[0];
    const viewport = projectConfig?.use?.viewport;
    expect(viewport).toEqual({ width: 1280, height: 720 });
  });
});
