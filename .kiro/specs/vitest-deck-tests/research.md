# 調査・設計判断ログ

## サマリー
- **機能**: vitest-deck-tests
- **発見スコープ**: Extension（既存テスト基盤の拡張）
- **主要な発見事項**:
  - Vitestは既にインストール済み（v4.1.1）。`vitest.config.ts` で `vite.config` をマージする分離構成が確立されている
  - `jsdom` は未インストール。`vitest.config.ts` に `environment`, `globals`, `setupFiles` 設定が不足
  - テスト配置は `src/__tests__/` パターンだが、テスト計画書では `src/utils/__tests__/` のドメイン別配置を指定

## 調査ログ

### 既存Vitest設定の構成

- **きっかけ**: 要件1で「`vitest.config.ts` にテスト設定を追加」の具体的な追加内容を特定する必要があった
- **調査先**: `vitest.config.ts`, `vite.config.ts`, `src/__tests__/vitest-config.test.ts`
- **発見事項**:
  - `vitest.config.ts` は `vite.config` を `mergeConfig` でマージし、`e2e/**` を除外する設定のみ
  - `vite.config.ts` にはテスト設定が含まれていない（分離が正しいことを検証するテストが存在）
  - `environment`, `globals`, `setupFiles` は未設定
- **影響**: `vitest.config.ts` の `test` オブジェクトに3項目を追加する必要がある

### package.json スクリプト構成

- **きっかけ**: 要件1で `test` と `test:watch` スクリプトの定義が必要
- **調査先**: `package.json`
- **発見事項**:
  - 現在 `test`: `vitest`（ウォッチモード）
  - `test:watch` は未定義
  - Issue #2 では `test`: `vitest run`（単発実行）、`test:watch`: `vitest` を期待
- **影響**: `test` スクリプトの値を `vitest run` に変更し、`test:watch` を追加

### テストファイル配置パターン

- **きっかけ**: デッキテストのファイル配置先を決定する必要があった
- **調査先**: 既存テスト（`src/__tests__/`）、テスト計画書、Issue #2
- **発見事項**:
  - 既存テストは `src/__tests__/` に配置（E2E関連のユーティリティテスト）
  - テスト計画書とIssue #2 では `src/utils/__tests__/deck.test.ts` を指定
  - `tsconfig.app.json` は `src/**/__tests__/**` を除外済み（どの階層でも対応可能）
- **影響**: Issue #2 の指定通り `src/utils/__tests__/deck.test.ts` に配置

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク・制限 | 備考 |
|-----------|------|------|-------------|------|
| 既存構成の拡張 | `vitest.config.ts` に設定追加、ドメイン別テストディレクトリ | 既存パターンと一貫性、既存テストが壊れない | なし | 推奨 |

## 設計判断

### 判断: テスト設定ファイルの構成

- **背景**: 要件では当初 `vite.config.ts` への追加を想定していたが、既存プロジェクトは分離構成
- **検討した代替案**:
  1. `vite.config.ts` に統合 — 既存テスト（`vitest-config.test.ts`）の修正が必要
  2. `vitest.config.ts` に追加 — 既存の分離方針を維持
- **選択したアプローチ**: Option 2（`vitest.config.ts` に追加）
- **理由**: 既存の分離方針と一貫性があり、既存テストを壊さない
- **トレードオフ**: 設定が2ファイルに分散するが、各ファイルの責務が明確
- **フォローアップ**: なし

## リスクと軽減策

- `jsdom` インストール時のバージョン互換性 — Vitest v4.x との互換性は確認済み（標準的な組み合わせ）
- `globals: true` 設定がESLintの `no-undef` ルールと競合する可能性 — TypeScript環境では問題なし

## 参考資料

- テスト計画書: `.kiro/specs/validate-game/test-plan.md`（Part 3.1 Vitest導入）
- ギャップ分析: `.kiro/specs/vitest-deck-tests/gap-analysis.md`
