# 実装タスク: サイドポット実装（フェーズ6）

> 本タスクリストは `.kiro/specs/side-pot-implementation/requirements.md` と `design.md` に基づく。
> 各タスクは既存の作業順序（Foundation → Core → Integration → Validation）を踏襲し、TDDでユニットテストを先行作成する。

## 並列実行（`(P)` マーカー）について

本タスクリストでは `(P)` マーカーを全タスクで**省略**している。その根拠は以下:

- タスク 2.x（`calculateSidePots`）と 3.x（`distributePots`）は、単体テストを同一ファイル `utils/__tests__/gameLogic.sidePot.test.ts` に書くため、並列実行時に同ファイルでの merge conflict リスクがある
- タスク 2.2 / 3.2 / 4.2 は同一ファイル `utils/gameLogic.ts` を改変するため並列不可
- タスク 5.x は同一ファイル `hooks/useGameEngine.ts` を改変するため並列不可
- タスク 1.1 と 1.2 は異なるファイルだが依存関係（1.2 は 1.1 の型拡張を前提）があるため順次実行が安全
- タスク 6.x / 7.x は先行タスクに論理依存があり、並列化のメリットが小さい

このため、全タスクを単一の直列パイプラインとして実行する。将来、テストファイルを複数に分割する等の設計変更があれば並列化を再検討する。

---

## 1. Foundation: データモデルとテストヘルパー

- [x] 1.1 Player 型に累積投入額フィールドを追加し、Pot 型を新設する
  - Player 型に `totalContribution: number` を追加する
  - 新規型 `Pot { amount: number; eligiblePlayerIds: string[] }` を追加する
  - 型宣言ファイルが正しくエクスポートされ、既存の型参照箇所の TypeScript コンパイルが通る
  - 観測可能な完了: `npm run build` の型チェックが成功し、`Player` の `totalContribution` と `Pot` が他モジュールからインポート可能
  - _Requirements: 1.1, 1.6, 1.7_
  - _Boundary: types/index.ts_

- [x] 1.2 共通テストヘルパー `createPlayer` のデフォルト値を更新する
  - `createPlayer` のデフォルトに `totalContribution: 0` を含める
  - `createActivePlayers` 経由で生成されるプレイヤーも `totalContribution === 0` になる
  - 観測可能な完了: 既存の単体・統合テストがすべてコンパイルエラーなく通る
  - _Requirements: 1.1_
  - _Boundary: __tests__/helpers.ts_

## 2. Core: `calculateSidePots` 純粋関数（TDD）

- [x] 2.1 `calculateSidePots` の単体テストを先行作成する
  - 全員同額ベットでポット数 1（要件 1.2）
  - 1人少額オールインでポット数 2、各ポット金額とeligible数の検証（要件 1.3, 1.4, 1.6）
  - 2人異額オールインでポット数 3、各ポット金額・eligible 数の検証（要件 1.5, 1.6）
  - フォールドプレイヤーの貢献はポット金額に含み、eligible に含まない検証（要件 1.7）
  - チップ保存則: `sum(pots.amount) === sum(players.totalContribution)`（要件 1.8）
  - 入力配列の不変性（元 `players` を変更しないこと）
  - **defensive テスト（design.md Error Handling / Unit Tests 14-15）**: `calculateSidePots([])` が `[]` を返す、全プレイヤーの `totalContribution === 0` 時に `[]` を返す、いずれのケースでも例外を投げないこと（要件 4.1）
  - 観測可能な完了: 8 件すべてのテストが `calculateSidePots is not defined`（または同等）で失敗する状態で commit 可能
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1_
  - _Boundary: utils/__tests__/gameLogic.sidePot.test.ts_

- [x] 2.2 `calculateSidePots` を実装する
  - 2.1 で作成した全テストケース（全員同額・1人少額オールイン・2人異額オールイン・フォールド扱い・チップ保存・入力不変性）を満たす振る舞いを実装する
  - アルゴリズム詳細・擬似コード・端点ケースは design.md の「`calculateSidePots` アルゴリズム概要」セクションを参照する
  - 観測可能な完了: 2.1 で作成したすべてのテストが pass する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - _Boundary: utils/gameLogic.ts_

## 3. Core: `distributePots` 純粋関数（TDD）

