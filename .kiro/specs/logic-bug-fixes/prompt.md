/kiro:spec-requirements "https://github.com/taku-o/texas-holdem-mini-2/issues/5 に対応してください。
作業用のgit branchを作ってから、要件定義書の作成に取りかかってください。
GitHub CLIが利用できます。"
think.

こちら修正してくれますか？
4件すべてが既存ファイルへの小規模な変更（1-3行の修正）で対応可能

/kiro:spec-tasks logic-bug-fixes

/simplify-loop

/kiro-review-spec logic-bug-fixes


これらの問題を修正してください。
  requirements.md

  軽微な問題（推奨改善）
  1. 一部の受け入れ基準がHOW（実装方法）を記述している — 要件2.1「重複除去後のランク値を降順にソートしてからストレート判定を行う」や要件3.1
  「ループ回数がプレイヤー数を超えた場合にループを終了する」は、期待される振る舞い（WHAT）ではなく修正手法（HOW）を記述している。WHAT例:
  「入力カードの順序に関係なくストレートを正しく検出する」「有限時間内に結果を返す」
  2. 導入セクションの見出し — 「プロジェクト説明 (入力)」はテンプレートの「Introduction」と異なる。機能上問題はないが統一性の観点。

  design.md

  軽微な問題（推奨改善）
  1. Error Handlingセクションが欠落 — テンプレートで定義されているError Handling戦略セクションが存在しない。純粋関数のバグ修正であり重大では
  ないが、getNextActivePlayerが-1を返す新しいエラーケースに関する伝播方針は本文中に記載があるとよい
  2. getNextActivePlayerの-1返却の安全性をresearch.mdに委譲 — 「呼び出し元の影響: 調査の結果、-1返却は既存フローで安全（research.md参照）」
  とあるが、設計書はself-containedであるべき（テンプレート指針）。要点を設計書内に記載する方がレビュアーに親切

/commit-commands:commit-push-pr
/review 13



