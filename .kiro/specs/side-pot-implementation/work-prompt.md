/kiro-spec-requirements "https://github.com/taku-o/texas-holdem-mini-2/issues/7 に対応してください。
作業用のgit branchを作ってから、要件定義書の作成に取りかかってください。
GitHub CLIが利用できます。"
think.

/kiro-validate-gap side-pot-implementation
/kiro-approve-req

/kiro-spec-design side-pot-implementation
/kiro-validate-design side-pot-implementation

こちらの修正お願いします。
  🔴 Critical Issue 3: 全員フォールド経路でのポット状態リセットが未規定

  Concern: handleAction の「1人以外全員フォールド」経路（Out of Boundary）は変更しない方針だが、その直前までオールインプレイヤーがいた場合、分配後に
  players[].totalContribution がリセットされないと、次ハンド開始まで UI に偽のサイドポット表示が残る懸念。
  Impact: 要件 3.5「ショーダウン処理によってポットが分配された時、ポット表示の合計金額を0にする」が全員フォールド経路で破れる。E2E
  既存テスト（game-flow.spec.ts の $0 検証）は pot=0 だけを見ているので見逃す可能性。
  Suggestion: handleAction の全員フォールド経路で、勝者へのチップ加算後に全プレイヤーの totalContribution を 0 にリセットする旨を明記するか、startNextHand
  で確実に 0 リセットされることを実装注意として明示する。
  Traceability: 3.5
  Evidence: design.md Boundary Commitments / Out of Boundary および useGameEngine（拡張） / Implementation Notes

- Critical Issues 1, 2 も修正する

/kiro-spec-tasks side-pot-implementation
/kiro-review-spec side-pot-implementation

これら修正してください。
  P0（実装前に必須修正）
  1. design.md L42 の GameState.pot 記述を明確化（「データモデル上は保持、但しUI互換のため残す」と書き直し）
  2. tasks.md 5.3 に _Depends: 5.4_ または逆方向を追加し、showdown 両経路の協調を構造的に明示
  3. requirements.md 3.2「金額を示す数値」を具体化（例: /\$\d/ パターンにマッチする表現）、3.6「差分が0」の自動判定基準明示

  P1（実装中の注意で吸収可能）
  4. design.md L523 の「吸収されうるが」を「ベースライン再生成を必須とする」に書き直し
  5. design.md L568 の「実質発生しない」ケースに defensive 実装と最低限のテスト追加を明記
  6. tasks.md 2.2/3.2 のアルゴリズム詳細を要件レベルに寄せる（WHAT重視）

  P2（任意）
  7. requirements.md 4.5-4.7 の HOW 記述を WHAT に近づける
  8. tasks.md に (P) マーカー判定根拠を追記（「共有ファイル依存のため全タスク直列」と明記）

修正してください
  P0（実装前修正推奨）
  1. README.md 更新タスクの追加: tasks.md セクション7 に「7.5 README.md の役判定セクションにサイドポット挙動を追記する」を追加（Agent 6 指摘）
  2. tasks.md 2.1 に defensive テスト 3 件を明示: Unit Tests 13-15（空配列、全員 totalContribution=0、全ポット eligible 0人）を 2.1/3.1
  の詳細バレットに列挙（Agent 5 指摘、design.md との整合）

  P1（任意）
  3. design.md L44 「最小限の追記」を具体化: 「全プレイヤーの totalContribution を 0 にリセットする 1
  操作のみ追加、既存分配ロジックは変更しない」に書き直し（Agent 4 指摘）
  4. requirements.md 2.6 に余り分配ルール追記: 「余りは tied winners の最小インデックスに付与」を要件側にも明記（Agent 5 指摘）

  P2（スタイル・参考）
  5. requirements.md の「If」節に then 補完、システム主体の表記統一
  6. design.md の DRY 違反箇所整理、Non-Goals と Out of Boundary の関係整理

修正して
  任意の軽微調整（実装と並行可能）
  1. tasks.md L120 / L128 の「相互に確認する」を「5.5 統合テスト『両経路での totalContribution/pot リセット検証』で検証される」に統一（Agent 4 指摘）
  2. requirements.md 要件4 の「the 単体テスト shall」を「the ゲームロジック shall ... 検証可能な状態を満たす」に書き直し（Agent 1
  指摘、ただし既存パターンとの整合性も考慮）
  3. design.md の擬似コードを research.md へ移動、または「設計意図の説明 であり実装アルゴリズムではない」と注記（Agent 2 指摘）

takt --task "/kiro-impl side-pot-implementation 1"
/simplify-loop
/kiro-validate-impl side-pot-implementation 1
/kiro-complete-tasks side-pot-implementation 1
commit-push

takt --task "/kiro-impl side-pot-implementation 2"
/kiro-validate-impl side-pot-implementation 2
/simplify-loop
/kiro-complete-tasks side-pot-implementation 2
commit-push

takt --task "/kiro-impl side-pot-implementation 3"
/kiro-validate-impl side-pot-implementation 3
/simplify-loop
/kiro-complete-tasks side-pot-implementation 3
commit-push


takt --task "/kiro-impl side-pot-implementation 4"
/kiro-validate-impl side-pot-implementation 4
/simplify-loop
/kiro-complete-tasks side-pot-implementation 4
/commit-push


takt --task "/kiro-impl side-pot-implementation 5"
/kiro-validate-impl side-pot-implementation 5
/simplify-loop
/kiro-complete-tasks side-pot-implementation 5
/commit-push

takt --task "/kiro-impl side-pot-implementation 6"
/kiro-validate-impl side-pot-implementation 6
/simplify-loop
/kiro-complete-tasks side-pot-implementation 6
/commit-push








