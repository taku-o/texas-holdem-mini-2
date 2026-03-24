import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  PLAYER_CONTAINER_SELECTOR,
  HUMAN_PLAYER_LABEL,
  TESTID_POKER_TABLE,
  TESTID_POT_DISPLAY,
  TESTID_COMMUNITY_CARDS,
  TESTID_CONTROLS,
  CARD_FACE_UP_SELECTOR,
} from './constants';

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
  await expect(page.getByTestId(TESTID_POKER_TABLE)).toBeVisible();
}

// CPU行動遅延1000ms × 最大4人 + フェーズ遷移 = 最大約10秒
const PHASE_WAIT_TIMEOUT = 15000;

export async function waitForControlsReady(page: Page): Promise<void> {
  await expect(page.getByTestId(TESTID_CONTROLS)).not.toHaveCSS('pointer-events', 'none', { timeout: PHASE_WAIT_TIMEOUT });
}

export function getCommunityFaceUpCards(page: Page) {
  return page.getByTestId(TESTID_COMMUNITY_CARDS).locator(CARD_FACE_UP_SELECTOR);
}

type PhaseResult = 'cards' | 'showdown';

/**
 * ヒューマンのアクションを繰り返し実行し、目標のコミュニティカード枚数到達かショーダウンまで進行する。
 * ベッティングラウンドが複数回（CPUのレイズ等）発生するケースに対応。
 */
export async function advanceToPhaseOrShowdown(
  page: Page,
  targetCardCount: number,
): Promise<PhaseResult> {
  const potDisplay = page.getByTestId(TESTID_POT_DISPLAY);
  const communityCards = getCommunityFaceUpCards(page);
  const controls = page.getByTestId(TESTID_CONTROLS);

  for (;;) {
    const cardsReached = expect(communityCards).toHaveCount(targetCardCount, { timeout: PHASE_WAIT_TIMEOUT })
      .then(() => 'cards' as const);
    const showdown = expect(potDisplay).toContainText('$0', { timeout: PHASE_WAIT_TIMEOUT })
      .then(() => 'showdown' as const);
    // pointer-events が none でないことで判定（opacity チェックより確実）
    const controlsReady = expect(controls).not.toHaveCSS('pointer-events', 'none', { timeout: PHASE_WAIT_TIMEOUT })
      .then(() => 'controls' as const);

    const result = await Promise.any([cardsReached, showdown, controlsReady]);

    if (result === 'cards') return 'cards';
    if (result === 'showdown') return 'showdown';

    const checkCallBtn = page.getByRole('button', { name: /Check|Call/ });
    await checkCallBtn.click();

    // アクション実行後、コントロールが無効化されるのを待つ（次のループで誤検知しないため）
    await expect(controls).toHaveCSS('pointer-events', 'none', { timeout: PHASE_WAIT_TIMEOUT });
  }
}
