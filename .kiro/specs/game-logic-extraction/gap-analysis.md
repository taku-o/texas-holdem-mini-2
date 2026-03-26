# ギャップ分析: ゲームロジック抽出 + テスト

## 1. 現状調査

### 対象ファイルと構造

| ファイル | 役割 | 行数 |
|---------|------|------|
| `src/hooks/useGameEngine.ts` | ゲーム状態管理・ロジック・CPU AI（抽出元） | 331行 |
| `src/utils/deck.ts` | デッキ生成・シャッフル（既存ユーティリティ） | 27行 |
| `src/utils/evaluator.ts` | ハンド評価（既存ユーティリティ） | 175行 |
| `src/types/index.ts` | 型定義（`Player`, `PlayingCard`, `PlayerAction`等） | 21行 |

### 抽出対象ロジックの現在位置

| 関数名 | 現在の場所 | 行番号 | 依存関係 |
|--------|-----------|--------|----------|
| `getNextActivePlayer` | `useGameEngine.ts` 内ローカル関数 | 138-144 | `Player`型のみ |
| `isRoundOver` | `useGameEngine.ts` 内ローカル関数 | 146-158 | `Player`型のみ |
| `calculateBlinds` | `startNextHand`関数内のインラインロジック | 88-100 | `Player`型、プレイヤー数(5)のハードコード |
| `applyAction` | `handleAction`関数内のインラインロジック | 200-271 | `Player`型、`GameState`型、`BIG_BLIND`定数 |
| `determineWinner` | `useEffect`内のインラインロジック | 274-305 | `Player`型、`PlayingCard`型、`evaluateHand` |

### 既存パターン・規約

- **ユーティリティ配置**: `src/utils/`に純粋関数を配置（`deck.ts`, `evaluator.ts`）
- **テスト配置**: `src/utils/__tests__/`にテストファイル（`deck.test.ts`, `evaluator.test.ts`）
- **インポート方式**: 相対パス、`import type`でのtype-only import
- **テストフレームワーク**: Vitest（既に構築済み）
- **E2Eテスト**: Playwright（既に構築済み）
- **useGameEngineの消費者**: `src/App.tsx`のみ（`state`, `startGame`, `handleAction`を使用）

## 2. 要件実現可能性分析

### 要件-アセット対応マップ

| 要件 | 既存アセット | ギャップ |
|------|-------------|---------|
| Req 1: `getNextActivePlayer`抽出 | `useGameEngine.ts` L138-144に既存ロジック | **軽微** — `% 5`を`% players.length`に変更（技術的課題 項目6参照） |
| Req 2: `isRoundOver`抽出 | `useGameEngine.ts` L146-158に既存ロジック | **なし** — ロジックはそのまま抽出可能 |
| Req 3: `calculateBlinds`抽出 | `startNextHand` L88-100にインラインロジック | **軽微** — インラインコードを関数化する必要あり |
| Req 4: `applyAction`抽出 | `handleAction` L200-271にインラインロジック | **中程度** — `setState`コールバック内のロジックを分離する必要あり。ログ生成、副作用（`setTimeout`）、次ハンド開始との分離が必要 |
| Req 5: `determineWinner`抽出 | `useEffect` L274-305にインラインロジック | **軽微** — `evaluateHand`呼び出しを含むロジックの関数化 |
| Req 6: 振る舞い維持 | `useGameEngine.ts`の外部API | **なし** — APIインターフェースは変更しない |
| Req 7: 単体テスト | Vitest環境、テスト配置パターン | **なし** — テストインフラは構築済み |
| Req 8: 既存テスト維持 | `npm run test`, `npm run test:e2e` | **なし** — リファクタリングのみ |

### 技術的課題

