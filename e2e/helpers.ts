import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { PLAYER_CONTAINER_SELECTOR, HUMAN_PLAYER_LABEL } from './constants';

export interface PlayerIds {
  humanId: string;
  cpuIds: string[];
}

export async function findPlayerIds(page: Page): Promise<PlayerIds> {
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

export async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByTestId('poker-table')).toBeVisible();
}

export async function waitForControlsReady(page: Page): Promise<void> {
  await expect(page.getByTestId('controls')).not.toHaveCSS('opacity', '0.5', { timeout: 15000 });
}
