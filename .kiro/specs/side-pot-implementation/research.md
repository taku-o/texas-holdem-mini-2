# Gap 分析: サイドポット実装（フェーズ6）

## 分析サマリー

- **スコープ**: サイドポット計算ロジック（純粋関数）、ショーダウン時のポット別分配、UIへの複数ポット表示。対象Issueは #7（BUG-G1）。
- **主な課題**: 現状のデータモデルは **ハンド全体を通した各プレイヤーの累積投入額を保持していない**。`Player.currentBet` は `advancePhase` でラウンドごとにリセットされ、`GameState.pot` は総額しか保持しない。サイドポット計算には「ハンド中の各プレイヤーの累積投入額」が必須であり、これを保持するデータ構造の追加が最重要ギャップ。
- **UI既存契約**: `data-testid="pot-display"` 1要素、`Current Pot` テキスト、`$<数値>` フォーマット、ショーダウン後 `$0` 表示。複数ポット対応にするとこれらの契約を壊さず拡張できる余地がある。
- **テスト影響**: 既存のユニット/統合/E2Eテストは単一ポットを前提に書かれており、一部のE2E期待値（例: showdown後 `$0`）は「合計0」を維持できれば通る。スクリーンショットベースラインの更新が必要。
- **推奨アプローチ**: Option C（ハイブリッド）— Player型に累積投入額を追加＋`calculateSidePots` 純粋関数を新規追加＋UIは既存 `pot-display` コンテナ内に複数ポット表示を展開。

---

## 1. 現状調査

### 1.1 関連ファイル・レイアウト

| 層 | ファイル | 現状の責務 |
|----|----------|-----------|
| 型定義 | `src/types/index.ts` | `Player { chips, currentBet, action, ... }`（累積投入額フィールド無し） |
| ゲームロジック | `src/utils/gameLogic.ts` | `GameState { pot: number, ... }`、`applyAction`, `determineWinner`, `dealCommunityCards` |
| 状態管理 | `src/hooks/useGameEngine.ts` | `startNextHand`/`advancePhase`/`handleAction` で pot を単一値として管理・分配 |
| UI表示 | `src/components/Table.tsx` | `pot` prop を受け取り `data-testid="pot-display"` で単一ポット表示 |
| UI統合 | `src/App.tsx` | `<Table pot={state.pot} />` |
| テスト | `src/utils/__tests__/gameLogic.test.ts`, `gameLogic.integration.test.ts`, `src/hooks/__tests__/useGameEngine.refactor.test.ts`, `src/hooks/__tests__/useGameEngine.phaseTransition.test.ts` | applyAction/determineWinner/pot 遷移を単一ポット前提で検証 |
| E2E | `e2e/game-layout.spec.ts`, `e2e/game-flow.spec.ts`, `e2e/test-id-attributes.spec.ts` | `TESTID_POT_DISPLAY`、`$0`、`/\$\d/` パターン検証、スクリーンショットベースライン `game-screen.png` |

### 1.2 既存の慣習（conventions）

- **レイヤー分離**: UI（components）／状態管理（hooks）／純粋関数（utils）を明確に分離。ユーティリティは純粋関数、状態は hook、UIは表示のみ（structure.md）。
- **不変性**: `applyAction` / `dealCommunityCards` は元配列を変更せず新しい配列を返すパターンが既に確立。
- **型インポート**: `verbatimModuleSyntax` のため `import type` を使用。
- **テスト配置**: `src/utils/__tests__/`, `src/hooks/__tests__/`, `src/components/__tests__/`, プロジェクト全体共通のhelperは `src/__tests__/helpers.ts`。
- **E2E**: testid 定数は `e2e/constants.ts` に集約、スクリーンショットは `e2e/__screenshots__/`。

### 1.3 統合サーフェス

- **データモデル**: `Player`（不変オブジェクトとして扱われる）、`GameState`（`setState` で更新）。
- **ポット確定点**: 
  - (a) `handleAction` 内で「1人以外全員フォールド」ケース → `winner.chips += newPot` で直接分配
  - (b) `advancePhase` の showdown ブランチ → `determineWinner` + `winnerChips += winAmount`
- **UIレンダリング**: `Table.tsx` L20-25 が `pot` prop を `$${pot.toLocaleString()}` で表示。