- [x] 3.1 `distributePots` の単体テストを先行作成する
  - 単一ポット分配: 1ポット・1勝者 → 勝者 chips にポット額加算、チップ総量保存（要件 2.3, 2.5）
  - 複数ポット分配: オールインケースで勝者が各ポットで異なる → awards 要素数 = ポット数、チップ増加額 = 各 award の和（要件 2.1, 2.3）
  - 同スコア均等割り切れケース: 2 プレイヤー同スコア・pot 100 → 各 50、`sum(awards.amount) === 100`（要件 2.6）
  - 同スコア余りありケース: `players[1]` と `players[3]` 同スコア・pot 101 → `players[1].chips += 51, players[3].chips += 50`（要件 2.6、同スコア分配の順序ルール準拠）
  - 同スコア 3 人ケース: `players[0], players[2], players[4]` 同スコア・pot 100 → `players[0]` が 34、他 2 人が 33（要件 2.6）
  - 入力配列の不変性（元 `players` / `pots` を変更しないこと）
  - **defensive テスト（design.md Error Handling / Unit Tests 13）**: 全ポットの `eligiblePlayerIds === []` である入力に対して、関数が例外を投げず `awards === []` を返すこと（要件 4.1）
  - 観測可能な完了: 7 件すべてのテストが `distributePots is not defined`（または同等）で失敗する状態で commit 可能
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 4.1_
  - _Boundary: utils/__tests__/gameLogic.sidePot.test.ts_

- [x] 3.2 `distributePots` を実装する
  - 3.1 で作成した全テストケース（単一ポット分配・複数ポット分配・同スコア均等・同スコア余りあり・3人タイ・入力不変性）を満たす振る舞いを実装する
  - 同スコア分配の順序ルール・契約・不変条件は design.md の「同スコア分配の順序ルール」および `distributePots` の Service Interface セクションを参照する
  - 観測可能な完了: 3.1 で作成したすべてのテストが pass する
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_
  - _Boundary: utils/gameLogic.ts_

## 4. `applyAction` の `totalContribution` 追跡拡張

- [x] 4.1 `applyAction` の `totalContribution` 追跡テストを先行作成する
  - call で `totalContribution += actualCall` が反映される検証
  - raise で `totalContribution += raiseAmount` が反映される検証
  - fold で `totalContribution` が変更されない検証
  - 既ベット額保持下でのcall/raiseで `currentBet` と `totalContribution` の差分関係が正しいこと
  - 観測可能な完了: 上記テストが失敗する状態で commit 可能
  - _Requirements: 1.1_
  - _Boundary: utils/__tests__/gameLogic.test.ts_

- [x] 4.2 `applyAction` に `totalContribution` 加算処理を追加する
  - call 分岐で `p.totalContribution += actualCall` を追加
  - raise 分岐で `p.totalContribution += raiseAmount` を追加
  - fold 分岐は変更なし（totalContribution は不変）
  - 観測可能な完了: 4.1 の新規テストが pass し、既存の `applyAction` テストも回帰なく通る
  - _Requirements: 1.1_
  - _Boundary: utils/gameLogic.ts_

## 5. Integration: `useGameEngine` への組み込み

- [x] 5.1 `startGame` と `startNextHand` で `totalContribution` を 0 に初期化する
  - `startGame` の `initialPlayers` に `totalContribution: 0` を含める
  - `startNextHand` の player リセットで `totalContribution: 0` を含める
  - 観測可能な完了: ハンド開始直後の state で全プレイヤーの `totalContribution === 0`
  - _Requirements: 1.1_
  - _Boundary: hooks/useGameEngine.ts_

- [x] 5.2 `postBlind` で `totalContribution` を加算する
  - `useGameEngine` 内ローカル関数 `postBlind` を拡張し、`players[idx].totalContribution += actual` を追加
  - SB / BB 投入後の state で `totalContribution` が投入額と一致する
  - 観測可能な完了: ハンド開始直後の state で SB プレイヤーの `totalContribution === SMALL_BLIND`、BB プレイヤーの `totalContribution === BIG_BLIND` になり、かつ `state.pot === sum(players.totalContribution)` が成立
  - _Requirements: 1.1_
  - _Boundary: hooks/useGameEngine.ts_

