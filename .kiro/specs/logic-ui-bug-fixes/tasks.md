# 実装タスクリスト: ロジック・UIバグ修正（フェーズ5）

## タスク一覧

- [ ] 1. useGameEngineのフェーズ遷移リファクタリング（BUG-G2 + BUG-G6）
- [ ] 1.1 `startNextHand`をsetState関数形式に変換する
  - `startNextHand`のシグネチャを`(currentPlayers, currentDealer) => void`から`() => void`に変更し、`setState(s => { ... })`形式で最新の`players`と`dealerIndex`を参照するように書き換える
  - `useCallback([], ...)`でラップして参照安定性を確保する
  - `startGame`からの呼び出しも、`setState`で初期状態をセットした後に`setTimeout(() => startNextHand(), 500)`形式に変更する
  - 単体テストを追加する: `startNextHand`のsetState関数形式が最新のplayers/dealerIndexから正しく新ハンドを開始すること
  - 変更後に`npm run test`および`npm run test:e2e`を実行して回帰がないことを確認する
  - _Requirements: 2.1_

- [ ] 1.2 `advancePhase`をsetState関数形式に変換し、ショーダウン処理を統合する
  - `advancePhase`のシグネチャを`(s: GameState) => void`から`() => void`に変更し、`setState(s => { return newState })`形式で最新stateを参照するように書き換える
  - `useCallback([startNextHand])`でラップして参照安定性を確保する
  - river→showdown遷移時に、setState updater内で`determineWinner`による勝者判定、チップ加算、pot=0化を実行する
  - `setTimeout(() => startNextHand(), 5000)`はsetState updater外でローカル変数`reachedShowdown`フラグを用いて条件分岐し、Concurrent Mode安全に実行する
  - 既存のショーダウン`useEffect`（`state.phase === 'showdown'`を監視するもの）を削除する
  - 単体テストを追加する: `advancePhase`のriver→showdown遷移時に勝者チップが正しく加算されること、showdown到達時にpotが0になること
  - 変更後に`npm run test`および`npm run test:e2e`を実行して回帰がないことを確認する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 1.3 `handleAction`のネストsetState解消と依存配列修正（BUG-G2 + BUG-G3）
  - `handleAction`内のsetStateコールバックからの`advancePhase`呼び出しを、`setTimeout(() => advancePhase(), 500)`形式に変更してネストsetStateを解消する
  - ラウンド終了時の中間状態更新で`activePlayerIndex: -1`を返すようにする
  - 全員フォールド時の`startNextHand`呼び出しも引数なしの形式に変更する
  - `useCallback`の依存配列を`[]`から`[advancePhase, startNextHand]`に変更する
  - 単体テストを追加する: `handleAction`のラウンド終了時に`advancePhase`がsetState外で呼ばれること
  - 変更後に`npm run test`および`npm run test:e2e`を実行して回帰がないことを確認する
  - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3_

- [ ] 2. (P) オールインプレイヤーのカード表示修正（BUG-U1）
  - `Player.tsx`のCardコンポーネントの`faceUp`プロップ条件から`player.action === 'all-in'`を削除する
  - 変更前: `faceUp={player.isHuman || player.action === 'all-in' || revealCards}`
  - 変更後: `faceUp={player.isHuman || revealCards}`
  - ショーダウン時には`revealCards`（`state.phase === 'showdown'`）でカードが表面表示されることを確認する
  - 変更後に`npm run test`および`npm run test:e2e`を実行して回帰がないことを確認する
  - _Requirements: 4.1, 4.2_

- [ ] 3. (P) ショーダウン/ゲームオーバー時のControls非表示（BUG-U2）
  - `App.tsx`のControlsコンポーネントのレンダリングをフェーズベースの条件付きレンダリングに変更する
  - `{state.phase !== 'showdown' && state.phase !== 'game-over' && (<div ...><Controls ... /></div>)}`形式でDOMから削除する
  - `isTurn`ベースではなくフェーズベースで判定する（CPUターン中にControlsが消えないようにするため）
  - 変更後に`npm run test`および`npm run test:e2e`を実行して回帰がないことを確認する
  - _Requirements: 5.1, 5.2_

