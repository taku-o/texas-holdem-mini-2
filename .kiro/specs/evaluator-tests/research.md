# リサーチ & 設計判断ログ

## サマリー
- **フィーチャー**: `evaluator-tests`
- **ディスカバリースコープ**: Simple Addition（テストファイルの新規追加のみ）
- **主要な発見**:
  - テスト基盤（Vitest、設定、スクリプト）はすべて構築済み
  - `deck.test.ts` が既存テストのパターン（日本語テスト名、`describe`/`test`構造、相対パスインポート）を確立済み
  - `evaluateHand` はパブリックAPIとして既にエクスポートされており、既存コードの変更は不要

## リサーチログ

### テスト基盤の確認
- **コンテキスト**: 新規テストファイルを追加するにあたり、既存のテスト基盤を確認
- **ソース**: `vitest.config.ts`、`package.json`、`src/test/setup.ts`、`src/utils/__tests__/deck.test.ts`
- **発見**:
  - Vitest `^4.1.1` インストール済み
  - `vitest.config.ts` で `globals: true`（`describe`/`test`/`expect` のインポート不要）
  - テストファイルは `src/utils/__tests__/` ディレクトリに配置
  - `npm run test` = `vitest run`
- **影響**: テストインフラの追加構築は不要

### テスト対象APIの確認
- **コンテキスト**: `evaluator.ts` のエクスポートと内部構造を確認
- **ソース**: `src/utils/evaluator.ts`
- **発見**:
  - エクスポート: `HandRank`（定数オブジェクト）、`HandResult`（型）、`evaluateHand`（関数）
  - `evaluateHand(holeCards: PlayingCard[], communityCards: PlayingCard[]): HandResult`
  - `HandResult` は `{ rank, rankName, score, bestCards }` を持つ
  - 内部関数 `calculateScore`、`findStraight` は非公開だが `evaluateHand` 経由で間接テスト可能
- **影響**: テストは `evaluateHand` のみを呼び出し、戻り値の各プロパティを検証する設計で十分

### 既存テストスタイルの確認
- **コンテキスト**: 既存テストの規約に準拠するためスタイルを確認
- **ソース**: `src/utils/__tests__/deck.test.ts`
- **発見**:
  - テスト名は日本語（例: `'52枚のカードが生成される'`）
  - `describe` で機能グループ、`test` で個別ケース
  - インポートは相対パス `'../deck'`
  - Vitest標準アサーション（`toBe`、`toHaveLength`、`toEqual`）
- **影響**: 同じスタイルに準拠する

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク/制約 | 備考 |
|-----------|------|------|-----------|------|
| 単一テストファイル | `evaluator.test.ts` を1ファイルで作成 | シンプル、`deck.test.ts` と統一感 | テストケースが多いがファイルサイズは許容範囲 | 推奨 |

## 設計判断

### 判断: テストカード生成方法
- **コンテキスト**: テストケースごとに `PlayingCard` オブジェクトを生成する必要がある
- **検討した代替案**:
  1. リテラルオブジェクトで直接定義 — `{ suit: 'hearts', rank: 'A' }`
  2. ヘルパー関数を定義 — `card('hearts', 'A')` のような短縮記法
- **選択**: ヘルパー関数 `card(suit, rank)` をテストファイル内に定義
- **理由**: テストケースが多く、リテラルでは冗長になる。ファイル内ローカル定義でシンプルに保つ
- **トレードオフ**: ヘルパー関数の定義が追加されるが、テストの可読性が大幅に向上
- **フォローアップ**: ヘルパーの型安全性を確認（`Suit`、`Rank` 型を活用）

## リスクと軽減策
- 既存コードへの変更なし、リスクなし
