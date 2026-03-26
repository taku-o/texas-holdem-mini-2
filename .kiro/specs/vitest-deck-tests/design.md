# 設計書: Vitest環境構築 + デッキテスト

## 概要

**目的**: ゲームロジックの正しさをテストで保証する基盤を構築し、最もシンプルな純粋関数（デッキ）のテストを実装する。

**ユーザー**: 開発者がゲームロジックの品質を自動テストで検証するために使用する。

**影響**: 既存の `vitest.config.ts` に設定を追加し、新規テストファイルとセットアップファイルを作成する。UIへの変更はない。

### ゴール

- Vitestによる単体テスト環境を構築する
- `src/utils/deck.ts` のデッキ生成・シャッフル関数をテストする
- 既存のE2Eテストに影響を与えない

### 非ゴール

- ハンド評価（`evaluator.ts`）のテスト（フェーズ2で対応）
- ゲームロジック（`useGameEngine.ts`）のテスト（フェーズ3で対応）
- テストカバレッジの測定・レポート

---

## アーキテクチャ

### 既存アーキテクチャ分析

- **テスト設定分離パターン**: `vite.config.ts`（ビルド用）と `vitest.config.ts`（テスト用）が分離されている。`vitest.config.ts` は `mergeConfig` で `vite.config` をマージする構成
- **テスト除外パターン**: `tsconfig.app.json` で `src/**/*.test.ts` と `src/**/__tests__/**` をビルド対象から除外済み
- **既存テスト**: `src/__tests__/` にE2E関連のユーティリティテストが5ファイル存在

### アーキテクチャパターンとバウンダリマップ

**アーキテクチャ統合**:
- 選択パターン: 既存の設定分離パターンを拡張
- ドメインバウンダリ: テストファイルはテスト対象モジュールの近傍（`src/utils/__tests__/`）に配置
- 維持する既存パターン: `vitest.config.ts` と `vite.config.ts` の分離、`tsconfig.app.json` のテスト除外
- ステアリング準拠: TypeScript strictモード、相対パスインポート

### テクノロジースタック

| レイヤー | 選択 / バージョン | 機能における役割 | 備考 |
|---------|------------------|-----------------|------|
| テストランナー | Vitest 4.1.1 | テスト実行・アサーション | インストール済み |

---

## 要件トレーサビリティ

| 要件 | サマリー | コンポーネント | インターフェース | フロー |
|------|---------|--------------|----------------|--------|
| 1.1 | vitest インストール確認 | VitestConfig | — | — |
| 1.2 | vitest.config.ts 設定追加 | VitestConfig | VitestTestConfig | — |
| 1.3 | 設定分離構成の維持 | VitestConfig | — | — |
| 1.4 | test スクリプト追加 | PackageScripts | — | — |
| 1.5 | test:watch スクリプト追加 | PackageScripts | — | — |
| 1.6 | setup.ts 作成 | TestSetup | — | — |
| 2.1 | デッキ枚数検証 | DeckTest | — | — |
| 2.2 | 重複なし検証 | DeckTest | — | — |
| 2.3 | スート別カウント検証 | DeckTest | — | — |
| 2.4 | ランク別カウント検証 | DeckTest | — | — |
| 3.1 | シャッフル後枚数検証 | DeckTest | — | — |

---

## コンポーネントとインターフェース

| コンポーネント | ドメイン/レイヤー | 意図 | 要件カバレッジ | 主要な依存関係 | コントラクト |
|--------------|-----------------|------|--------------|--------------|-------------|
| VitestConfig | テスト基盤 | Vitest設定の拡張 | 1.1, 1.2, 1.3 | vite.config (P0) | — |
| PackageScripts | テスト基盤 | npm スクリプト定義 | 1.4, 1.5 | — | — |
| TestSetup | テスト基盤 | テスト共通セットアップ | 1.6 | — | — |
| DeckTest | テスト / ユーティリティ | デッキ関数のテスト | 2.1–2.4, 3.1 | deck.ts (P0) | — |

### テスト基盤

#### VitestConfig

| フィールド | 詳細 |
|-----------|------|
| 意図 | `vitest.config.ts` にテスト環境設定を追加する |
| 要件 | 1.1, 1.2, 1.3 |

