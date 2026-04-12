# ギャップ分析: ロジック・UIバグ修正（フェーズ5）

## 1. 現状調査

### 対象ファイルと現在の構造

| ファイル | 役割 | 行数 | 変更対象バグ |
|---------|------|------|-------------|
| `src/hooks/useGameEngine.ts` | ゲーム状態管理・フェーズ遷移・CPU AI | 243行 | BUG-G2, BUG-G6, BUG-G3 |
| `src/components/Player.tsx` | プレイヤー情報描画 | 57行 | BUG-U1 |
| `src/App.tsx` | メインUI・プレイヤー配置・Controls表示 | 98行 | BUG-U2 |
| `src/utils/gameLogic.ts` | ゲームロジック純粋関数 | 181行 | 変更なし（参照のみ） |

### 既存のテスト基盤

| テスト種別 | ファイル | 対象 |
|-----------|---------|------|
| E2E | `e2e/game-flow.spec.ts` | フェーズ遷移・ポット表示 |
| E2E | `e2e/card-display.spec.ts` | カード表示（face up/down） |
| E2E | `e2e/player-controls.spec.ts` | Fold/Call/Raise操作 |
| E2E | `e2e/helpers.ts` | advanceToPhaseOrShowdown等ユーティリティ |
| 単体 | `src/utils/__tests__/gameLogic.test.ts` | gameLogic純粋関数 |
| 単体 | `src/hooks/__tests__/useGameEngine.refactor.test.ts` | useGameEngineリファクタ検証 |
| スクリーンショット | `e2e/__screenshots__/` | ベースライン画像 |

### アーキテクチャパターン

- **状態管理**: `useState` + カスタムフック（`useGameEngine`）
- **ロジック分離**: 純粋関数は `src/utils/gameLogic.ts` に抽出済み
- **フェーズ遷移**: `setTimeout` + `setState`の組み合わせで遅延付き遷移
- **テストID**: `data-testid` 属性でE2Eテスト対象を特定

---

## 2. 要件別フィージビリティ分析

### 要件 1: BUG-G2 ネストされたsetState解消

**現状のコード（178-185行）:**
```typescript
setTimeout(() => {
  setState(s => {
    const nextState = { ...s, players: newPlayers, ... };
    advancePhase(nextState);
    return s; // 元のstateを返す（advancePhase内のsetStateが有効）
  });
}, 500);
```

**ギャップ:**
- `advancePhase`は内部で`setState`を呼ぶが、それが`setState`コールバック内から呼ばれている
- `handleAction`内の`setState`は`return s`で元のstateを返すだけで、実際の更新は`advancePhase`の`setState`に依存
- この構造を解消するには、`setTimeout`のコールバック内で`advancePhase`を直接呼ぶ必要がある
- ただし、`advancePhase`は引数`s: GameState`を受け取るため、その時点の最新stateを渡す仕組みが必要

**技術的課題:**
- `setTimeout`コールバック内で最新のstateを参照するために`useRef`が必要になる可能性がある
- または`advancePhase`自体を`setState`の関数形式で書き直す方法もある

**既存テストの影響:**
- `e2e/game-flow.spec.ts`: フェーズ遷移テストが影響を受ける可能性あり
- 動作自体が変わらなければテスト修正は不要

### 要件 2: BUG-G6 ショーダウンuseEffectの安定化

**現状のコード（193-217行）:**
```typescript
useEffect(() => {
  if (state.phase === 'showdown') {
    // 勝者判定 + チップ加算
    setState(s => { /* チップ加算 */ });
    setTimeout(() => { startNextHand(...) }, 5000);
  }
}, [state.phase]);
```

**ギャップ:**
- React StrictModeで`useEffect`が2回実行されると、チップ加算が2回行われるリスク
- CLAUDE.local.mdの「どうしても必要な時以外はuseEffectを使用してはならない」ルールにも関係
- ショーダウン処理を`useEffect`外に移動する必要がある

