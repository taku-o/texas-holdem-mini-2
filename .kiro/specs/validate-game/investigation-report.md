# テキサスホールデム ゲームロジック調査報告書

## 調査対象ファイル

| ファイル | 役割 |
|---------|------|
| `src/hooks/useGameEngine.ts` | ゲーム状態管理・フェーズ遷移・CPU AI |
| `src/utils/deck.ts` | デッキ生成・シャッフル |
| `src/utils/evaluator.ts` | ハンド評価（役判定・スコア計算） |
| `src/types/index.ts` | 型定義 |
| `src/App.tsx` | メインUI・プレイヤー配置 |
| `src/components/Card.tsx` | カード描画 |
| `src/components/Table.tsx` | テーブル描画 |
| `src/components/Player.tsx` | プレイヤー情報描画 |
| `src/components/Controls.tsx` | 操作ボタン |

---

## 1. デッキ生成・シャッフル (`deck.ts`)

### 正しい点
- 4スート × 13ランク = 52枚のデッキを正しく生成
- Fisher-Yatesアルゴリズムによるシャッフル（公平なランダム化）

### 問題点
- なし

---

## 2. ハンド評価 (`evaluator.ts`)

### 正しい点
- ロイヤルフラッシュからハイカードまで全10ランクを評価
- スコア計算でタイブレーカーを考慮（5枚のキッカーまで比較）
- Aceのロー・ストレート（A-2-3-4-5）に対応
- 7枚（ホール2枚 + コミュニティ5枚）から最良の5枚を判定

### 問題点・懸念事項

#### [BUG-E1] ストレート検出のSet順序依存 (重大度: 中)
`findStraight`内で`new Set()`を使い重複ランクを除去している。JavaScriptのSetは挿入順を保持するため、カードがソート済みなら正しく動作するが、`flushCards`に対して呼ばれる場合、`flushCards`はスート別に集めた後のサブセットであり、元の`cards`配列のソート順に依存している。現状は`cards.sort()`後に`suits`に分配しているため正しい順序だが、暗黙の依存関係である。

#### [BUG-E2] ストレート検出でのカード選択の不正確さ (重大度: 低)
`findStraight`で`cardSet.find(c => rankValues[c.rank] === trueV)`を使っているが、同じランクのカードが複数ある場合（フラッシュ検出時以外）、最初に見つかったカードが返される。結果の`bestCards`には必ずしもベストなカードが含まれない可能性がある（ただしスコア計算には影響しない）。

#### [BUG-E3] スコア計算の浮動小数点精度 (重大度: 低)
`multiplier /= 100`で除算を繰り返すため、浮動小数点の精度問題が起きうる。実用上は`Number.MAX_SAFE_INTEGER`の範囲内で収まるため致命的ではないが、理論上は等しいスコアの比較で微差が生じる可能性がある。

---

## 3. ゲームフロー (`useGameEngine.ts`)

### 正しい点
- ゲームフェーズ: idle → pre-flop → flop → turn → river → showdown の正しい遷移
- コミュニティカード枚数: flop(3枚) → turn(1枚) → river(1枚)
- ブラインド処理: SB → BB の順で強制ベット
- ポジション決定: Dealer → SB(Dealer+1) → BB(SB+1) → UTG(BB+1) の正しい順序
- アクティブでないプレイヤーのスキップ処理
- プレイヤーのチップが0になった場合の破産処理
- 1人以外全員フォールドした場合のラウンド即終了

### 問題点・懸念事項

#### [BUG-G1] サイドポットの未実装 (重大度: 高)
オールインしたプレイヤーのチップが他プレイヤーのベットより少ない場合、サイドポットが作られるべきだが、現在は勝者が全ポットを獲得する。

**例**: プレイヤーAが100チップでオールイン、プレイヤーBが500チップでコール。プレイヤーAが勝った場合、本来は200チップ（100×2）しか獲得できないが、現実装では全ポットを獲得する。

#### [BUG-G2] `advancePhase`のネストされた`setState`呼び出し (重大度: 高)
```javascript
setTimeout(() => {
  setState(s => {
    const nextState = { ...s, players: newPlayers, ... };
    advancePhase(nextState); // advancePhase内で再度setStateを呼ぶ
    return s; // 元のstateをそのまま返す
  });
}, 500);
```
`setState`のコールバック内で`advancePhase`を呼び、`advancePhase`が内部で再度`setState`を呼んでいる。外側の`setState`は`s`を変更せず返すため、`advancePhase`の`setState`だけが有効になる構造。動作はするが、非常に脆弱で、Reactの将来のバージョンで動作が変わる可能性がある。

