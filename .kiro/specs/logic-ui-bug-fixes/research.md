# リサーチ & 設計判断ログ

## サマリー
- **フィーチャー**: `logic-ui-bug-fixes`
- **ディスカバリースコープ**: Extension（既存システムの修正）
- **主要な発見事項**:
  - BUG-G2とBUG-G6は`advancePhase`を`setState`関数形式に書き換えることで同時に解決可能
  - ショーダウン処理を`useEffect`から`advancePhase`のフェーズ遷移フロー内に移動することで、StrictMode二重実行リスクを排除できる
  - BUG-G3の依存配列問題は、BUG-G2修正でローカル関数が安定化することで自然に解消される

## リサーチログ

### `advancePhase`のネストsetState解消方法

- **コンテキスト**: `handleAction`内の`setState`コールバックから`advancePhase`が呼ばれ、`advancePhase`内で再度`setState`が呼ばれるネスト構造を解消する必要がある
- **調査内容**: Reactの`setState`関数形式（functional updater）パターンの確認
- **発見事項**:
  - 現在の`advancePhase(s: GameState)`は外部からstateを受け取り、内部で`setState({...s, ...})`を呼ぶ
  - `setState(s => { return newState })`形式に書き換えれば、パラメータ不要で最新stateを参照可能
  - この形式なら`setTimeout`コールバック内から直接呼んでも最新stateが保証される
- **設計への影響**: `advancePhase`のシグネチャを`(s: GameState) => void`から`() => void`に変更。内部で`setState`の関数形式を使用

### ショーダウンuseEffectの排除方法

- **コンテキスト**: ショーダウン処理がuseEffectで実装されており、StrictModeで二重実行リスクがある。またCLAUDE.local.mdの「useEffect最小化」ルールにも抵触
- **調査内容**: ショーダウン処理をフェーズ遷移フロー内に統合する方法
- **発見事項**:
  - `advancePhase`内でriverからshowdownに遷移する際、勝者判定とチップ加算をインラインで実行可能
  - `handleAction`内の「全員フォールド時のshowdown遷移」は既にuseEffect外で処理されている（164-175行）
  - 通常のshowdown遷移のみuseEffect依存なので、`advancePhase`内に統合すれば完全にuseEffectを排除可能
  - setState updater内での副作用（setTimeout）はConcurrent Modeで重複リスクがあるため、updater外にローカル変数フラグで分離する
- **設計への影響**: showdownの`useEffect`を削除し、`advancePhase`内のフェーズ遷移ロジックに勝者判定・チップ加算を統合。次ハンド開始スケジューリング（setTimeout）はsetState updater外で実行

### `handleAction`のuseCallback依存配列

- **コンテキスト**: `handleAction`は`useCallback(() => {...}, [])`で空の依存配列を持つ
- **調査内容**: BUG-G2修正後の依存関係分析
- **発見事項**:
  - `handleAction`内で参照する関数のカテゴリ:
    - **モジュールインポート**: `applyAction`, `isRoundOver`, `getNextActivePlayer` → 安定、依存配列不要
    - **ローカル関数**: `advancePhase`, `startNextHand` → BUG-G2修正後は`useCallback([], ...)`でラップされ安定化
  - `advancePhase`と`startNextHand`が`useCallback`でメモ化されれば、`handleAction`の依存配列にこれらを含めてもre-createは発生しない
- **設計への影響**: `advancePhase`と`startNextHand`を`useCallback`でラップし安定化した上で、`handleAction`の依存配列に含める

### `startNextHand`の関数形式化

- **コンテキスト**: `startNextHand(currentPlayers, currentDealer)`は外部からパラメータを受け取る現在のシグネチャ
- **調査内容**: パラメータなしの関数形式への変換可能性
- **発見事項**:
  - `startNextHand`は`setState`内で最新のplayers/dealerIndexを取得可能
  - ただし`startGame`からも呼ばれており、初期プレイヤー配列を渡す用途がある
  - `startGame`はstateを直接`setState`でセットした直後にsetTimeoutで`startNextHand`を呼ぶため、遅延実行なら最新stateから取得可能