---

## 2. 要件の実現可能性分析

### 2.1 要件 → 必要な技術要素

| 要件 | 技術要素 | 現状 | ギャップ分類 |
|------|---------|------|-------------|
| 1 サイドポット計算 | 各プレイヤーのハンド累積投入額を入力とする純粋関数 | **累積投入額の保持がない** | Missing（データモデル・関数） |
| 1 サイドポット計算 | ポット構造（金額 + eligible players） | ポット型が存在しない | Missing（型） |
| 1.7 フォールドプレイヤーの投入分もポットに含める | ラウンド開始時 `currentBet:0` にリセットされるためハンド途中でフォールドしたプレイヤーの投入額が失われる | **データ損失** | Constraint（修正必須） |
| 2 ポット別分配 | 各ポットの eligible players から `determineWinner` 相当を実行 | `determineWinner` は単一勝者のみ返す | Missing（分配ロジック拡張） |
| 2.6 同スコア分配 | 複数勝者による金額分配 | 未対応 | Missing（tie handling） |
| 3 UI 複数ポット | Table に複数要素描画、各要素に金額数値 | 単一 `pot` prop のみ | Missing（prop・レンダリング） |
| 3 UI 複数ポット | testid `pot-display` 契約維持 | 既存E2Eが依存 | Constraint（契約維持） |
| 4 テスト | 単体テスト + E2E + スクリーンショット更新 | テスト基盤は整備済み | Known（追記のみ） |

### 2.2 複雑度シグナル

- **アルゴリズム**: サイドポット計算は「各プレイヤーの投入額を昇順ソートし、差分 × 残プレイヤー数 でポットを切り出す」古典的アルゴリズム。ロジック自体は中程度の複雑さ。
- **外部統合**: なし（ブラウザ完結）。
- **ワークフロー**: ショーダウン時の分配経路が2箇所に分散している点（`handleAction` の全員フォールド経路 vs `advancePhase` のショーダウン経路）に注意。ただし要件定義書で全員フォールド経路は「単一ポットとして残り1人に分配」と明記しており、影響は showdown 経路に集中する。

### 2.3 既存テストからの制約

- **showdown 後 `pot: 0`**: `game-flow.spec.ts` L43 が `$0` を期待。`useGameEngine.refactor.test.ts` も `state.pot` を検証。→ 分配後 `state.pot` は 0 を維持する必要がある（または UI合計が0を維持）。
- **`pot-display` testid 1要素**: `test-id-attributes.spec.ts` L114 が「pot-displayが各1つずつ存在する」を検証。→ 親コンテナを `pot-display` のまま維持し、内側を複数ポット展開すれば契約を破らない。
- **`/\$\d/` パターン**: `game-layout.spec.ts` L18 が `potDisplay` 全体のテキストで検証。→ 複数ポット表示でも金額数値が含まれていればパスする。

---

## 3. 実装アプローチ案

### Option A: 既存コンポーネントの最小拡張（extend）

**方針**:
- `Player` 型に `totalContribution: number` を追加
- `applyAction` 内で call/raise の際 `totalContribution` に加算
- `postBlind`（useGameEngine.ts 内）で同様に加算
- `advancePhase` のリセットで `totalContribution` は保持（`currentBet` のみ0化）
- `startNextHand` で `totalContribution: 0` に初期化
- `calculateSidePots(players): Pot[]` を `gameLogic.ts` に新規追加
- `determineWinners(players, communityCards, sidePots)` で各ポット分配（または既存 `determineWinner` を再利用しつつエンジン側で各ポット毎にフィルタ呼び出し）
- `GameState` に `pots: Pot[]` を追加（showdown 時のみ非空、UI表示に使用）
- `Table.tsx` に `pots: Pot[] | undefined` prop を渡し、存在すれば複数表示／無ければ従来通り `pot` 単一表示

**互換性**:
- Player 型追加フィールドは既存全コードに影響するため、`postBlind` / `applyAction` / `resetPlayers` / テストヘルパー（`createPlayer`, `resetPlayersForNewRound`）の修正が必要
- 既存のユニットテストは `totalContribution` を意識せず `createPlayer` デフォルト値（0）で動作可能にすれば最小影響
- `pot-display` testid は親要素として維持、内部に子要素を追加

