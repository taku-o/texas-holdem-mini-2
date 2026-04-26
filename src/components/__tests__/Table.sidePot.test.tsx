// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { Table } from '../Table'
import type { Pot } from '../../types'

const defaultProps = {
  communityCards: [],
  pot: 0,
  pots: [] as Pot[],
  phase: 'pre-flop',
}

describe('Table コンポーネントのサイドポット表示', () => {
  describe('pots が空配列の場合（ショーダウン後）', () => {
    test('pot-item 要素が描画されない', () => {
      // Given: pots が空、pot が 0
      const props = { ...defaultProps, pot: 0, pots: [] }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-item が存在しない
      expect(screen.queryAllByTestId('pot-item')).toHaveLength(0)
    })

    test('pot-display コンテナは存在し $0 を表示する', () => {
      // Given: pots が空、pot が 0
      const props = { ...defaultProps, pot: 0, pots: [] }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-display が存在し $0 テキストを含む
      const potDisplay = screen.getByTestId('pot-display')
      expect(potDisplay).toBeTruthy()
      expect(potDisplay.textContent).toContain('$0')
    })
  })

  describe('pots が 1 つの場合（オールインなし）', () => {
    test('pot-item 要素が描画されない', () => {
      // Given: pots が 1 つ
      const pots: Pot[] = [{ amount: 200, eligiblePlayerIds: ['p0', 'p1', 'p2'] }]
      const props = { ...defaultProps, pot: 200, pots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-item が存在しない（単一ポット時は個別表示不要）
      expect(screen.queryAllByTestId('pot-item')).toHaveLength(0)
    })

    test('pot-display は合計金額を表示する', () => {
      // Given: pots が 1 つ、pot が 200
      const pots: Pot[] = [{ amount: 200, eligiblePlayerIds: ['p0', 'p1', 'p2'] }]
      const props = { ...defaultProps, pot: 200, pots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-display に合計金額が表示される
      const potDisplay = screen.getByTestId('pot-display')
      expect(potDisplay.textContent).toContain('$200')
    })
  })

  describe('pots が 2 つの場合（サイドポットあり）', () => {
    const twoPots: Pot[] = [
      { amount: 200, eligiblePlayerIds: ['p0', 'p1', 'p2'] },
      { amount: 150, eligiblePlayerIds: ['p1', 'p2'] },
    ]

    test('pot-item 要素が 2 つ描画される', () => {
      // Given: pots が 2 つ
      const props = { ...defaultProps, pot: 350, pots: twoPots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-item が 2 つ存在する
      expect(screen.getAllByTestId('pot-item')).toHaveLength(2)
    })

    test('先頭ポットに Main ラベルと金額が表示される', () => {
      // Given: pots が 2 つ
      const props = { ...defaultProps, pot: 350, pots: twoPots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: 先頭の pot-item に "Main" と "$200" が含まれる
      const items = screen.getAllByTestId('pot-item')
      expect(items[0].textContent).toContain('Main')
      expect(items[0].textContent).toContain('$200')
    })

    test('2 番目ポットに Side ラベルと金額が表示される', () => {
      // Given: pots が 2 つ
      const props = { ...defaultProps, pot: 350, pots: twoPots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: 2 番目の pot-item に "Side" と "$150" が含まれる
      const items = screen.getAllByTestId('pot-item')
      expect(items[1].textContent).toContain('Side')
      expect(items[1].textContent).toContain('$150')
    })

    test('pot-display コンテナに合計金額が表示される', () => {
      // Given: pots が 2 つ、合計 pot が 350
      const props = { ...defaultProps, pot: 350, pots: twoPots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-display に合計金額 $350 が表示される
      const potDisplay = screen.getByTestId('pot-display')
      expect(potDisplay.textContent).toContain('$350')
    })
  })

  describe('pots が 3 つ以上の場合', () => {
    const threePots: Pot[] = [
      { amount: 150, eligiblePlayerIds: ['p0', 'p1', 'p2', 'p3'] },
      { amount: 100, eligiblePlayerIds: ['p1', 'p2', 'p3'] },
      { amount: 50, eligiblePlayerIds: ['p2', 'p3'] },
    ]

    test('pot-item 要素が 3 つ描画される', () => {
      // Given: pots が 3 つ
      const props = { ...defaultProps, pot: 300, pots: threePots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-item が 3 つ存在する
      expect(screen.getAllByTestId('pot-item')).toHaveLength(3)
    })

    test('Side ポットに番号が付与される', () => {
      // Given: pots が 3 つ（Side が 2 つ以上）
      const props = { ...defaultProps, pot: 300, pots: threePots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: Side ポットに番号が含まれる（Side 1, Side 2）
      const items = screen.getAllByTestId('pot-item')
      expect(items[0].textContent).toContain('Main')
      expect(items[1].textContent).toContain('Side')
      expect(items[1].textContent).toContain('1')
      expect(items[2].textContent).toContain('Side')
      expect(items[2].textContent).toContain('2')
    })
  })

  describe('pot-display コンテナの E2E 契約', () => {
    test('pot-display は常に 1 つだけ存在する', () => {
      // Given: サイドポットあり
      const pots: Pot[] = [
        { amount: 200, eligiblePlayerIds: ['p0', 'p1'] },
        { amount: 100, eligiblePlayerIds: ['p1'] },
      ]
      const props = { ...defaultProps, pot: 300, pots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-display が 1 つだけ存在する
      expect(screen.getAllByTestId('pot-display')).toHaveLength(1)
    })

    test('pot-item は pot-display の内部に描画される', () => {
      // Given: サイドポットあり
      const pots: Pot[] = [
        { amount: 200, eligiblePlayerIds: ['p0', 'p1'] },
        { amount: 100, eligiblePlayerIds: ['p1'] },
      ]
      const props = { ...defaultProps, pot: 300, pots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: pot-item が pot-display の子要素である
      const potDisplay = screen.getByTestId('pot-display')
      const potItems = potDisplay.querySelectorAll('[data-testid="pot-item"]')
      expect(potItems).toHaveLength(2)
    })
  })

  describe('各 pot-item に $<数値> テキストが含まれる', () => {
    test('全ての pot-item が $<数値> 形式のテキストを持つ', () => {
      // Given: pots が 2 つ
      const pots: Pot[] = [
        { amount: 1500, eligiblePlayerIds: ['p0', 'p1'] },
        { amount: 800, eligiblePlayerIds: ['p1'] },
      ]
      const props = { ...defaultProps, pot: 2300, pots }

      // When: Table をレンダリング
      render(<Table {...props} />)

      // Then: 各 pot-item に $<数値> パターンが含まれる
      const items = screen.getAllByTestId('pot-item')
      for (const item of items) {
        expect(item.textContent).toMatch(/\$[\d,]+/)
      }
    })
  })
})
