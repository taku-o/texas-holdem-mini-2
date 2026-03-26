# リサーチ & 設計決定ログ

## サマリー
- **フィーチャー**: `game-logic-extraction`
- **ディスカバリースコープ**: Extension（既存コードからのロジック抽出リファクタリング）
- **主要発見事項**:
  - `getNextActivePlayer`と`isRoundOver`はすでに独立した関数としてフック内に存在しており、そのまま移動可能
  - `calculateBlinds`と`determineWinner`はインラインロジックであり、関数化が必要
  - `applyAction`は副作用（`setTimeout`、`startNextHand`呼び出し）と純粋ロジック（ベット計算、プレイヤー状態更新）が混在しており、純粋関数部分のみ抽出する必要がある

## リサーチログ

### applyActionの抽出境界

- **コンテキスト**: `handleAction`内のロジックは純粋計算と副作用が混在。純粋関数として抽出する範囲を決定する必要がある
- **ソース**: `src/hooks/useGameEngine.ts` L200-271
- **発見事項**:
  - 純粋計算部分: fold/call/raiseの各アクションに基づくプレイヤー状態（chips, currentBet, action）とpotの更新
  - 副作用部分: `setTimeout`によるフェーズ遷移、`startNextHand`呼び出し、ラウンド終了後の`advancePhase`呼び出し
  - ログ生成: アクションに応じたログメッセージの生成も純粋関数として抽出可能
- **影響**: `applyAction`は「1人のプレイヤーにアクションを適用し、更新後のプレイヤー配列・pot・currentBet・ログメッセージを返す」という純粋関数として設計。ラウンド終了判定・フェーズ遷移・次ハンド開始は`useGameEngine.ts`に残す

### GameState型と定数の配置先

- **コンテキスト**: `GameState`型と`BIG_BLIND`等の定数を`gameLogic.ts`と`useGameEngine.ts`の間で共有する方法
- **ソース**: `src/hooks/useGameEngine.ts` L6-23
- **発見事項**:
  - `GameState`と`GamePhase`は現在`useGameEngine.ts`からエクスポートされている
  - 他ファイルからのインポートは確認されない（`App.tsx`は`useGameEngine`のみインポート）
  - `INITIAL_CHIPS`, `SMALL_BLIND`, `BIG_BLIND`の3定数が存在
- **影響**: 型と定数を`gameLogic.ts`に移動し、`useGameEngine.ts`からre-exportすることで後方互換性を維持する

### calculateBlindsの関数化

- **コンテキスト**: `startNextHand`内のインラインロジックを関数として抽出する際のシグネチャ設計
- **ソース**: `src/hooks/useGameEngine.ts` L88-100
- **発見事項**:
  - 現在のロジックはプレイヤー数5をハードコード（`% 5`）
  - `dealerIndex`は前回のディーラーインデックス（初回は-1）
  - 非アクティブプレイヤーのスキップロジックが含まれる
  - 戻り値としてdealer, sb, bb, utgの4つのインデックスが必要
- **影響**: プレイヤー数は`players.length`から取得する設計とし、ハードコードを排除

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク/制限 | 備考 |
|-----------|------|------|-----------|------|
| 純粋関数抽出 | ロジックを純粋関数としてutilsに配置 | テスト容易、既存パターンに合致 | 関数間の依存関係の管理 | 推奨。deck.ts/evaluator.tsと同じパターン |

## 設計決定

### 決定: applyActionの抽出範囲

- **コンテキスト**: `handleAction`は純粋計算と副作用が混在
- **検討した選択肢**:
  1. `handleAction`全体をReducerパターンで抽出 — 副作用分離が必要で複雑
  2. 純粋計算部分のみを抽出 — シンプルで要件に合致
- **選択したアプローチ**: オプション2。1プレイヤーのアクション適用（chips/currentBet/action/pot更新）のみを純粋関数化
- **理由**: Issue #4の要求は「ロジック関数の抽出」であり、アーキテクチャ変更は含まれない
- **トレードオフ**: ラウンド終了判定後のフェーズ遷移ロジックは`useGameEngine.ts`に残るが、それは副作用を含むためutilsの責務外
- **フォローアップ**: E2Eテストでリファクタリング後の振る舞い維持を確認

### 決定: 型と定数の配置

- **コンテキスト**: `GameState`型と定数の配置先
- **検討した選択肢**:
  1. `src/types/index.ts`に型を移動、定数は`gameLogic.ts`に配置
  2. 型と定数の両方を`gameLogic.ts`に配置
- **選択したアプローチ**: オプション2。`gameLogic.ts`に型と定数を配置し、`useGameEngine.ts`からre-export
- **理由**: `GameState`は`gameLogic.ts`の関数シグネチャに密接に関連しており、同一ファイルに配置するのが自然。`src/types/index.ts`はドメインモデル型（`Player`, `PlayingCard`等）に特化させる
- **トレードオフ**: `useGameEngine.ts`からのre-exportが必要だが、外部への影響は最小限

### 決定: applyActionのシグネチャ

- **コンテキスト**: Issue #4および初期の要件定義書では`applyAction(state, action, amount)`という3引数のシグネチャが記載されていたが、設計書では`applyAction(players, playerIndex, action, amount, pot, currentBet)`という6引数版で定義された
- **検討した選択肢**:
  1. `applyAction(state, action, amount)` — Issue #4の記述に合致するが、テスト時に`GameState`全体の構築が必要
  2. `applyAction(players, playerIndex, action, amount, pot, currentBet)` — 必要な値のみを受け取り、テストが容易
- **選択したアプローチ**: オプション2。6引数版を採用し、要件定義書を設計書に合わせて更新した
- **理由**: 純粋関数として抽出する際、`GameState`全体を受け取るとテスト時に不要なフィールド（`deck`, `communityCards`, `logs`等）まで構築する必要があり、テスタビリティが低下する。必要最小限の引数を受け取る6引数版の方が純粋関数の設計方針に合致する
- **トレードオフ**: 引数が多くなるが、各引数の意味が明確であり、関数の責務が限定される

### 決定: WinnerResultからscoreフィールドを除外

- **コンテキスト**: `determineWinner`の戻り値`WinnerResult`に`score: number`フィールドを含めるかどうか
- **検討した選択肢**:
  1. `score`を含める — ソート結果の情報を呼び出し元に提供
  2. `score`を含めない — 呼び出し元が使用しないフィールドを返さない
- **選択したアプローチ**: オプション2。`score`はソート用に`determineWinner`内部で使用するが、戻り値には含めない
- **理由**: 既存の`useGameEngine.ts`で勝者判定後に`score`を参照する箇所がなく、`winnerId`/`winnerName`/`handRankName`のみ使用している。呼び出し元が使用しないフィールドを戻り値に含めるのは不要

## リスク & 対策
- `applyAction`の抽出時に副作用の分離を誤ると振る舞いが変わるリスク — E2Eテストで検出可能
- `calculateBlinds`のハードコード`% 5`を`% players.length`に変更する際の回帰リスク — 単体テストで検証

## リファレンス
- 作業計画書: `.kiro/specs/validate-game/work-plan.md`（フェーズ3）
- テスト計画書: `.kiro/specs/validate-game/test-plan.md`（1.3 ゲームエンジン 方針A）
- 調査報告書: `.kiro/specs/validate-game/investigation-report.md`（セクション3: ゲームフロー）