**トレードオフ**:
- ✅ 既存レイヤー（純粋関数・hook・UI）構造を維持
- ✅ 純粋関数で副作用なくテストしやすい
- ❌ Player 型変更により修正箇所が広範（型チェックで洗い出し可能）
- ❌ `postBlind` が useGameEngine 内のローカル関数で、そこにも累積加算を入れる必要がある（あるいは postBlind もロジックへ抽出する判断が必要）

### Option B: GameState 側に投入額Mapを別持ち（new）

**方針**:
- Player 型は変更せず、`GameState` に `contributions: Record<string, number>` を追加（プレイヤーID → 累積投入額）
- `applyAction` の戻り値に `contributionDelta` を追加、useGameEngine 側で Map 更新
- `calculateSidePots(contributions, foldedPlayerIds)` を新規追加

**互換性**:
- Player 型を触らないため、Player 関連テストへの影響が少ない
- `applyAction` のシグネチャ変更が必要（あるいは `pot` と同様の戻り値形式）

**トレードオフ**:
- ✅ Player 型を肥大化させない
- ✅ 関心を GameState 側に集中
- ❌ Player と密接に関連する情報が別所にあり、データ整合性の責務が useGameEngine に集中
- ❌ 現状 `applyAction` はプレイヤーを更新して返すため「投入額」の責務のみ外側で持つのは非対称

### Option C: ハイブリッド（totalContribution を Player に追加 + Pot 型を新設 + UIは既存コンテナ内で展開）【推奨】

**方針**:
- Option A のデータモデル変更（Player に `totalContribution`）
- 新規型:
  ```
  interface Pot {
    amount: number;
    eligiblePlayerIds: string[];
  }
  ```
  を `src/types/index.ts` または `gameLogic.ts` に追加
- `calculateSidePots(players: Player[]): Pot[]` を `gameLogic.ts` に新規追加
  - 入力: ハンド中のプレイヤー（`totalContribution`, `action`（fold判定用）, `id` を使用）
  - 出力: メインポットを先頭としたポット配列
- `determineWinner` はそのまま再利用可能（eligible players だけフィルタして呼ぶ）
- `GameState` に `pots?: Pot[]` を追加（showdown 時のみ set、従来の `pot: number` は UI合計として併用）
- `advancePhase` showdown 分岐で各ポット分配 + `pots` を set + `pot: 0`
- `Table.tsx`: 親 `pot-display` を保持、内部に各ポットのテキスト要素を描画
- 全員フォールド経路は単一ポットとして従来通り動作（要件定義の Adjacent expectations に明記済み）

**フェーズ実装**（タスク 6-1 → 6-2 → 6-3 と対応）:
1. 6-1: 型定義追加・`calculateSidePots` + 単体テスト先行（TDD）
2. 6-2: `Player.totalContribution` 導入・`applyAction`/`postBlind`/`startNextHand`/`resetPlayers` 修正・showdown 分配ロジック書き換え + 単体/統合テスト
3. 6-3: `Table.tsx` 複数ポット描画・`App.tsx` 接続・E2E追加・スクリーンショット更新

**リスク軽減**:
- TDDでロジックを先に固める（要件4.1に対応）
- チップ保存則の検証テストを統合テストに追加（要件2.5）
- UIテストid互換を維持（契約破壊回避）

**トレードオフ**:
- ✅ 計画的にフェーズ分割でき、各フェーズでテストが通ることを保証
- ✅ 既存のレイヤー分離と慣習に沿う
- ✅ E2E testid 契約を維持
- ❌ Player 型変更の波及が広く（Option A と同様）、修正リストは長い
- ❌ `GameState.pot` と `GameState.pots` の二重持ちは冗長性あり（単純化選択肢: `pots` のみ持ち、UI側で合計表示するが既存E2E互換性のため現段階では併存が安全）

---

## 4. Out-of-Scope（設計フェーズへ持ち越し）

以下は設計フェーズで判断する：
- `calculateSidePots` の正確なアルゴリズム記述（擬似コード・端点ケース整理）
- `GameState` での `pot` と `pots` の統合 or 併存の最終方針
- `postBlind` を useGameEngine からゲームロジックへ抽出するか否か
- `Pot` 型の配置場所（`types/index.ts` か `gameLogic.ts` か）
- UI における複数ポット表示のビジュアルレイアウト（横並び／縦並び／ラベリング）
- 同スコア分配時の端数処理（整数除算で余るチップの扱い）

