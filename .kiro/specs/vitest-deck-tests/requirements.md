# 要件定義書: Vitest環境構築 + デッキテスト

## はじめに

ゲームロジックの正しさをテストで保証する基盤を作り、最もシンプルな純粋関数（デッキ）のテストを実装する。

本仕様はGitHub Issue #2「フェーズ1: Vitest環境構築 + デッキテスト」に対応する。

### 関連資料

- 作業計画書: `.kiro/specs/validate-game/work-plan.md`（フェーズ1）
- テスト計画書: `.kiro/specs/validate-game/test-plan.md`（1.1 デッキ, Part 3.1 Vitest導入）
- 調査報告書: `.kiro/specs/validate-game/investigation-report.md`（セクション1: デッキ）

### テスト対象ファイル

- `src/utils/deck.ts`

---

## 要件

### 要件 1: Vitest環境構築

**目的:** 開発者として、Vitestによる単体テスト環境を構築したい。それにより、ゲームロジックの正しさを自動テストで検証できるようになる。

#### 受け入れ基準

1. (1.1) The テスト環境 shall `vitest` をdevDependencyとしてインストールする（既にインストール済みであることを確認する）
2. (1.2) The テスト環境 shall `vitest.config.ts` にテスト設定を追加する（globals: true, setupFiles の設定を含む）
3. (1.3) The テスト環境 shall `vitest.config.ts` と `vite.config.ts` の既存の分離構成を維持する
4. (1.4) The テスト環境 shall `package.json` に `test` スクリプトを追加する（`vitest run` を実行）
5. (1.5) The テスト環境 shall `package.json` に `test:watch` スクリプトを追加する（`vitest` をウォッチモードで実行）
6. (1.6) The テスト環境 shall `src/test/setup.ts` を作成する

---

### 要件 2: デッキ生成のテスト

**目的:** 開発者として、`createDeck()` 関数の正しさをテストしたい。それにより、デッキ生成ロジックが仕様通りであることを保証できる。

#### 受け入れ基準

1. (2.1) When `createDeck()` が呼ばれた時, the テスト shall 戻り値の `.length` が 52 であることを検証する
2. (2.2) When `createDeck()` が呼ばれた時, the テスト shall 全カードの `suit+rank` 文字列をSetに入れて `.size` が 52 であること（重複なし）を検証する
3. (2.3) When `createDeck()` が呼ばれた時, the テスト shall スート別カウントが各スート 13枚であることを検証する
4. (2.4) When `createDeck()` が呼ばれた時, the テスト shall ランク別カウントが各ランク 4枚であることを検証する

---

### 要件 3: デッキシャッフルのテスト

**目的:** 開発者として、`shuffleDeck()` 関数の正しさをテストしたい。それにより、シャッフル後もデッキの整合性が保たれていることを保証できる。

#### 受け入れ基準

1. (3.1) When `shuffleDeck()` が呼ばれた時, the テスト shall シャッフル後の `.length` が 52 であることを検証する

---

## チェックポイント

- `npm run test` が全テストパスすること
- `npm run test:e2e` がパスすること（スクリーンショット差分 0 — UI変更なし）