- [ ] 4. E2Eテスト追加とスクリーンショットベースライン更新
- [ ] 4.1 オールインCPUのカード裏面表示を検証するE2Eテストを追加する
  - 追加先ファイル: `e2e/card-display.spec.ts`
  - オールイン状態のCPUプレイヤーのカード要素内にランク文字が含まれないこと（ショーダウン前）を検証するテストケースを追加する
  - ショーダウンフェーズ到達後にオールインプレイヤーのカードが表面表示されることを検証するテストケースを追加する
  - _Requirements: 4.3_

- [ ] 4.2 ショーダウン/ゲームオーバー時のControls非表示を検証するE2Eテストを追加する
  - 追加先ファイル: `e2e/player-controls.spec.ts`
  - ショーダウン時にFold/Call/Raiseボタン要素数が0であること（DOM非存在）を検証するテストケースを追加する
  - ゲームオーバー時にもControls要素がDOMに存在しないことを検証するテストケースを追加する
  - _Requirements: 5.3_

- [ ] 4.3 スクリーンショットベースラインを更新する
  - BUG-U1（オールインカード表示修正）およびBUG-U2（Controls非表示修正）の影響で変化したスクリーンショットベースラインを更新する
  - 更新後のベースラインとの差分が0であることを確認する
  - _Requirements: 4.4, 5.4, 6.3_

- [ ] 5. 全体回帰テスト実行と検証
- [ ] 5.1 全単体テストの実行と合格確認
  - `npm run test`を実行し、全テストに合格することを確認する
  - _Requirements: 6.1_

- [ ] 5.2 全E2Eテストの実行と合格確認
  - `npm run test:e2e`を実行し、全テストに合格することを確認する
  - _Requirements: 6.2_

- [ ] 5.3 ゲームフローの動作確認
  - フェーズ遷移のコミュニティカード枚数 0→3→4→5の動作を確認する
  - ショーダウン後のポット表示が`$0`であることを確認する
  - Fold/Call/Raise操作が正常に機能することを確認する
  - _Requirements: 1.4, 3.2, 3.3_

---

## タスク依存関係

```
タスク1.1 → タスク1.2 → タスク1.3（useGameEngine内の関数間依存）
タスク2 (P): タスク1と並列実行可能（Player.tsx独立修正）
タスク3 (P): タスク1と並列実行可能（App.tsx独立修正）
タスク4: タスク1, 2, 3の実装後に実行（E2Eテスト追加）
タスク5: 全タスク実装後に実行（最終回帰テスト）
```

## 要件カバレッジマトリクス

| 要件ID | 要件概要 | 対応タスク |
|--------|---------|-----------|
| 1.1 | advancePhaseをsetState外で呼び出し | 1.2, 1.3 |
| 1.2 | コミュニティカード枚数遷移 0→3→4→5 | 1.2, 5.3 |
| 1.3 | フェーズ名テキスト正常表示 | 1.2, 5.3 |
| 1.4 | E2Eスクリーンショット合格 | 1.3, 5.2 |
| 2.1 | 勝者チップ = 元値 + ポット | 1.1, 1.2 |
| 2.2 | ショーダウン後ポット = $0 | 1.2, 5.3 |
| 2.3 | StrictModeでチップ加算1回 | 1.2 |
| 3.1 | 依存配列に適切な依存関係 | 1.3 |
| 3.2 | 全テスト合格（回帰なし） | 1.3, 5.1, 5.2 |
| 3.3 | Fold/Call/Raise操作の正常表示 | 1.3, 5.3 |
| 4.1 | オールイン時カード裏面表示 | 2 |
| 4.2 | ショーダウン時カード表面表示 | 2 |
| 4.3 | E2Eオールインカード裏面検証 | 4.1 |
| 4.4 | スクリーンショットベースライン更新 | 4.3 |
| 5.1 | ショーダウン時Controls非表示 | 3 |
| 5.2 | ゲームオーバー時Controls非表示 | 3 |
| 5.3 | E2Eボタン要素数0検証 | 4.2 |
| 5.4 | スクリーンショットベースライン更新 | 4.3 |
| 6.1 | 各修正後の単体テスト合格 | 1.1, 1.2, 1.3, 2, 3, 5.1 |
| 6.2 | 各修正後のE2Eテスト合格 | 1.1, 1.2, 1.3, 2, 3, 5.2 |
| 6.3 | スクリーンショットベースライン更新・差分0 | 4.3 |