---

## 5. Research Needed（設計フェーズで追調査）

- **R1**: フォールドプレイヤーの投入額をサイドポットに含める際、そのプレイヤーが投入した時点の条件下で eligibility を設定する必要があるか、単純に fold 後は eligible から外す運用で十分か → 要件1.7は後者で足りると読める。設計時に再確認。
- **R2**: オールイン発生時のベット額上限の扱い（短スタックプレイヤーが他プレイヤーのレイズにコールできない場合の投入額）→ 既存 `applyAction` の call 処理 `actualCall = Math.min(p.chips, toCall)` で自然に制限される。確認済み。
- **R3**: Playwright スクリーンショット差分閾値（`game-screen.png` は `maxDiffPixelRatio: 0.25`）のため、UIの軽微変更は吸収されうる。サイドポット形成時の新規スクリーンショット（オールイン状態）を別ファイルで追加する必要があるか、設計時に検討。
- **R4**: 同スコア分配（要件2.6）の端数処理ポリシーが仕様で明示されていない → 通常のポーカールールは「先頭プレイヤー（左から）に余りを付与」だが、実装では単純な整数除算＋余りの端数方針を設計時に決める。

---

## 6. 実装複雑度・リスク

- **Effort**: **M（3-7日）**
  - 理由: Player型拡張・純粋関数追加・hook 書き換え・UI描画変更・ユニット/統合/E2Eテスト追加・スクリーンショット再生成の複数層に及ぶ。ただし各層の変更は定型的（既存パターンの延長）。

- **Risk**: **Medium**
  - 理由: 
    - アルゴリズム自体は既知（リスク低）
    - Player 型変更の波及範囲が広い（型チェックで機械的検出可能、リスク中）
    - 既存E2E契約（`pot-display` testid）を保ちつつ表示拡張する必要あり（契約維持の注意必要）
    - スクリーンショットベースライン更新後の差分レビューが必要（UI変更の意図確認）

---

## 7. 設計フェーズへの推奨

### 推奨アプローチ

**Option C（ハイブリッド）** を採用する。

#### キーとなる設計判断（設計フェーズで確定）

1. **`Player.totalContribution: number` を追加** し、ハンド開始時 0 リセット、ベット投入時（ブラインド・call・raise）に加算、ラウンド終了時の `currentBet: 0` リセットでは保持。
2. **`Pot { amount, eligiblePlayerIds }` 型を新設**（配置は設計時）。
3. **`calculateSidePots(players: Player[]): Pot[]` を `gameLogic.ts` に純粋関数として追加**（TDD）。
4. **showdown 分配を `advancePhase` 内で Pot配列ベースに書き換え**、各ポットについて eligible players フィルタ + `determineWinner` 相当で勝者判定 + chips加算。
5. **`GameState.pots: Pot[]` を追加**（空配列デフォルト、showdown 時に `calculateSidePots` の結果を set）。`GameState.pot: number` は UI合計表示として当面維持（E2E契約互換）。
6. **`Table.tsx` で `pot-display` コンテナ内に複数ポットを描画**、単一ポット時は従来通りの見た目を維持。

### 持ち越すリサーチ項目

- R1: フォールドプレイヤーの eligibility の扱い確認
- R3: スクリーンショット追加テスト（オールイン状態）の要否
- R4: 同スコア分配時の端数ポリシー

### 次ステップ

1. 要件定義の承認を受けて、`/kiro-spec-design side-pot-implementation` を実行
2. 設計フェーズで Option C の詳細設計・アルゴリズム擬似コード・テスト戦略を確定
3. その後 `/kiro-spec-tasks side-pot-implementation` でタスク化

---

## 8. 設計フェーズ Synthesis ノート（2026-04-20）

設計書 `design.md` 作成時に適用した 3 レンズ観点の記録。

### 8.1 Generalization（一般化）

- 要件1（計算）と要件2（分配）は「ポット」概念で繋がる姉妹要件。`calculateSidePots` でポット配列を生成し、`distributePots` でそれを分配するという、データ構造（`Pot`）を中心とした 2 関数構成に集約した。
- 「全員同額」「1人オールイン」「2人オールイン」は `calculateSidePots` の特殊ケースとして自然に導出される。特別ケースごとに別関数を用意せず、アルゴリズムを `uniqueLevels を走査して diff × 残存プレイヤー数` と汎用化した。

