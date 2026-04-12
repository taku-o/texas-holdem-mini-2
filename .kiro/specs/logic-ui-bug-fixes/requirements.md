# 要件定義書: ロジック・UIバグ修正（フェーズ5）

## 概要

テキサスホールデム・ポーカーゲームにおいて、UIの振る舞いに影響するロジックバグおよびUIバグを修正する。調査報告書（`.kiro/specs/validate-game/investigation-report.md`）で特定された5件のバグ（BUG-G2、BUG-G6、BUG-G3、BUG-U1、BUG-U2）を対象とする。各修正後にE2Eテストとスクリーンショットベースラインを更新し、変更が意図的であることを検証する。

## 対象Issue

- GitHub Issue #6: フェーズ5: ロジック・UIバグ修正

## 関連資料

- 調査報告書: `.kiro/specs/validate-game/investigation-report.md`
- 作業計画書: `.kiro/specs/validate-game/work-plan.md`（フェーズ5）

---

## 要件

### 要件 1: BUG-G2 ネストされたsetState解消

**目的:** 開発者として、`advancePhase`を`setState`コールバックの外で呼び出すようにリファクタリングしたい。Reactの状態更新パターンを正しくし、将来のReactバージョンでの動作保証を得るためである。

#### 受け入れ基準

1. When `isRoundOver`がtrueを返した時, the useGameEngine shall `advancePhase`を`setState`コールバックの外部で呼び出す
2. When フェーズが遷移する時, the ゲーム画面 shall コミュニティカード枚数を 0→3→4→5 の順に正しく遷移させる
3. When 各ベッティングラウンドが終了する時, the ゲーム画面 shall 各フェーズ名テキスト（pre-flop、flop、turn、river、showdown）を正しく表示する
4. When リファクタリング後にE2Eテストを実行した時, the テスト shall フェーズ遷移ごとのスクリーンショット比較に合格する

### 要件 2: BUG-G6 ショーダウンuseEffectの安定化

**目的:** 開発者として、ショーダウン処理のuseEffectをリファクタリングしたい。React StrictModeでの二重実行により勝者に2倍のポットが加算されるリスクを排除するためである。

#### 受け入れ基準

1. When ショーダウンが発生した時, the useGameEngine shall 勝者のチップを「元値 + ポット」に正しく更新する（2倍にならないこと）
2. When ショーダウン処理が実行された時, the ゲーム画面 shall ポット表示を `$0` にする
3. While React StrictModeが有効な状態で, When ショーダウンが発生した時, the useGameEngine shall 勝者のチップ加算を1回だけ実行する

### 要件 3: BUG-G3 useCallback依存配列の修正

**目的:** 開発者として、`handleAction`のuseCallback依存配列を適切に設定したい。Reactの推奨パターンに準拠し、コールバック内で参照する関数・値の変更を正しく反映するためである。

#### 受け入れ基準

1. When `handleAction`のuseCallbackを定義する時, the useGameEngine shall 依存配列に必要な依存関係を適切に含める
2. When 依存配列修正後に全テストを実行した時, the テスト shall 回帰なしで全テストに合格する
3. When プレイヤーがFold/Call/Raise操作を行った時, the ゲーム画面 shall 各操作に対応するテキスト・要素を正しく表示する

### 要件 4: BUG-U1 オールインプレイヤーのカード表示修正

**目的:** プレイヤーとして、オールインしたCPUのカードがショーダウンまで裏面で表示されるようにしたい。テキサスホールデムの正式ルールに従い、ショーダウン前にカードが公開されないようにするためである。

#### 受け入れ基準

1. While プレイヤーがオールイン状態で, While フェーズがショーダウン以外の時, the Player コンポーネント shall カードを裏面（faceDown）で表示する
2. When ショーダウンフェーズに到達した時, the Player コンポーネント shall オールインプレイヤーのカードを表面で表示する
3. When オールインしたCPUのカード要素を検証した時, the E2Eテスト shall カード要素内にランク文字が含まれないことを確認する（ショーダウン前）
4. When カード表示修正後, the テスト shall 更新されたスクリーンショットベースラインと一致する

### 要件 5: BUG-U2 ゲームオーバー後のControls非表示

**目的:** プレイヤーとして、ショーダウンやゲームオーバー時に操作ボタン（Fold/Call/Raise）が非表示になるようにしたい。ゲームが終了した状態で無効な操作ボタンが残らないようにするためである。

#### 受け入れ基準

1. When フェーズがショーダウンの時, the ゲーム画面 shall Controlsコンポーネントを非表示にする
2. When フェーズがゲームオーバーの時, the ゲーム画面 shall Controlsコンポーネントを非表示にする
3. When ショーダウン時のE2Eテストを実行した時, the テスト shall Fold/Call/Raiseボタン要素数が0、または`visibility`が`hidden`であることを確認する
4. When Controls非表示修正後, the テスト shall 更新されたスクリーンショットベースラインと一致する

---

## 共通要件

### 要件 6: テスト・品質保証

**目的:** 開発者として、各バグ修正後にすべてのテストが合格することを保証したい。回帰バグを防止し、修正の正確性を検証するためである。

#### 受け入れ基準

1. When 各バグ修正が行われた後, the テスト shall `npm run test`（単体テスト）に全て合格する
2. When 各バグ修正が行われた後, the テスト shall `npm run test:e2e`（E2Eテスト）に全て合格する
3. When UI変更を伴うバグ修正が行われた後, the テスト shall スクリーンショットベースラインを更新し、更新後のベースラインとの差分が0であることを確認する

