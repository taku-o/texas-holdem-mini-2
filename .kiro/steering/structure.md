# プロジェクト構成

## 構成方針

レイヤー分離型。UIコンポーネント、ゲームロジック（カスタムフック・ユーティリティ）、型定義を明確に分離する。

## ディレクトリパターン

### UIコンポーネント
**場所**: `src/components/`
**目的**: 表示専用のReactコンポーネント
**例**: `Card.tsx`, `Table.tsx`, `Player.tsx`, `Controls.tsx`

### ゲームロジック（カスタムフック）
**場所**: `src/hooks/`
**目的**: ゲーム状態管理とロジック
**例**: `useGameEngine.ts` — ゲーム全体の状態管理・フェーズ遷移・CPU AI

### ユーティリティ
**場所**: `src/utils/`
**目的**: 純粋関数のヘルパー（状態を持たない）
**例**: `deck.ts`（デッキ生成・シャッフル）、`evaluator.ts`（ハンド評価）

### 型定義
**場所**: `src/types/`
**目的**: 共有のTypeScript型・インターフェース定義
**例**: `index.ts` — `PlayingCard`, `Player`, `Suit`, `Rank` 等

## 命名規則

- **コンポーネントファイル**: PascalCase（`Card.tsx`, `Table.tsx`）
- **フック**: camelCase、`use`プレフィックス（`useGameEngine.ts`）
- **ユーティリティ**: camelCase（`deck.ts`, `evaluator.ts`）
- **型定義**: PascalCase（`PlayingCard`, `Player`）

## インポート構成

```typescript
// React / 外部ライブラリ
import React from 'react';
import type { PlayingCard } from '../types';

// 内部モジュール（相対パス）
import { createAndShuffleDeck } from '../utils/deck';
import { evaluateHand } from '../utils/evaluator';
```

相対パスのみ使用。パスエイリアスは未設定。

## コード構成原則

- コンポーネントはprops経由で状態を受け取る（表示責務のみ）
- ゲームロジックは`useGameEngine`フックに集約
- ユーティリティ関数は純粋関数として実装
- 型定義は`src/types/index.ts`に集約
