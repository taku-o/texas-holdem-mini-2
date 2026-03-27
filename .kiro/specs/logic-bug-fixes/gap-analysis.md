# ギャップ分析: logic-bug-fixes

## 要件と既存コードベースのマッピング

### 要件 1: Raise金額の負値防止 (BUG-G7)

| 項目 | 現状 | ギャップ |
|------|------|---------|
| 対象ファイル | `src/utils/gameLogic.ts` L85-127 `applyAction` | 既に存在 |
| 現在の実装 | `raiseAmount = Math.min(p.chips, Math.max(minRaise, amount) - p.currentBet)` | **ギャップ: Missing** — `Math.max(minRaise, amount) - p.currentBet` が負になるケースにガードがない |
| 既存テスト | `src/utils/__tests__/gameLogic.test.ts` L340-424 `applyAction raise` テスト群 | **ギャップ: Missing** — `totalToPutIn < currentBet` のエッジケーステストがない |
| 影響範囲 | `applyAction`は`useGameEngine.ts`の`handleAction`およびテストから呼び出される | 制約なし — 純粋関数のため安全に変更可能 |

**複雑度シグナル**: 単純なガード追加（1行の`Math.max(0, ...)`ラップ）

### 要件 2: ストレート検出の明示的ソート (BUG-E1)

| 項目 | 現状 | ギャップ |
|------|------|---------|
| 対象ファイル | `src/utils/evaluator.ts` L72-90 `findStraight` | 既に存在 |
| 現在の実装 | `uniqueVals = [...new Set(cardSet.map(...))]` — Set挿入順に依存 | **ギャップ: Missing** — 明示的ソートがない |
| 既存テスト | `src/utils/__tests__/evaluator.test.ts` 全役パターンテスト | **ギャップ: Missing** — ソートされていない入力でのストレート検出テストがない |
| 影響範囲 | `findStraight`は`evaluateHand`内のクロージャ。`evaluateHand`は`determineWinner`および直接呼び出しで使用 | 制約なし — クロージャ内の変更のため外部インターフェースに影響なし |

**複雑度シグナル**: 1行のソート追加（`uniqueVals.sort((a, b) => b - a)`）

### 要件 3: getNextActivePlayerの無限ループ防止 (BUG-G5)

| 項目 | 現状 | ギャップ |
|------|------|---------|
| 対象ファイル | `src/utils/gameLogic.ts` L42-51 `getNextActivePlayer` | 既に存在 |
| 現在の実装 | `while (next !== currentIndex && ...)` — 全員が条件に合致しない場合`next`が`currentIndex`に戻るまでループ。ただし全員がフォールド/チップ0の場合、`currentIndex`自体もスキップ対象で自分に戻ったらループ終了する実装だが、**`currentIndex`が自身もスキップ条件に合致する場合に自分のインデックスをそのまま返す**という仕様 | **ギャップ: Missing** — ループ回数上限がない。全員非アクティブ時に-1を返すロジックがない |
| 既存テスト | `src/utils/__tests__/gameLogic.test.ts` L13-86 — 8テスト | **ギャップ: Missing** — 全員フォールド/チップ0のエッジケーステストがない |
| 呼び出し元 | `useGameEngine.ts` L141, L189 / テスト多数 | **制約: あり** — 戻り値が`-1`に変わる場合、呼び出し元での`-1`ハンドリングが必要。ただし、現在のゲームフローでは`isRoundOver`で先に全員フォールドが検出されるため、通常は到達しない防御的コード |

**複雑度シグナル**: ループカウンタ追加 + 戻り値変更（-1）。呼び出し元への影響を確認する必要あり。

### 要件 4: バーンカードの実装 (BUG-G4)

| 項目 | 現状 | ギャップ |
|------|------|---------|
| 対象ファイル | `src/hooks/useGameEngine.ts` L117-152 `advancePhase` | 既に存在 |
| 現在の実装 | フロップ: `newDeck.pop()!` ×3、ターン: ×1、リバー: ×1 — バーンなし | **ギャップ: Missing** — 各フェーズでバーンカードの`deck.pop()`が欠如 |
| 既存テスト | `src/hooks/__tests__/useGameEngine.refactor.test.ts` — advancePhase関連テスト | **ギャップ: Missing** — デッキ残枚数の検証テストがない。ただし`advancePhase`はReact Hookのクロージャ内関数のため直接テスト困難 |
| 影響範囲 | UIには影響なし（バーンカードは表示しない） | **制約: あり** — `advancePhase`は`useGameEngine`内のローカル関数。テストのためにはロジック抽出を検討するか、統合テストで検証する |

**複雑度シグナル**: 各フェーズ前に`newDeck.pop()`を1行追加。ただしテスト方法に工夫が必要。

---

## 実装アプローチの選択肢

### オプション A: 既存コンポーネントを拡張

**対象**: 全4件のバグ修正

| バグ | 変更内容 | ファイル |
|------|---------|---------|
| BUG-G7 | `raiseAmount`計算に`Math.max(0, ...)`ガード追加 | `gameLogic.ts` L111-114 |
| BUG-E1 | `findStraight`に`uniqueVals.sort(...)` 追加 | `evaluator.ts` L73 |
| BUG-G5 | ループカウンタ追加 + -1返却ロジック + 呼び出し元の対応 | `gameLogic.ts` L42-51 |
| BUG-G4 | 各フェーズ前に`newDeck.pop()`バーン追加 | `useGameEngine.ts` L122-131 |

各バグの修正は既存ファイルへの小規模な変更で対応可能。ただし変更行数はバグにより異なり、BUG-G5はループカウンタ・-1返却・呼び出し元対応を含むため比較的大きく、BUG-G4はテスト追加を含めるとテスト設計に工夫が必要。

**トレードオフ**:
- ✅ 最小限の変更で目的を達成
- ✅ 既存のコードパターンに従う
- ✅ BUG-G7, BUG-E1, BUG-G5は純粋関数のため単体テスト容易
- ❌ BUG-G4のテストは`advancePhase`が内部関数のため直接テスト困難

### オプション B: バーンカードロジックの抽出

BUG-G4について、`advancePhase`のカード配布ロジックを`gameLogic.ts`の純粋関数として抽出する。

**トレードオフ**:
- ✅ テスト容易性が向上
- ✅ 責務分離が進む
- ❌ Issue #5のスコープを超える可能性がある（リファクタリング）
- ❌ `useGameEngine.ts`の変更量が増える

### 推奨: オプション A

理由: Issue #5は「UIに影響しないロジックバグ修正」が目的であり、最小限の変更で達成できるオプションAが適切。BUG-G4のテストについては、`advancePhase`を間接的にテスト（`useGameEngine`の統合テスト、またはデッキ残枚数の検証）で対応可能。

---

## 工数とリスク

| 項目 | 値 | 理由 |
|------|----|----|
| **工数** | **S (1-3日)** | 4件とも1-3行の変更 + テスト追加。既存パターンの延長 |
| **リスク** | **低** | 純粋関数の修正が中心。既存テスト基盤が充実。UIへの影響なし |

---

## 設計フェーズへの推奨事項

1. **BUG-G5の-1返却時の呼び出し元対応**: `getNextActivePlayer`が-1を返す場合の`useGameEngine.ts`での処理を設計で明確にする
2. **BUG-G4のテスト戦略**: `advancePhase`は直接テスト困難なため、テスト方法（統合テスト or ロジック抽出）を設計で決定する
3. **テスト追加範囲**: 各バグ修正に対応するエッジケーステストの具体的なテストケースを設計で列挙する