- [x] 5.3 `advancePhase` の showdown 分岐を複数ポット分配に書き換える
  - 既存の `determineWinner` 単一分配ロジックを削除
  - `calculateSidePots(resetPlayers)` で pots を取得し、`distributePots(pots, resetPlayers, newCommunityCards)` で分配する
  - 分配後に全プレイヤーの `totalContribution` を 0 にリセットする
  - `state.pot = 0` を設定する
  - ログに各 award（勝者名・金額・役）を反映する
  - 5.4（handleAction 全員フォールド経路）と**同一のリセット規約**（`state.pot === 0 && sum(totalContribution) === 0`）を守ること。両経路で不変条件が一致することは 5.5 統合テスト「showdown 両経路での `totalContribution === 0` かつ `state.pot === 0` 検証」で検証される
  - 観測可能な完了: ショーダウン時の state で `state.pot === 0`、全プレイヤーの `totalContribution === 0`、勝者 chips は各ポット award の合計だけ増加している
  - _Requirements: 2.1, 2.3, 2.4, 3.5_
  - _Boundary: hooks/useGameEngine.ts_
  - _Depends: 2.2, 3.2_
  - _Coordinates-with: 5.4_

- [x] 5.4 `handleAction` の全員フォールド経路に `totalContribution` 0 リセットを追加する
  - 勝者への chips 加算後、全プレイヤーの `totalContribution` を 0 にリセットする
  - 既存の分配ロジック（単一勝者への `newPot` 加算）自体は変更しない
  - 5.3（advancePhase showdown 分岐）と**同一のリセット規約**を守ること。片方のみ対応するとUIに偽のサイドポットが `SHOWDOWN_DISPLAY_DELAY`（5000ms）残るため、両経路の一貫性は 5.5 統合テスト「showdown 両経路での `totalContribution === 0` かつ `state.pot === 0` 検証」で検証される
  - 観測可能な完了: 全員フォールドで終局した直後の state で `state.pot === 0` かつ全プレイヤーの `totalContribution === 0`
  - _Requirements: 3.5_
  - _Boundary: hooks/useGameEngine.ts_
  - _Coordinates-with: 5.3_

- [x] 5.5 統合テスト: 不変条件と分配フローを検証する
  - `postBlind` + `applyAction` + `calculateSidePots` の累積計算フロー検証（要件 1.1, 1.8）
  - 複数ラウンドにわたる `totalContribution` 保持検証（要件 1.1）
  - オールインケースのショーダウン分配フロー、勝者 chips 増加 = 各ポット合算と一致（要件 2.3, 4.3）
  - ハンド全体のチップ保存則検証（要件 2.5）
  - showdown 両経路（`advancePhase` / `handleAction` 全員フォールド）での `totalContribution === 0` かつ `state.pot === 0` 検証（要件 3.5）
  - 不変条件 `state.pot === sum(players.totalContribution)` の複数時点での数値検証（要件 1.1, 1.8, 2.5）
  - 観測可能な完了: 6 件の統合テストが pass する
  - _Requirements: 1.1, 1.8, 2.3, 2.5, 3.5, 4.3_
  - _Boundary: hooks/__tests__/useGameEngine.sidePot.test.ts, utils/__tests__/gameLogic.integration.test.ts_
  - _Depends: 5.1, 5.2, 5.3, 5.4_

## 6. UI: Table と App の統合

- [x] 6.1 Table コンポーネントに複数ポット描画を追加する
  - `pots: Pot[]` prop を追加する
  - 既存の `pot-display` testid コンテナを維持する
  - `pots.length >= 2` の場合、コンテナ内に各ポット要素（`data-testid="pot-item"`）を描画し、各要素のテキストに `$<数値>` を含める
  - `pots.length <= 1` の場合、従来通り単一ポット表示のみ（pot-item 要素は描画しない）
  - ショーダウン後（`pots.length === 0`）は合計 `$0` 表示のみ
  - 観測可能な完了: オールイン含むケースで `pot-display` コンテナ内に pot-item 要素が 2 つ以上現れ、各要素のテキストが `/\$\d/` にマッチする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Boundary: components/Table.tsx_

- [x] 6.2 App コンポーネントから `calculateSidePots` を Table に接続する
  - `calculateSidePots(state.players)` を呼び、Table の `pots` prop に渡す
  - 既存の `pot={state.pot}` prop はそのまま維持する
  - 観測可能な完了: 実行時にオールインケースで Table に複数の pot-item が描画され、通常ケースでは単一表示を維持する
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Boundary: App.tsx_
  - _Depends: 2.2, 6.1_

## 7. Validation: E2E とスクリーンショットベースライン

