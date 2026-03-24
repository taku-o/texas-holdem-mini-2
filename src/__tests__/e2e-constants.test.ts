import { describe, test, expect } from 'vitest'
import {
  PLAYER_COUNT,
  PLAYER_CONTAINER_SELECTOR,
  FLOP_CARD_COUNT,
  TURN_CARD_COUNT,
  RIVER_CARD_COUNT,
  ROLE_BADGE_SELECTOR,
  ROLE_BADGE_COUNT,
  COMMUNITY_CARD_SLOT_COUNT,
  HUMAN_HAND_CARD_COUNT,
  DISABLED_OPACITY,
  UNREACHABLE_CARD_COUNT,
} from '../../e2e/constants'

describe('E2E定数: 新規追加定数', () => {
  test('ROLE_BADGE_SELECTORがdata-testid前方一致セレクターである', () => {
    expect(ROLE_BADGE_SELECTOR).toBe('[data-testid^="role-badge-"]')
  })

  test('ROLE_BADGE_COUNTがD/SB/BBの3である', () => {
    expect(ROLE_BADGE_COUNT).toBe(3)
  })

  test('COMMUNITY_CARD_SLOT_COUNTがテキサスホールデムのコミュニティカードスロット数5である', () => {
    expect(COMMUNITY_CARD_SLOT_COUNT).toBe(5)
  })

  test('HUMAN_HAND_CARD_COUNTがテキサスホールデムの手札枚数2である', () => {
    expect(HUMAN_HAND_CARD_COUNT).toBe(2)
  })

  test('DISABLED_OPACITYが非ターン時の透明度文字列である', () => {
    expect(DISABLED_OPACITY).toBe('0.5')
    expect(typeof DISABLED_OPACITY).toBe('string')
  })

  test('UNREACHABLE_CARD_COUNTがRIVER_CARD_COUNT + 1である', () => {
    expect(UNREACHABLE_CARD_COUNT).toBe(RIVER_CARD_COUNT + 1)
    expect(UNREACHABLE_CARD_COUNT).toBe(6)
  })
})

describe('E2E定数: 既存定数との整合性', () => {
  test('カード枚数定数が昇順である（FLOP < TURN < RIVER < UNREACHABLE）', () => {
    expect(FLOP_CARD_COUNT).toBeLessThan(TURN_CARD_COUNT)
    expect(TURN_CARD_COUNT).toBeLessThan(RIVER_CARD_COUNT)
    expect(RIVER_CARD_COUNT).toBeLessThan(UNREACHABLE_CARD_COUNT)
  })

  test('ROLE_BADGE_COUNTがPLAYER_COUNT以下である', () => {
    expect(ROLE_BADGE_COUNT).toBeLessThanOrEqual(PLAYER_COUNT)
  })

  test('ROLE_BADGE_SELECTORがPLAYER_CONTAINER_SELECTORと異なるプレフィックスを使う', () => {
    expect(ROLE_BADGE_SELECTOR).toContain('role-badge-')
    expect(PLAYER_CONTAINER_SELECTOR).toContain('player-')
    expect(ROLE_BADGE_SELECTOR).not.toBe(PLAYER_CONTAINER_SELECTOR)
  })
})
