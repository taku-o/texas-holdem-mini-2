/kiro:spec-requirements "https://github.com/taku-o/texas-holdem-mini-2/issues/4 に対応してください。
作業用のgit branchを作ってから、要件定義書の作成に取りかかってください。
GitHub CLIが利用できます。"
think.

この問題を修正してください
  🔴 Critical Issue 1: applyActionのシグネチャが現在の実装と乖離している

  Concern: 設計書のapplyAction(players, playerIndex, action, amount, pot, currentBet)は6引数の関数だが、要件定義書（Requirement
  4）ではapplyAction(state, action, amount)と記載されている。Issue #4の記述もapplyAction(state, action,
  amount)である。設計書のシグネチャは要件・Issueと不整合。

  Impact: 要件定義書やIssueの記述と設計書が矛盾しており、実装時にどちらに従うべきか混乱が生じる。テスト仕様（Requirement
  7）もこのシグネチャに依存する。

  Suggestion: 要件定義書のapplyAction(state, action, amount)に合わせるか、設計書の6引数版を採用する場合は要件定義書を更新する。6引数版の方が
  テストしやすい（GameState全体を構築する必要がない）メリットがあるため、設計書のシグネチャを採用し要件定義書を更新する方向が妥当。


推奨改善は直しておきましょう。修正お願いします。