**責務と制約**
- `vitest.config.ts` の `test` オブジェクトに `globals`, `setupFiles` を追加する
- 既存の `exclude` 設定（`e2e/**`）を維持する
- `vite.config.ts` には変更を加えない（分離方針を維持）

**依存関係**
- Inbound: なし
- Outbound: `vite.config` — ビルド設定のマージ元 (P0)
- External: なし

**実装メモ**
- テスト対象は純粋関数のみであり、DOM環境（jsdom等）は不要。Vitestデフォルトの Node 環境で実行する
- `globals: true` により `describe`, `test`, `expect` 等のグローバル利用が可能になるが、既存テストは明示的importを使用しているため、既存テストとの整合性に注意

#### VitestConfig インターフェース

```typescript
// vitest.config.ts の test オブジェクトに追加する設定
interface VitestTestConfig {
  globals: true;
  setupFiles: string[];  // ['./src/test/setup.ts']
  exclude: string[];     // 既存の除外パターンを維持
}
```

#### PackageScripts

| フィールド | 詳細 |
|-----------|------|
| 意図 | `package.json` のスクリプトを要件に合わせて更新する |
| 要件 | 1.4, 1.5 |

**責務と制約**
- `test` スクリプトを `vitest run` に変更する（単発実行）
- `test:watch` スクリプトを `vitest` として追加する（ウォッチモード）

**実装メモ**
- 現在の `test`: `vitest` は `test:watch` に移動し、`test` を `vitest run` に変更する形になる

#### TestSetup

| フィールド | 詳細 |
|-----------|------|
| 意図 | テスト共通セットアップファイルを作成する |
| 要件 | 1.6 |

**責務と制約**
- `src/test/setup.ts` として作成する
- Vitest設定で参照されるセットアップファイルを作成する

### テスト / ユーティリティ

#### DeckTest

| フィールド | 詳細 |
|-----------|------|
| 意図 | `createDeck()` と `shuffleDeck()` の正しさを検証するテスト |
| 要件 | 2.1–2.4, 3.1 |

**責務と制約**
- `src/utils/__tests__/deck.test.ts` として作成する
- テスト対象: `createDeck()`, `shuffleDeck()` （`src/utils/deck.ts` からインポート）
- テストは純粋関数の戻り値のみを検証する（副作用なし）

**依存関係**
- Inbound: なし
- Outbound: `src/utils/deck.ts` — テスト対象の関数 (P0)
- External: なし

**テストケース構成**

```typescript
// src/utils/__tests__/deck.test.ts のテスト構成

// describe: createDeck
//   test: 2.1 — 52枚のカードが生成される
//   test: 2.2 — 全カードがユニークである（重複なし）
//   test: 2.3 — 各スートが13枚ずつ含まれる
//   test: 2.4 — 各ランクが4枚ずつ含まれる

// describe: shuffleDeck
//   test: 3.1 — シャッフル後も52枚が保持される
```

**テストで使用する型**

```typescript
import type { Suit, Rank, PlayingCard } from '../../types';
```

- `Suit`: `'hearts' | 'diamonds' | 'clubs' | 'spades'` — 4スートの検証に使用
- `Rank`: `'2' | '3' | ... | 'A'` — 13ランクの検証に使用
- `PlayingCard`: `{ suit: Suit; rank: Rank }` — カードの一意性検証に使用

---

## テスト戦略

### 単体テスト

| テスト | 検証内容 | 要件 |
|--------|---------|------|
| デッキ枚数 | `createDeck().length === 52` | 2.1 |
| カードの一意性 | `new Set(cards.map(c => c.suit + c.rank)).size === 52` | 2.2 |
| スート別カウント | 各スートのカード数 === 13 | 2.3 |
| ランク別カウント | 各ランクのカード数 === 4 | 2.4 |
| シャッフル後枚数 | `shuffleDeck(deck).length === 52` | 3.1 |

### E2Eテスト

- 既存の `npm run test:e2e` がパスすること（UI変更なしのため、スクリーンショット差分 0）

---

## ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `vitest.config.ts` | 変更 | `globals`, `setupFiles` 設定追加 |
| `package.json` | 変更 | `test` → `vitest run`, `test:watch` 追加 |
| `src/test/setup.ts` | 新規作成 | テスト共通セットアップファイル |
| `src/utils/__tests__/deck.test.ts` | 新規作成 | デッキ関数のテスト |
