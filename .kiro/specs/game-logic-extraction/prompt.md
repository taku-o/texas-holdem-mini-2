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


次の2点を修正してください。
  2. calculateBlindsのdealerIndexの意味が曖昧 (design.md:220, gap-analysis.md:83)
    - 設計書では「dealerIndexは前回のディーラーインデックスを受け取り、次のディーラーから計算する」、ギャップ分析では「初回は-1」とあるが、
  タスクリストでは「前回のディーラーインデックス」としか記載がない。初回（-1）の挙動をタスクの説明に含めた方が実装時の混乱を防げる

  4. isRoundOverのオールインプレイヤーの扱い (tasks.md:688)
    - タスク1.2に「オールインプレイヤー（チップ0）はアクション不要として扱う」とあるが、要件定義書のRequirement
  2の受け入れ基準にはこの条件が明示されていない。要件とタスクの間にギャップがある


推奨改善、
専門家観点レビューの注意事項、
クロスドキュメント整合性の問題点
は修正しましょう。
対応してください。


update pr


こちらを修正してください。
  4. 設計書のadvancePhase置き換えに関する記述（重要度: 低）

  - design.md:254でadvancePhase内のfirstToAct計算をgetNextActivePlayer呼び出しに置き換えると記載
  - tasks.md:776でも同様の記述あり
  - この変更は% 5ハードコード解消の一環だが、設計書のComponents and
  InterfacesセクションのuseGameEngine.ts説明には明記されていない。Implementation Notesに追記があると実装時の参照がスムーズ


takt --task "/kiro:spec-impl game-logic-extraction 1"
takt --task "/kiro:spec-impl game-logic-extraction 2"
takt --task "/kiro:spec-impl game-logic-extraction 3"
takt --task "/kiro:spec-impl game-logic-extraction 4"


/review 12
指摘事項について修正お願いします。