**実装アプローチ候補:**
- **A**: ショーダウン到達時に`advancePhase`内でインラインに勝者判定・チップ加算を行う
- **B**: `useRef`でショーダウン処理済みフラグを管理し、二重実行を防止
- **C**: `useEffect`を廃止し、フェーズ遷移のフロー内でショーダウン処理を直接実行

**既存テストの影響:**
- `e2e/game-flow.spec.ts`: ポット表示$0の検証に影響
- ショーダウン後のチップ値検証テストが新規必要

### 要件 3: BUG-G3 useCallback依存配列の修正

**現状のコード（152行）:**
```typescript
const handleAction = useCallback((action: 'fold'|'call'|'raise', amount: number = 0) => {
  // 内部でadvancePhase, startNextHand, isRoundOver等を参照
}, []); // 空の依存配列
```

**ギャップ:**
- `handleAction`内で参照している関数: `applyAction`（import）、`isRoundOver`（import）、`getNextActivePlayer`（import）、`advancePhase`（ローカル関数）、`startNextHand`（ローカル関数）
- `applyAction`, `isRoundOver`, `getNextActivePlayer`はモジュールレベルのインポートなので依存配列に不要
- `advancePhase`と`startNextHand`はコンポーネントスコープの関数
- ただし`setState`の関数形式を使っているため、実質的に最新stateを参照できている

**技術的課題:**
- BUG-G2の修正と連動する可能性が高い（`advancePhase`のシグネチャが変わる場合）
- `startNextHand`を依存配列に入れると、`startNextHand`自体が毎レンダーで再生成されるため、さらなるメモ化が必要になる可能性

**既存テストの影響:**
- 全テストに影響（回帰テストとして確認必要）

### 要件 4: BUG-U1 オールインプレイヤーのカード表示修正

**現状のコード（Player.tsx 20行）:**
```typescript
<Card card={card} faceUp={player.isHuman || player.action === 'all-in' || revealCards} />
```

**ギャップ:**
- `player.action === 'all-in'` の条件を削除するだけ
- 変更量は1行のみ

**既存テストの影響:**
- `e2e/card-display.spec.ts` の「CPUのカードにランク文字が表示されていない」テストは、オールイン状態のCPUを対象としていない可能性がある（通常のpre-flop開始時のテスト）
- オールイン状態でのカード裏面表示を検証する新規E2Eテストが必要

### 要件 5: BUG-U2 ゲームオーバー後のControls非表示

**現状のコード（App.tsx 82-91行）:**
```typescript
<div className="absolute ...">
  <Controls isTurn={isTurn} ... />
</div>
```

**ギャップ:**
- `isTurn`は`showdown`と`game-over`時に`false`になるが、Controlsは`opacity-50 pointer-events-none`で残っている
- 完全に非表示にするには条件付きレンダリングが必要

**実装アプローチ候補:**
- **A**: `{isTurn && <Controls ... />}` で条件付きレンダリング（showdown/game-over時にDOM自体を削除）
- **B**: フェーズベースの条件: `{state.phase !== 'showdown' && state.phase !== 'game-over' && <Controls ... />}`

**既存テストの影響:**
- `e2e/player-controls.spec.ts`: 非ターン時のテスト（opacity=0.5検証）が影響を受ける可能性
- showdown時のControls非表示を検証する新規E2Eテストが必要

---

## 3. 実装アプローチの選択肢

### Option A: 既存コンポーネント拡張（推奨 → 設計フェーズで採用）

すべてのバグ修正を既存ファイルの修正として行う。新規ファイルは作成しない。BUG-G2とBUG-G6は関連する問題として一体的に解決する（Option Cのショーダウン統合要素を取り入れた形）。

**変更対象:**
- `src/hooks/useGameEngine.ts`: BUG-G2, BUG-G6, BUG-G3のリファクタリング（advancePhaseのsetState関数形式化 + ショーダウン処理統合）
- `src/components/Player.tsx`: 1行の条件削除（BUG-U1）
- `src/App.tsx`: 条件付きレンダリング追加（BUG-U2）
- E2Eテスト: 新規テストケース追加 + スクリーンショットベースライン更新