1. **`applyAction`の境界設計**: 現在の`handleAction`は純粋なロジック（ベット計算、状態更新）と副作用（`setTimeout`でのフェーズ遷移、次ハンド開始）が混在している。純粋関数として抽出する範囲の決定が必要
2. **`calculateBlinds`の関数シグネチャ**: 現在のインラインロジックはプレイヤー数5をハードコードしている。関数化時にプレイヤー数をパラメータ化するか、5固定のまま抽出するかの判断
3. **定数の共有**: `BIG_BLIND`、`SMALL_BLIND`等の定数を`gameLogic.ts`と`useGameEngine.ts`のどちらに配置するか
4. **`GameState`型の共有**: `applyAction`は`GameState`型に依存するが、現在`GameState`は`useGameEngine.ts`内で定義されている。型定義の移動先の検討が必要
5. **`dealerIndex`の初期値**: `useGameEngine.ts`にて`dealerIndex`の初期値は`-1`であることを確認済み（L33: `dealerIndex: -1,`、L63: `dealerIndex: -1, // Will be incremented to 0`）。`calculateBlinds`関数は`dealerIndex`が`-1`の場合にインデックス0から計算を開始する設計とする
6. **`% 5`ハードコードの`% players.length`への変更**: `getNextActivePlayer`（L139,141）、`calculateBlinds`（L88,90,93,94,96,97,99,100）、`firstToAct`計算（L184,186）で`% 5`がハードコードされている。純粋関数化にあたり`% players.length`に変更するが、現在のゲームはプレイヤー数5固定のため実行時の振る舞いは同等。単体テストおよびE2Eテストで回帰を検証する

### 複雑度シグナル

- 純粋なロジック抽出（`getNextActivePlayer`, `isRoundOver`, `calculateBlinds`, `determineWinner`）: **単純**
- 状態変更と副作用の分離（`applyAction`）: **中程度のアルゴリズムロジック**

## 3. 実装アプローチ

### Option A: 最小限の抽出（推奨）

純粋なロジック部分のみを`gameLogic.ts`に抽出し、副作用（`setTimeout`、`setState`）は`useGameEngine.ts`に残す。

- **抽出対象**: 5つの関数の純粋ロジック部分
- **`GameState`型**: `useGameEngine.ts`から`gameLogic.ts`またはtypes配下に移動
- **定数**: `gameLogic.ts`に配置し、`useGameEngine.ts`からインポート

**トレードオフ**:
- ✅ 抽出範囲が明確で、副作用の分離が容易
- ✅ `useGameEngine.ts`の変更が最小限
- ✅ テストが書きやすい（純粋関数のみ）
- ❌ `applyAction`の一部ロジック（ラウンド終了判定後の遷移）は`useGameEngine.ts`に残る

### Option B: 包括的な状態管理抽出

ゲーム状態管理ロジック全体をreducerパターンで抽出。

**トレードオフ**:
- ✅ より完全な関心の分離
- ❌ リファクタリング範囲が大きく、振る舞い変更リスクが高い
- ❌ Issue #4の要求範囲を超える

### 推奨: Option A

Issue #4の要求は「ロジック関数の抽出」であり、副作用の分離やアーキテクチャ変更は含まれない。Option Aが要求に最も合致する。

## 4. 工数・リスク評価

- **工数**: **S（1-3日）** — 既存パターンに沿った関数抽出とテスト作成。テストインフラは構築済み
- **リスク**: **Low** — 純粋関数の抽出は副作用が少なく、既存テスト（単体・E2E）で回帰を検出可能

## 5. 設計フェーズへの推奨事項

- **`applyAction`の抽出範囲**: 純粋なベット計算・状態更新ロジックのみを抽出し、`setTimeout`や`startNextHand`呼び出しは`useGameEngine.ts`に残す方針を設計で明確化する
- **`GameState`型の配置先**: `src/types/index.ts`への移動、または`gameLogic.ts`での再定義について設計で決定する
- **定数の配置**: `BIG_BLIND`等の定数を`gameLogic.ts`に移動するか、別の定数ファイルに切り出すかを設計で決定する
