# 要件定義書: ゲームロジック抽出 + テスト

## Introduction

`useGameEngine`フック内に集約されているゲームロジックを純粋関数として`src/utils/gameLogic.ts`に抽出し、単体テスト可能にする。振る舞いは変えず、リファクタリングのみ行う。

本仕様は作業計画書（`.kiro/specs/validate-game/work-plan.md`）のフェーズ3に対応する。

## 要件

### Requirement 1: 次のアクティブプレイヤー取得関数の抽出

**Objective:** As a 開発者, I want `getNextActivePlayer`を純粋関数として抽出し単体テスト可能にする, so that プレイヤー遷移ロジックの正しさを独立して検証できる

#### 受け入れ基準

1. The `gameLogic.ts` shall 次のアクティブプレイヤーを取得する関数をエクスポートする
2. When 次のアクティブプレイヤー取得関数が呼び出された時, the `gameLogic.ts` shall 次のアクティブプレイヤーのインデックスを返す
3. When フォールド済みのプレイヤーが存在する場合, the `gameLogic.ts` shall そのプレイヤーのインデックスをスキップして次のアクティブプレイヤーを返す
4. When チップが0のプレイヤーが存在する場合, the `gameLogic.ts` shall そのプレイヤーのインデックスをスキップして次のアクティブプレイヤーを返す
5. When `useGameEngine.ts`から`getNextActivePlayer`が呼び出された時, the `useGameEngine.ts` shall 抽出前と同一の振る舞いを維持する

### Requirement 2: ベッティングラウンド終了判定関数の抽出

**Objective:** As a 開発者, I want `isRoundOver`を純粋関数として抽出し単体テスト可能にする, so that ラウンド終了判定ロジックの正しさを独立して検証できる

#### 受け入れ基準

1. The `gameLogic.ts` shall ベッティングラウンド終了判定関数をエクスポートする
2. When 全員が行動済みでベット額が一致している場合, the `isRoundOver` shall `true`を返す
3. When 未行動のプレイヤーが存在する場合, the `isRoundOver` shall `false`を返す
4. When ベット額が一致していないプレイヤーが存在する場合, the `isRoundOver` shall `false`を返す
5. When フォールドしていないアクティブプレイヤーが1人だけの場合, the `isRoundOver` shall `true`を返す
6. When オールインプレイヤー（チップ0）が存在する場合, the `isRoundOver` shall そのプレイヤーをアクション不要として扱い、行動済みと同等に判定する
7. When `useGameEngine.ts`から`isRoundOver`が呼び出された時, the `useGameEngine.ts` shall 抽出前と同一の振る舞いを維持する

### Requirement 3: ブラインドポジション計算関数の抽出

**Objective:** As a 開発者, I want `calculateBlinds`を純粋関数として抽出し単体テスト可能にする, so that ポジション計算ロジックの正しさを独立して検証できる

#### 受け入れ基準

1. The `gameLogic.ts` shall ブラインドポジション計算関数をエクスポートする
2. When ブラインドポジション計算関数が呼び出された時, the `gameLogic.ts` shall dealer, sb, bb, utgの各インデックスを返す
3. When 非アクティブプレイヤーが存在する場合, the `calculateBlinds` shall 非アクティブプレイヤーをスキップして正しいポジションを計算する
4. When `dealerIndex`が`-1`（初回）の場合, the `calculateBlinds` shall インデックス0から次のアクティブプレイヤーをディーラーとして計算を開始する
5. When `useGameEngine.ts`から`calculateBlinds`が呼び出された時, the `useGameEngine.ts` shall 抽出前と同一の振る舞いを維持する

### Requirement 4: アクション適用関数の抽出

**Objective:** As a 開発者, I want `applyAction`を純粋関数として抽出し単体テスト可能にする, so that 各アクション（Fold/Call/Raise）の処理ロジックの正しさを独立して検証できる

#### 受け入れ基準

