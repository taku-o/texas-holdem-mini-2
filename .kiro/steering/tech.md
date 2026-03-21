# 技術スタック

## アーキテクチャ

クライアントサイドのみのSPA（Single Page Application）。サーバーサイドは存在しない。ゲームロジックはすべてブラウザ上のReact状態管理で完結する。

## コア技術

- **言語**: TypeScript（strictモード）
- **フレームワーク**: React 19
- **ビルドツール**: Vite 8
- **スタイリング**: Tailwind CSS 4（Viteプラグイン経由）

## 主要ライブラリ

- React 19 + React DOM（UI）
- Tailwind CSS 4（ユーティリティファーストCSS）
- 外部のゲームロジックライブラリは使用していない（自前実装）

## 開発標準

### 型安全

- TypeScript strictモード有効
- `noUnusedLocals`, `noUnusedParameters` 有効
- `verbatimModuleSyntax` 有効（型インポートには `import type` を使用）

### コード品質

- ESLint 9 + React Hooks / React Refresh プラグイン

## 開発環境

### 共通コマンド

```bash
# 開発サーバー起動: npm run dev
# ビルド: npm run build
# Lint: npm run lint
# プレビュー: npm run preview
```

## 主要な技術的判断

- **状態管理**: 外部ライブラリを使わずReactの`useState` + カスタムフック（`useGameEngine`）で管理
- **ゲームフェーズ遷移**: `setTimeout`で遅延を入れたフェーズ遷移（CPU思考時間の演出）
- **パスエイリアス**: 未使用（相対パスインポート）
