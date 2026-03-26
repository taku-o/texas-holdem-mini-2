# 要件定義書: ハンド評価テスト

## はじめに

テキサスホールデム・ポーカーのハンド評価ロジック（`src/utils/evaluator.ts`）の正しさを、全役パターンで網羅的に数値検証する単体テストを作成する。作業計画書のフェーズ2（タスク2-1）に対応する。

テスト対象は `evaluateHand` 関数および関連するエクスポート（`HandRank`、`HandResult` 型）である。テストファイルは `src/utils/__tests__/evaluator.test.ts` に配置する。

### 関連資料

- GitHub Issue: #3（フェーズ2: ハンド評価テスト）
- 作業計画書: `.kiro/specs/validate-game/work-plan.md`（フェーズ2）
- テスト計画書: `.kiro/specs/validate-game/test-plan.md`（1.2 ハンド評価）
- 調査報告書: `.kiro/specs/validate-game/investigation-report.md`（セクション2: ハンド評価）

---

## 要件

### 要件 1: 各役のrank値の正確性

**Objective:** As a テスト作成者, I want 各役の `.rank` 値が仕様通りの数値であることを検証したい, so that 役判定ロジックの基本的な正しさを保証できる

#### 受け入れ基準

1. When ロイヤルフラッシュのカード（同スートのA-K-Q-J-10）が入力された場合, the evaluateHand shall `.rank` = 10 を返す
2. When ストレートフラッシュのカード（同スートの5連続、ロイヤル以外）が入力された場合, the evaluateHand shall `.rank` = 9 を返す
3. When フォーカードのカード（同ランク4枚）が入力された場合, the evaluateHand shall `.rank` = 8 を返す
4. When フルハウスのカード（同ランク3枚 + 同ランク2枚）が入力された場合, the evaluateHand shall `.rank` = 7 を返す
5. When フラッシュのカード（同スート5枚以上）が入力された場合, the evaluateHand shall `.rank` = 6 を返す
6. When ストレートのカード（5連続の異なるスート）が入力された場合, the evaluateHand shall `.rank` = 5 を返す
7. When スリーカードのカード（同ランク3枚）が入力された場合, the evaluateHand shall `.rank` = 4 を返す
8. When ツーペアのカード（2枚ペア × 2）が入力された場合, the evaluateHand shall `.rank` = 3 を返す
9. When ワンペアのカード（2枚ペア × 1）が入力された場合, the evaluateHand shall `.rank` = 2 を返す
10. When ハイカードのカード（役なし）が入力された場合, the evaluateHand shall `.rank` = 1 を返す

---

### 要件 2: 各役のrankName文字列の正確性

**Objective:** As a テスト作成者, I want 各役の `.rankName` が期待する文字列と一致することを検証したい, so that 表示用の役名が正しく返されることを保証できる

#### 受け入れ基準

1. When ロイヤルフラッシュが判定された場合, the evaluateHand shall `.rankName` = `'Royal Flush'` を返す
2. When ストレートフラッシュが判定された場合, the evaluateHand shall `.rankName` = `'Straight Flush'` を返す
3. When フォーカードが判定された場合, the evaluateHand shall `.rankName` = `'Four of a Kind'` を返す
4. When フルハウスが判定された場合, the evaluateHand shall `.rankName` = `'Full House'` を返す
5. When フラッシュが判定された場合, the evaluateHand shall `.rankName` = `'Flush'` を返す
6. When ストレートが判定された場合, the evaluateHand shall `.rankName` = `'Straight'` を返す
7. When スリーカードが判定された場合, the evaluateHand shall `.rankName` = `'Three of a Kind'` を返す
8. When ツーペアが判定された場合, the evaluateHand shall `.rankName` = `'Two Pair'` を返す
9. When ワンペアが判定された場合, the evaluateHand shall `.rankName` = `'One Pair'` を返す
10. When ハイカードが判定された場合, the evaluateHand shall `.rankName` = `'High Card'` を返す

---

### 要件 3: スコアの大小関係

**Objective:** As a テスト作成者, I want 役のスコアが強さの順に大小関係を持つことを検証したい, so that 勝敗判定の正しさを保証できる

#### 受け入れ基準

1. The evaluateHand shall ロイヤルフラッシュのスコア > ストレートフラッシュのスコア > フォーカードのスコア > フルハウスのスコア > フラッシュのスコア > ストレートのスコア > スリーカードのスコア > ツーペアのスコア > ワンペアのスコア > ハイカードのスコア の大小関係を満たすスコアを返す

---

### 要件 4: 同役キッカーによるスコア比較

**Objective:** As a テスト作成者, I want 同じ役同士でキッカーの違いによりスコアの大小が正しく判定されることを検証したい, so that 同役対決時の勝敗判定の正しさを保証できる

#### 受け入れ基準

1. When ワンペアA + キッカーKのカードとワンペアA + キッカーQのカードがそれぞれ評価された場合, the evaluateHand shall キッカーKの方が高いスコアを返す

---

### 要件 5: ホイールストレート（A-2-3-4-5）の評価

**Objective:** As a テスト作成者, I want Aceがローとして機能するホイールストレート（A-2-3-4-5）が正しく評価されることを検証したい, so that Aceの二重用途（ハイ/ロー）の正しさを保証できる

#### 受け入れ基準

1. When ホイールストレート（A-2-3-4-5）のカードが入力された場合, the evaluateHand shall `.rank` = 5（ストレート）を返す
2. When ホイールストレートと通常ストレート（例: 2-3-4-5-6）がそれぞれ評価された場合, the evaluateHand shall ホイールストレートのスコア < 通常ストレートのスコアを返す

---

### 要件 6: 7枚入力時のbestCards選択

**Objective:** As a テスト作成者, I want 7枚（ホールカード2枚 + コミュニティカード5枚）が入力された場合に最良の5枚が選択されることを検証したい, so that 実際のゲームプレイでの正しい動作を保証できる

#### 受け入れ基準

1. When 7枚のカードが入力された場合, the evaluateHand shall `.bestCards.length` = 5 を返す

---

### 要件 7: 0枚入力時のエッジケース処理

**Objective:** As a テスト作成者, I want 0枚のカードが入力された場合にエラーにならず適切なデフォルト値が返されることを検証したい, so that 異常入力時の安全性を保証できる

#### 受け入れ基準

1. When 0枚のカード（空配列）が入力された場合, the evaluateHand shall `.rank` = 1 を返す
2. When 0枚のカード（空配列）が入力された場合, the evaluateHand shall `.score` = 0 を返す
3. When 0枚のカード（空配列）が入力された場合, the evaluateHand shall `.rankName` = `'None'` を返す（通常のハイカードの `'High Card'` とは異なる）

---

## 推奨アプローチ

**オプションA: 新規テストファイル作成** — 工数 S（1-3日）、リスク Low

既存の `deck.test.ts` のスタイルに準拠して `evaluator.test.ts` を新規作成するのが最も自然で唯一合理的なアプローチです。

---

## チェックポイント

- `npm run test` パス
- `npm run test:e2e` パス（スクリーンショット差分 0 — UI変更なし）