1. The `gameLogic.ts` shall アクション適用関数をエクスポートする
2. When actionが`'fold'`の場合, the `applyAction` shall 対象プレイヤーの`action`を`'fold'`に設定した新しい結果を返す
3. When actionが`'call'`の場合, the `applyAction` shall 対象プレイヤーの`chips`を元値からコール額を減算し、`pot`を元値にコール額を加算した新しい結果を返す
4. When actionが`'raise'`の場合, the `applyAction` shall 対象プレイヤーの`currentBet`が`currentBet * 2`以上となる新しい結果を返す
5. When `applyAction`が呼び出された時, the `applyAction` shall 入力データ（`players`配列等）を変更せず、新しいオブジェクトとして結果を返す
6. When `useGameEngine.ts`から`applyAction`が呼び出された時, the `useGameEngine.ts` shall 抽出前と同一の振る舞いを維持する

### Requirement 5: 勝者判定関数の抽出

**Objective:** As a 開発者, I want `determineWinner`を純粋関数として抽出し単体テスト可能にする, so that 勝者判定ロジックの正しさを独立して検証できる

#### 受け入れ基準

1. The `gameLogic.ts` shall 勝者判定関数をエクスポートする
2. When 勝者判定関数が呼び出された時, the `gameLogic.ts` shall 最強ハンドを持つプレイヤーの`id`を含む結果を返す
3. When `useGameEngine.ts`から`determineWinner`が呼び出された時, the `useGameEngine.ts` shall 抽出前と同一の振る舞いを維持する

### Requirement 6: useGameEngineの振る舞い維持

**Objective:** As a 開発者, I want リファクタリング後も`useGameEngine`の外部振る舞いが変わらないことを保証する, so that UIやゲームプレイに影響を与えないことを確認できる

#### 受け入れ基準

1. The `useGameEngine.ts` shall 抽出した5つの関数（`getNextActivePlayer`, `isRoundOver`, `calculateBlinds`, `applyAction`, `determineWinner`）を`gameLogic.ts`からインポートして使用する
2. The `useGameEngine.ts` shall リファクタリング前と同一のゲームフロー（idle → pre-flop → flop → turn → river → showdown）を維持する
3. The `useGameEngine.ts` shall リファクタリング前と同一のAPIインターフェース（`state`, `startGame`, `handleAction`）を維持する

### Requirement 7: 抽出した関数の単体テスト

**Objective:** As a 開発者, I want 抽出した各関数の単体テストを作成する, so that ロジックの正しさを検証できる

#### 受け入れ基準

1. The `gameLogic.test.ts` shall `getNextActivePlayer`について、戻り値のインデックス数値が正しいことを検証するテストを含む
2. The `gameLogic.test.ts` shall `getNextActivePlayer`について、フォールド済み・チップ0のプレイヤーのインデックスを返さないことを検証するテストを含む
3. The `gameLogic.test.ts` shall `isRoundOver`について、`true`/`false`の戻り値を検証するテストを含む
4. The `gameLogic.test.ts` shall `calculateBlinds`について、返されるインデックス数値（dealer, sb, bb, utg）を検証するテストを含む
5. The `gameLogic.test.ts` shall `applyAction`のFoldについて、戻り値の`player.action`が`'fold'`であることを検証するテストを含む
6. The `gameLogic.test.ts` shall `applyAction`のCallについて、戻り値の`player.chips`が元値からコール額を減算した値であり、`pot`が元値にコール額を加算した値であることを検証するテストを含む
7. The `gameLogic.test.ts` shall `applyAction`のRaiseについて、戻り値の`player.currentBet`が`currentBet * 2`以上であることを検証するテストを含む
8. The `gameLogic.test.ts` shall `determineWinner`について、勝者の`player.id`が期待値と一致することを検証するテストを含む

### Requirement 8: 既存テストの維持

**Objective:** As a 開発者, I want リファクタリングにより既存のテストが壊れないことを保証する, so that 既存機能の回帰がないことを確認できる

#### 受け入れ基準

1. When リファクタリング後に`npm run test`を実行した時, the テストスイート shall 全テストがパスする
2. When リファクタリング後に`npm run test:e2e`を実行した時, the E2Eテスト shall 全テストがパスし、スクリーンショット差分が0である（UIに変化がない）
