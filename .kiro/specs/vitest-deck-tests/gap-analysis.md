# ギャップ分析: Vitest環境構築 + デッキテスト

## 分析サマリー

- **Vitestは既にインストール済み**で、`vitest.config.ts` も存在する。ただし要件で求められる設定項目の一部が不足している。
- **jsdomは未インストール**。devDependencyへの追加が必要。
- **`src/test/setup.ts` は未作成**。
- **`package.json` のスクリプト構成が要件と異なる**: 現在 `test` は `vitest`（ウォッチモード）を実行するが、要件では `vitest run` を期待。`test:watch` スクリプトは未定義。
- **デッキのテスト (`src/utils/__tests__/deck.test.ts`) は未作成**。テスト対象の `src/utils/deck.ts` は存在し、問題なく動作する状態。

---

## 1. 現状調査

### 既存アセット

| アセット | 状態 | 備考 |
|---------|------|------|
| `vitest` パッケージ | インストール済み (v4.1.1) | devDependency |
| `jsdom` パッケージ | **未インストール** | 要件1で必要 |
| `vitest.config.ts` | 存在する | `vite.config` をマージし、e2eディレクトリを除外 |
| `vite.config.ts` | 存在する（テスト設定なし） | 設定分離済み（正しい構成） |
| `src/test/setup.ts` | **未作成** | 要件1で必要 |
| `src/utils/deck.ts` | 存在する | テスト対象。`createDeck`, `shuffleDeck`, `createAndShuffleDeck` をエクスポート |
| `src/types/index.ts` | 存在する | `Suit`, `Rank`, `PlayingCard` 型定義 |
| `src/__tests__/` | 存在する（5ファイル） | E2E関連のVitestテスト（設定検証・ヘルパーテスト等） |
| `src/utils/__tests__/` | **未作成** | デッキテストの配置先 |
| `tsconfig.app.json` | テストファイル除外済み | `src/**/*.test.ts`, `src/**/__tests__/**` を除外 |

### 既存の規約

- **テスト配置**: `src/__tests__/` ディレクトリに配置する規約（既存テストがこのパターン）
- **設定分離**: `vite.config.ts` と `vitest.config.ts` を分離する設計方針（既存テストで検証済み）
- **テスト記述言語**: テスト名は日本語で記述（既存テスト `vitest-config.test.ts` の `describe`/`test` 名が日本語）
- **import**: `vitest` から `describe`, `test`, `expect` 等を明示的にimport

### package.json スクリプト現状

| スクリプト | 現在の定義 | 要件での期待値 |
|-----------|-----------|--------------|
| `test` | `vitest`（ウォッチモード） | `vitest run`（単発実行） |
| `test:watch` | **未定義** | `vitest`（ウォッチモード） |

---

## 2. 要件実現可能性分析

### 要件 1: Vitest環境構築

| 受け入れ基準 | 現状 | ギャップ |
|-------------|------|---------|
| `vitest` と `jsdom` のインストール | `vitest` 済み、`jsdom` **未** | **Missing**: jsdomのインストール |
| `vite.config.ts` にテスト設定追加 | 分離済み（`vitest.config.ts`） | **要確認**: 要件文言は `vite.config.ts` だが、既存プロジェクトは `vitest.config.ts` に分離。どちらに合わせるか判断が必要 |
| `test` スクリプト（`vitest run`） | `vitest`（ウォッチモード）で定義 | **Missing**: `vitest run` に変更 |
| `test:watch` スクリプト | 未定義 | **Missing**: 追加が必要 |
| `src/test/setup.ts` の作成 | 未作成 | **Missing**: 新規作成が必要 |

#### 設定構成に関する重要な判断ポイント

既存プロジェクトでは `vitest.config.ts` を `vite.config.ts` から分離する設計方針が採用されており、これを検証する既存テスト（`vitest-config.test.ts`）も存在する。要件では「`vite.config.ts` にテスト設定追加」と記載されているが、既存の分離方針に従い `vitest.config.ts` に設定を追加する方が一貫性がある。

### 要件 2: デッキ生成のテスト

| 受け入れ基準 | 現状 | ギャップ |
|-------------|------|---------|
| `.length` = 52 の検証 | テスト未作成 | **Missing**: 新規作成 |
| 重複なし（Set.size = 52）の検証 | テスト未作成 | **Missing**: 新規作成 |
| スート別カウント（各13枚）の検証 | テスト未作成 | **Missing**: 新規作成 |
| ランク別カウント（各4枚）の検証 | テスト未作成 | **Missing**: 新規作成 |

### 要件 3: デッキシャッフルのテスト

| 受け入れ基準 | 現状 | ギャップ |
|-------------|------|---------|
| シャッフル後 `.length` = 52 の検証 | テスト未作成 | **Missing**: 新規作成 |

### 複雑度シグナル

- テスト対象は**純粋関数**（`createDeck`, `shuffleDeck`）であり、副作用やUI依存がない
- テストロジックは**シンプルなアサーション**のみ（CRUD以下の単純さ）
- 既存のVitestテストパターンに従えば良い

---

## 3. 実装アプローチ

### Option A: 既存構成の拡張（推奨）

既存の `vitest.config.ts` 分離構成を維持しつつ、不足分を追加する。

- `jsdom` をインストール
- `vitest.config.ts` に `environment: 'jsdom'`, `globals: true`, `setupFiles` を追加
- `package.json` のスクリプトを修正（`test` → `vitest run`, `test:watch` → `vitest`）
- `src/test/setup.ts` を新規作成
- `src/utils/__tests__/deck.test.ts` を新規作成

**トレードオフ**:
- 既存の設定分離方針と一貫性がある
- 既存テスト（`vitest-config.test.ts`）が `vitest.config.ts` の存在を前提としている
- 要件文言の「`vite.config.ts` に追加」とは若干異なるが、実質的に同等

### Option B: vite.config.ts に統合

テスト設定を `vite.config.ts` に直接追加し、`vitest.config.ts` を廃止する。

**トレードオフ**:
- 要件文言に忠実
- 既存テスト（`vitest-config.test.ts`）の修正が必要
- 既存の設計方針（設定分離）を崩す

---

## 4. 工数・リスク

- **工数**: **S**（1日以内）— 既存パターンに沿った軽微な追加作業
- **リスク**: **Low** — 既存テスト基盤を拡張するだけ。テスト対象は純粋関数。UIへの影響なし

---

## 5. 設計フェーズへの推奨事項

- **推奨アプローチ**: Option A（既存構成の拡張）
- **判断が必要な項目**: 要件1の「`vite.config.ts` にテスト設定追加」を `vitest.config.ts` への追加と解釈してよいか
- **Research Needed**: なし