**トレードオフ:**
- ✅ 変更対象ファイルが最小限
- ✅ 既存のアーキテクチャパターンに準拠
- ✅ テスト基盤がすでに整っている
- ✅ BUG-G2/G6を整合性を持って解決（Option C要素）
- ❌ `useGameEngine.ts`の複雑度がさらに増す可能性（BUG-G2, G6修正次第）

### Option B: useGameEngineの構造リファクタリング

BUG-G2, G6, G3を契機に、`useGameEngine.ts`のフェーズ遷移パターンを根本的に再設計する。

**変更内容:**
- フェーズ遷移ロジックをステートマシン的なパターンに変更
- `useEffect`をすべて排除し、イベント駆動のフロー制御に変更

**トレードオフ:**
- ✅ 根本的に安定した構造になる
- ✅ `useEffect`排除でCLAUDE.local.mdのルールに完全準拠
- ❌ 変更量が大きい（リスク増大）
- ❌ 既存テストの大幅な修正が必要になる可能性
- ❌ フェーズ5のスコープを超える

### Option C: ハイブリッドアプローチ（Option Aに統合して採用）

BUG-G2とBUG-G6を関連する問題として一括で解決し、他は個別に修正。

**変更内容:**
- `advancePhase`の呼び出し構造とショーダウン処理を一体的にリファクタリング
- BUG-U1, BUG-U2, BUG-G3は個別に修正

**トレードオフ:**
- ✅ 関連する問題を整合性を持って解決
- ✅ 変更量は中程度
- ❌ BUG-G2とBUG-G6の修正が複合的になるため、問題の切り分けが難しくなる

> **設計フェーズでの判断**: Option AをベースにOption Cのショーダウン統合要素を取り入れた。既存ファイルの修正のみ（Option A）としつつ、BUG-G2/G6はadvancePhaseのsetState関数形式化とショーダウン処理統合で一体的に解決（Option C要素）する方針を採用した。詳細は `design.md` を参照。

---

## 4. 工数・リスク評価

| バグID | 工数 | リスク | 理由 |
|--------|------|--------|------|
| BUG-G2 | M | 中 | setState/フェーズ遷移パターンの変更は広範囲に影響 |
| BUG-G6 | M | 中 | useEffect廃止の場合、フロー制御の再設計が必要 |
| BUG-G3 | S | 低 | BUG-G2の修正に依存するが、修正自体は軽微 |
| BUG-U1 | S | 低 | 1行の条件削除のみ |
| BUG-U2 | S | 低 | 条件付きレンダリングの追加のみ |
| 全体 | M | 中 | BUG-G2とBUG-G6の修正が連鎖的に他の修正に影響する |

---

## 5. 推奨事項

### 設計フェーズへの申し送り事項

1. **BUG-G2とBUG-G6は密接に関連** — `advancePhase`の呼び出し構造とショーダウンの`useEffect`は、ともに`setState`の使い方に関する問題であり、設計時に整合性のある解決策を検討すべき
2. **useEffect排除の方針** — CLAUDE.local.mdの「どうしても必要な時以外はuseEffectを使用してはならない」に従い、ショーダウンuseEffect（193-217行）の排除を検討すべき。ただしCPU AI用のuseEffect（219-239行）はタイマー管理に必要
3. **修正順序の依存関係** — BUG-G2 → BUG-G6 → BUG-G3の順で修正すべき（BUG-G2の変更がG6, G3のコード構造に影響するため）。BUG-U1, BUG-U2は独立して修正可能
4. **E2Eテスト追加** — オールイン状態でのカード裏面検証、ショーダウン時のControls非表示検証など、新規テストケースの設計が必要

### Research Needed

- BUG-G2: `advancePhase`を`setState`外で呼ぶ場合、最新stateの参照方法（`useRef`利用 vs `setState`関数形式の活用）の比較検討
- BUG-G6: React 19のStrictMode挙動の詳細確認（useEffectの二重実行が実際に発生するか）