#### [BUG-G3] `handleAction`のuseCallback依存配列が空 (重大度: 中)
`handleAction`は`useCallback(() => {...}, [])`で空の依存配列を持つが、内部で`isRoundOver`、`getNextActivePlayer`、`advancePhase`、`startNextHand`を参照している。これらの関数はコンポーネントレベルで定義されており、`setState`の関数形式を使っているため現状は動作するが、Reactの推奨パターンに反している。

#### [BUG-G4] バーンカードの欠如 (重大度: 低)
テキサスホールデムのルールでは、コミュニティカードを配る前に1枚カードをバーン（捨てる）するが、この実装ではバーンカードが行われていない。ゲームの公平性には影響しないが、ルール通りではない。

#### [BUG-G5] `getNextActivePlayer`の無限ループの可能性 (重大度: 低)
全プレイヤーがフォールドまたはチップ0の状態では、ループが元のインデックスに戻るまで回り続ける。通常はフォールド時の早期判定で回避されるが、理論上はエッジケースが存在する。

#### [BUG-G6] ショーダウン時のuseEffectタイミング問題 (重大度: 中)
ショーダウン処理が`useEffect`で行われており、勝者チップ加算の`setState`と次のハンド開始の`setTimeout`が分離されている。React StrictModeでは`useEffect`が2回実行される可能性があり、勝者に2倍のポットが加算されるリスクがある。

#### [BUG-G7] Raiseの金額計算ロジック (重大度: 中)
```javascript
const raiseAmount = Math.min(p.chips, Math.max(newCurrentBet * 2 || BIG_BLIND, totalToPutIn) - p.currentBet);
```
`totalToPutIn`が`p.currentBet`より小さい場合、`raiseAmount`が負の値になる可能性がある。負の値が`Math.min(p.chips, negative)`で選択されると、チップが増えてしまう。

---

## 4. CPU AI (`useGameEngine.ts` 内のuseEffect)

### 正しい点
- 確率ベースの基本的な判断ロジック
- コール不要時（チェック可能時）の分岐処理

### 問題点・懸念事項

#### [BUG-A1] AIがハンドの強さを考慮しない (重大度: 低)
CPU AIは完全にランダムな確率で行動する。ハンドの強さ（ペアなど）を一切評価しない。ゲームとしての面白さに影響するが、バグではなく設計上の制限。

#### [BUG-A2] AIのRaise金額が固定的 (重大度: 低)
AIのレイズは`currentBet + BIG_BLIND`または`currentBet * 2`の固定パターンのみ。

---

## 5. UI (`App.tsx`, コンポーネント群)

### 正しい点
- プレイヤーの表示位置の回転（ヒューマンプレイヤーが常に下中央）
- ゲームフェーズに応じたコミュニティカードの表示
- ターン判定に基づくコントロールの有効/無効
- ロール（D/SB/BB）バッジの表示
- オールイン時のカード公開

### 問題点・懸念事項

#### [BUG-U1] オールインプレイヤーのカード早期公開 (重大度: 中)
`Player.tsx`で`player.action === 'all-in'`の場合にカードを表示しているが、テキサスホールデムではオールイン後もショーダウンまではカードを公開しないのが一般的。

#### [BUG-U2] Controls操作ボタンの表示位置 (重大度: 低)
ControlsがFold/Check(Call)/Raiseを常に表示しているが、ショーダウン後のゲームオーバー画面でも非活性状態で残る。

---

## 6. 問題の重大度サマリー

| ID | 重大度 | 概要 |
|----|--------|------|
| BUG-G1 | 高 | サイドポット未実装 |
| BUG-G2 | 高 | ネストされたsetState呼び出し |
| BUG-G6 | 中 | StrictModeでのuseEffectダブル実行リスク |
| BUG-G7 | 中 | Raise金額が負になる可能性 |
| BUG-G3 | 中 | useCallback依存配列の不備 |
| BUG-U1 | 中 | オールイン時のカード早期公開 |
| BUG-E1 | 中 | ストレートのSet順序依存 |
| BUG-G4 | 低 | バーンカードの欠如 |
| BUG-G5 | 低 | getNextActivePlayerの無限ループ可能性 |
| BUG-E2 | 低 | ストレート時のカード選択 |
| BUG-E3 | 低 | 浮動小数点精度 |
| BUG-A1 | 低 | AIがハンド強さを無視 |
| BUG-A2 | 低 | AIのRaise金額パターン固定 |
| BUG-U2 | 低 | ゲームオーバー後のControls表示 |

---

## 7. 結論

ゲームの基本フロー（ディール → ベッティング → フロップ/ターン/リバー → ショーダウン）は概ね正しく実装されている。ただし、**サイドポットの未実装**と**ネストされたsetState呼び出し**は高重大度の問題であり、ゲームの正確性や安定性に影響する。中重大度の問題も複数存在し、特にReact StrictModeでの動作保証とRaise金額計算には注意が必要。