- **設計への影響**: `startNextHand`のシグネチャを`() => void`に変更し、内部で`setState(s => ...)`を使用

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク・制限 | 備考 |
|-----------|------|------|-------------|------|
| A: setState関数形式統一 | advancePhase, startNextHandを全てsetState関数形式に変更 | シンプル、最新state保証、useEffect排除可能 | コード理解の複雑さ（setState内のロジック量が増加） | 推奨アプローチ |
| B: useRef + 既存パターン維持 | useRefで最新stateを保持し、既存のパラメータ渡しパターンを維持 | 既存コードとの差分が少ない | useRefの管理が煩雑、useEffectが残る | 不採用 |

## 設計判断

### 判断: advancePhaseをsetState関数形式に変換

- **コンテキスト**: BUG-G2のネストsetState解消が必要
- **検討した選択肢**:
  1. `useRef`で最新stateを保持し、`setTimeout`内で参照
  2. `advancePhase`をsetState関数形式に書き換え、パラメータなしで呼び出し可能にする
- **選択したアプローチ**: 選択肢2 — `advancePhase`を`setState(s => { /* compute next state */ return newState })`形式に変換
- **理由**: `useRef`不要でシンプル。Reactの推奨パターンに準拠。最新state保証
- **トレードオフ**: setState内のロジック量が増えるが、純粋関数（gameLogic.ts）への委譲で制御可能
- **フォローアップ**: E2Eテストでフェーズ遷移が正常動作することを検証

### 判断: ショーダウン処理をadvancePhase内に統合

- **コンテキスト**: BUG-G6のStrictMode二重実行リスク排除 + CLAUDE.local.mdのuseEffect最小化ルール
- **検討した選択肢**:
  1. `useRef`で処理済みフラグを管理し二重実行を防止
  2. `advancePhase`のshowdown遷移時に勝者判定・チップ加算をインライン実行
- **選択したアプローチ**: 選択肢2 — `advancePhase`のsetState内でshowdownフェーズ到達時に勝者判定・チップ加算・次ハンドスケジューリングを一括処理
- **理由**: useEffect完全排除。単一のstate更新で全処理を完結。StrictMode問題の根本解消
- **トレードオフ**: advancePhaseの責務が増加するが、勝者判定自体は`determineWinner`純粋関数への委譲で管理可能
- **フォローアップ**: ショーダウン後のチップ値・ポット表示のE2Eテスト

### 判断: Controls非表示の実装方法

- **コンテキスト**: BUG-U2のショーダウン/ゲームオーバー時のControls非表示
- **検討した選択肢**:
  1. `isTurn`に基づく条件付きレンダリング（`{isTurn && <Controls />}`）
  2. フェーズに基づく条件付きレンダリング（`{phase !== 'showdown' && phase !== 'game-over' && <Controls />}`）
- **選択したアプローチ**: 選択肢2 — フェーズベースの条件付きレンダリング
- **理由**: `isTurn`はCPUターン中もfalseになるため、CPUターン中もControlsが消えてしまう。フェーズベースなら「ゲーム進行中は表示、終了時のみ非表示」が正確に表現できる
- **トレードオフ**: なし（条件がより明確になる）

## リスクと軽減策

- **リスク1**: advancePhase内のsetState関数形式でのショーダウン処理統合が複雑化する → **軽減**: 勝者判定は`determineWinner`純粋関数に委譲し、setState内は最小限の状態更新のみ
- **リスク2**: handleAction依存配列の変更でCPU AIのuseEffectに影響が出る → **軽減**: CPU AI用useEffectの依存配列も確認し、handleActionの安定性を保証
- **リスク3**: E2Eテストのタイミングに依存するテストが不安定になる → **軽減**: 既存のadvanceToPhaseOrShowdownヘルパーのタイムアウト設定を確認

## 参考資料

- 調査報告書: `.kiro/specs/validate-game/investigation-report.md`
- 作業計画書: `.kiro/specs/validate-game/work-plan.md`（フェーズ5）
- React公式ドキュメント: useState functional updater pattern
