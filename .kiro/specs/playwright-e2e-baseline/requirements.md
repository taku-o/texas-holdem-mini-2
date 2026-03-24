# 要件定義書: Playwright E2Eテスト + スクリーンショットベースライン構築

## はじめに

以降の全作業でUIリグレッションを自動検出できる基盤を構築する。すべてのUI検証はテストコードによる数値ベースの自動検証で行い、ユーザーの目視確認は行わない。

本仕様はGitHub Issue #1「フェーズ0: Playwright E2Eテスト + スクリーンショットベースライン構築」に対応する。

### UI検証の方法

1. **Playwrightスクリーンショット比較**: 各画面状態のスクリーンショットをベースライン画像として保存し、ピクセル単位で差分比較（`toHaveScreenshot()`）
2. **要素の数値検証**: 要素数、テキスト内容、表示/非表示、CSS計算値（色、サイズ、位置）を数値として取得しアサーション
3. **BoundingBox検証**: 要素の座標・幅・高さを取得し、レイアウト崩れがないことを数値で検証

### 関連資料

- 作業計画書: `.kiro/specs/validate-game/work-plan.md`（フェーズ0）
- テスト計画書: `.kiro/specs/validate-game/test-plan.md`（Part 2, Part 3.2）
- 調査報告書: `.kiro/specs/validate-game/investigation-report.md`（セクション5: UI）

---

## 要件

### 要件 1: Playwright環境構築

**目的:** 開発者として、Playwright E2Eテスト環境を構築したい。それにより、ブラウザ上でのUI自動テストが実行可能になる。

#### 受け入れ基準

1. The E2Eテスト環境 shall `@playwright/test` をdevDependencyとしてインストールする
2. The E2Eテスト環境 shall `playwright.config.ts` を作成し、devサーバー自動起動設定を含める
3. The E2Eテスト環境 shall スクリーンショット比較の閾値設定（`maxDiffPixelRatio` 等）を `playwright.config.ts` に含める
4. The E2Eテスト環境 shall `package.json` に `test:e2e` スクリプトを追加する（Playwright テスト実行用）
5. The E2Eテスト環境 shall `package.json` に `test:e2e:update` スクリプトを追加する（ベースライン更新用）

---

### 要件 2: 初期画面のE2Eテスト + スクリーンショットベースライン

**目的:** 開発者として、初期画面（idle画面）の表示を自動テストしたい。それにより、初期画面のUIリグレッションを検出できる。

#### 受け入れ基準

1. When 初期画面が表示された時, the E2Eテスト shall タイトル「Texas Hold'em」のテキストを取得し、文字列一致を検証する
2. When 初期画面が表示された時, the E2Eテスト shall 「Start Game」ボタンの存在を検証する（要素数 = 1）
3. When 初期画面が表示された時, the E2Eテスト shall 「Start Game」ボタンのBoundingBoxを取得し、幅 > 0、高さ > 0、画面内に収まっていることを検証する
4. The E2Eテスト shall 初期画面のスクリーンショットベースラインを保存する（`toHaveScreenshot('idle-screen.png')`）

---

### 要件 3: ゲーム画面レイアウトのE2Eテスト + スクリーンショットベースライン

**目的:** 開発者として、ゲーム開始後の画面レイアウトを自動テストしたい。それにより、ゲーム画面のレイアウト崩れを検出できる。

#### 受け入れ基準

1. When ゲームが開始された時, the E2Eテスト shall プレイヤー情報要素数 = 5 を検証する
2. When ゲームが開始された時, the E2Eテスト shall ポット金額要素のテキストが `$` を含み数値を含むことを検証する
3. When ゲームが開始された時, the E2Eテスト shall Fold / Check(Call) / Raise ボタンの要素数を検証する
4. When ゲームが開始された時, the E2Eテスト shall ロールバッジ（D / SB / BB）の表示テキストを検証する
5. When ゲームが開始された時, the E2Eテスト shall 各プレイヤーのBoundingBoxを取得し、画面内に収まっていることを検証する
6. When ゲームが開始された時, the E2Eテスト shall テーブル要素のBoundingBoxを取得し、幅・高さが最低値以上であることを検証する
7. The E2Eテスト shall ゲーム画面のスクリーンショットベースラインを保存する

---

### 要件 4: カード表示のE2Eテスト

**目的:** 開発者として、カードの表示を自動テストしたい。それにより、カード表示の不具合を検出できる。

#### 受け入れ基準

1. When ゲームが開始された時, the E2Eテスト shall ヒューマンプレイヤーのカードにランク文字表示要素数 = 2 を検証する
2. When ゲームが開始された時, the E2Eテスト shall CPUプレイヤーのカードにランク文字が非表示（裏面）であることを検証する
3. When ゲームが開始された時, the E2Eテスト shall カード要素のBoundingBoxを取得し、幅・高さが期待範囲内であることを検証する

---

### 要件 5: プレイヤー操作のE2Eテスト

**目的:** 開発者として、プレイヤーの操作UIを自動テストしたい。それにより、操作ボタンの表示・動作の不具合を検出できる。

#### 受け入れ基準

1. While ヒューマンプレイヤーのターンである間, the E2Eテスト shall コントロール要素の `opacity` CSS値 ≠ 0.5 であることを検証する
2. While ヒューマンプレイヤーのターンでない間, the E2Eテスト shall `opacity` = 0.5 または `pointer-events` = `none` であることを検証する
3. When Foldボタンがクリックされた時, the E2Eテスト shall プレイヤーのアクションバッジテキスト = "fold" を検証する
4. The E2Eテスト shall Check/Callボタンのテキストを検証する（`callAmount > 0` なら "Call $数値" / それ以外なら "Check"）
5. The E2Eテスト shall Raiseボタンの金額テキストに数値が含まれることを検証する

---

### 要件 6: ゲームフロー統合E2Eテスト

**目的:** 開発者として、ゲームの一連のフローを自動テストしたい。それにより、ゲーム進行全体のリグレッションを検出できる。

#### 受け入れ基準

1. When ゲームがpre-flopフェーズの時, the E2Eテスト shall コミュニティカード表示枚数 = 0 を検証する
2. When ゲームがflopフェーズに進んだ時, the E2Eテスト shall コミュニティカード表示枚数 = 3 を検証する
3. When ゲームがturnフェーズに進んだ時, the E2Eテスト shall コミュニティカード表示枚数 = 4 を検証する
4. When ゲームがriverフェーズに進んだ時, the E2Eテスト shall コミュニティカード表示枚数 = 5 を検証する
5. When ゲームが進行中の時, the E2Eテスト shall アクションログ要素数 ≥ 1 を検証する
6. When ショーダウンが終了した時, the E2Eテスト shall ポット金額 = $0（分配済み）を検証する

---

## チェックポイント

`npm run test:e2e` で全テストがパスすること。スクリーンショットベースラインが確立されること。