- [x] 7.1 E2E テスト用 testid 定数を追加する
  - `e2e/constants.ts` に `TESTID_POT_ITEM = 'pot-item'` を追加
  - 観測可能な完了: 定数が `e2e/constants.ts` からエクスポートされ、後続の spec から import 可能
  - _Requirements: 3.1, 3.3_
  - _Boundary: e2e/constants.ts_

- [x] 7.2 サイドポット表示の E2E spec を追加する
  - `pot-display` 要素数 = 1 の既存契約維持検証
  - 通常進行時に pot-item 要素数が 1 以下（要件 3.4）
  - 各ポット要素のテキストが `/\$\d/` にマッチ（要件 3.2, 4.4）
  - ショーダウン後に pot-display 全体が `$0` を含む（要件 3.5、既存 `game-flow.spec.ts` の回帰なし）
  - 観測可能な完了: 新規 `e2e/side-pot.spec.ts` が pass し、既存 E2E テストにも回帰なし
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 4.4_
  - _Boundary: e2e/side-pot.spec.ts_
  - _Depends: 6.1, 6.2, 7.1_

- [x] 7.3 スクリーンショットベースライン `game-screen.png` を更新する
  - `npm run test:e2e:update` で `e2e/__screenshots__/game-layout.spec.ts/game-screen.png` を再生成する
  - 観測可能な完了: `npm run test:e2e` が更新後のベースラインとの差分 0 で pass する
  - _Requirements: 3.6_
  - _Boundary: e2e/__screenshots__/_
  - _Depends: 6.1, 6.2_

- [x] 7.4 全テストスイート実行で回帰なしを確認する
  - `npm run test`（単体・統合）の全件 pass
  - `npm run test:e2e`（E2E + スクリーンショット）の全件 pass
  - 観測可能な完了: 両コマンドの終了コード 0 かつ失敗件数 0
  - _Requirements: 4.5, 4.6, 4.7_
  - _Depends: 5.5, 7.2, 7.3_

- [x] 7.5 README.md の役判定セクションにサイドポット挙動を追記する
  - 現状の「役判定」説明は単一ポット前提の勝敗決定として書かれているため、オールイン発生時に複数ポット（メインポット・サイドポット）が生成され、各ポットで独立に勝者判定と分配が行われる旨を追記する
  - 追記内容はユーザー向けの簡潔な説明とし、実装詳細（関数名・型名・アルゴリズム）は含めない
  - 観測可能な完了: README.md の該当セクションにサイドポット挙動の説明が追加され、Markdown として正しくレンダリングされる
  - _Requirements: 2.1, 2.2, 3.3_
  - _Boundary: README.md_
  - _Depends: 6.1, 6.2_

---

## 要件カバレッジチェック

| 要件 ID | タスク |
|---------|-------|
| 1.1 | 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 5.1, 5.2, 5.5 |
| 1.2 | 2.1, 2.2 |
| 1.3 | 2.1, 2.2 |
| 1.4 | 2.1, 2.2 |
| 1.5 | 2.1, 2.2 |
| 1.6 | 1.1, 2.1, 2.2 |
| 1.7 | 1.1, 2.1, 2.2 |
| 1.8 | 2.1, 2.2, 5.5 |
| 2.1 | 3.1, 3.2, 5.3, 7.5 |
| 2.2 | 3.1, 3.2, 7.5 |
| 2.3 | 3.1, 3.2, 5.3, 5.5 |
| 2.4 | 5.3 |
| 2.5 | 3.1, 3.2, 5.5 |
| 2.6 | 3.1, 3.2 |
| 3.1 | 6.1, 6.2, 7.1, 7.2 |
| 3.2 | 6.1, 6.2, 7.2 |
| 3.3 | 6.1, 6.2, 7.1, 7.5 |
| 3.4 | 6.1, 6.2, 7.2 |
| 3.5 | 5.3, 5.4, 5.5, 6.1, 7.2 |
| 3.6 | 7.3 |
| 4.1 | 2.1, 3.1 |
| 4.2 | 2.1 |
| 4.3 | 3.1, 5.5 |
| 4.4 | 7.2 |
| 4.5 | 7.4 |
| 4.6 | 7.4 |
| 4.7 | 7.3, 7.4 |

全 28 要件 ID（1.1-1.8, 2.1-2.6, 3.1-3.6, 4.1-4.7）がタスクでカバーされている。