### 8.2 Build vs Adopt（構築 vs 採用）

- サイドポット計算ライブラリを外部から採用するか検討：React + TypeScript向けに維持された標準ライブラリ候補は存在しない。ポーカーエンジン系ライブラリ（`poker-evaluator` 等）はハンド評価に特化しており、本アプリは既に `evaluator.ts` を自前実装済み。
- 決定: **構築を採用**。アルゴリズム自体は古典的で 30-50 行程度の純粋関数で書ける。外部ライブラリ追加は steering（`tech.md`: 外部ライブラリを追加しない方針）に反するため不採用。

### 8.3 Simplification（簡素化）

- `GameState` に `pots: Pot[]` を state として追加する案（research.md Option C 初期案）を見直した結果、**state に持たず App 側で `calculateSidePots(state.players)` を derived state として計算する方針に変更**。理由:
  - `state.pot`（合計）と `state.pots`（個別）の二重持ちは整合性維持コストが発生
  - `calculateSidePots` は純粋関数で O(N log N) 以下。再計算コストは極小
  - State を追加しないことで `useGameEngine.refactor.test.ts` など既存の state 形状検証テストへの影響を最小化
- 別途の `determineWinner` 拡張ではなく、新規 `distributePots` 関数を追加：既存 `determineWinner` は `handleAction` の全員フォールド経路（変更対象外）でそのまま使われるため、破壊的変更を避けた。
- 同スコア分配の端数処理は最小運用：整数除算 + 余りは tied players の最初のインデックスに付与。複雑な座席位置ベースのポーカー公式ルールは採用せず、テスタブルな単純規則とした（R4 の解決）。
- オールイン状態の追加スクリーンショットベースラインは新設せず、既存 `game-screen.png` の再ベースラインのみ（R3 の解決）。

### 8.4 設計で確定した R項目

- **R1**: フォールドプレイヤーは、そのプレイヤーが投入したチップをポット金額に含める（保存則維持）が、`eligiblePlayerIds` からは除外する。`calculateSidePots` アルゴリズム内で `remaining` 配列には含めつつ `eligibleIds` フィルタで除外する方式とした。
- **R2**: `applyAction` の call 処理 `Math.min(p.chips, toCall)` で既に短スタック制限がかかっており、`totalContribution` への加算でも自然に反映される。追加対応不要。
- **R3**: 追加スクリーンショット新設せず、`game-screen.png` の再ベースラインのみ（Non-Goals に明記）。
- **R4**: 同スコア分配は整数除算＋余り最前プレイヤー方式で確定（`distributePots` 契約に明記）。

---

## 9. 設計補足: `calculateSidePots` アルゴリズム擬似コード（2026-04-23）

design.md「`calculateSidePots` アルゴリズム概要」セクションから移動した**設計意図の共有目的の参考擬似コード**。これは実装アルゴリズムそのものではなく、振る舞いを理解するための補足資料である。実装時は同等の振る舞い（端点ケースおよび要件 1.1-1.8 で定めた出力条件）を満たす任意のアルゴリズムで置き換え可能。

```
contributions = players.map(p => ({ id, total: p.totalContribution, folded: p.action === 'fold' }))
filter out contribution === 0
uniqueLevels = sort ascending unique values of totalContribution (among filtered)
pots = []
prevLevel = 0
remaining = filtered contributions (copy)
for level in uniqueLevels:
  diff = level - prevLevel
  amount = diff * remaining.length
  eligibleIds = remaining.filter(!folded).map(c => c.id)
  if amount > 0:
    pots.push({ amount, eligiblePlayerIds: eligibleIds })
  remaining = remaining.filter(c => c.total > level)
  prevLevel = level
return pots
```

**補足**:
- この擬似コードは「各レベルで 差分 × 残存貢献者数」というテキサスホールデム公式のサイドポット構築論理を表している
- 実装時の最適化（ソート方式、フィルタの実装等）は実装者の裁量で、単体テスト（`gameLogic.sidePot.test.ts`）で振る舞いが保証される限り自由に選択できる
