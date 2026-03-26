# ギャップ分析: ハンド評価テスト

## 要件と既存資産のマッピング

| 要件 | 既存資産 | ギャップ |
|------|---------|---------|
| 要件1: 各役のrank値検証 | `evaluateHand` 関数、`HandRank` 定数（`evaluator.ts`） | **Missing**: テストファイルが存在しない |
| 要件2: rankName文字列検証 | `evaluateHand` が `rankName` を返す | **Missing**: テストファイルが存在しない |
| 要件3: スコア大小関係 | `calculateScore` 内部関数 | **Missing**: テストファイルが存在しない |
| 要件4: 同役キッカー比較 | `calculateScore` のキッカー計算 | **Missing**: テストファイルが存在しない |
| 要件5: ホイールストレート | `findStraight` のAceロー対応 | **Missing**: テストファイルが存在しない |
| 要件6: 7枚入力のbestCards | `evaluateHand` の5枚選択ロジック | **Missing**: テストファイルが存在しない |
| 要件7: 0枚入力エッジケース | `evaluateHand` の空配列ガード（L32） | **Missing**: テストファイルが存在しない |

---

## 現状の調査結果

### テスト基盤（構築済み）

- **Vitest**: `vitest ^4.1.1` インストール済み
- **設定**: `vitest.config.ts` で `globals: true` 有効、`setupFiles` 設定済み
- **スクリプト**: `npm run test`（`vitest run`）、`npm run test:watch`
- **既存テスト**: `src/utils/__tests__/deck.test.ts` が既に存在 — テスト配置パターンの先例
- **Playwright**: `npm run test:e2e` も構築済み

### テスト対象（`evaluator.ts`）

- **公開API**: `evaluateHand(holeCards, communityCards)` → `HandResult`
- **エクスポート**: `HandRank` 定数、`HandResult` 型、`evaluateHand` 関数
- **内部ロジック**: `rankValues`、`calculateScore`、`findStraight` — 直接テスト不要（`evaluateHand`経由で間接的に検証可能）
- **テスト用カード生成**: `PlayingCard` 型（`{suit, rank}`）のリテラルで十分

### 既存テストの規約（`deck.test.ts` から）

- `describe` / `test` でグルーピング
- テスト名は日本語
- インポートは相対パス `'../deck'`
- `expect().toHaveLength()`、`expect().toBe()` などのVitest標準アサーション
- `globals: true` のため `import { describe, test, expect }` は不要

---

## 実装アプローチの評価

### オプションA: 新規テストファイル作成（推奨）

`src/utils/__tests__/evaluator.test.ts` を新規作成する。

**根拠**:
- テスト対象にテストファイルが一切存在しない
- `deck.test.ts` が同じ `__tests__/` ディレクトリに既に存在し、パターンが確立済み
- 既存コードへの変更は不要（`evaluateHand`、`HandRank` は既にエクスポート済み）

**トレードオフ**:
- ✅ 既存パターンに完全準拠
- ✅ 既存コードへの変更なし
- ✅ テスト基盤がすべて構築済みのため追加セットアップ不要
- ❌ 特になし（最も自然なアプローチ）

### オプションB / C: 該当なし

既存コードの拡張やハイブリッドアプローチは不要。テストファイルの新規作成が唯一の合理的なアプローチ。

---

## 工数とリスク

| 項目 | 評価 | 根拠 |
|------|------|------|
| **工数** | **S**（1-3日） | テスト基盤構築済み、テスト対象の公開APIが明確、既存テストパターンあり |
| **リスク** | **Low** | 既存パターンの踏襲、既存コードへの変更なし、テストフレームワーク構築済み |

---

## 設計フェーズへの推奨事項

### 推奨アプローチ
- オプションA（新規テストファイル作成）を採用
- `deck.test.ts` のスタイルに準拠

### 設計時の注意点
- テストカードのヘルパー関数（`card('hearts', 'A')` のような短縮記法）の導入を検討 — テストの可読性向上
- 各役のテストケースに使用するカードの具体的な組み合わせを設計書で定義すること
- 調査報告書で指摘されている BUG-E1（ストレート検出のSet順序依存）に関連するテストケースの検討

### Research Needed
- なし（既存パターンとツールで対応可能）
