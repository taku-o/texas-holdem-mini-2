#!/bin/bash
# PreToolUse hook - コマンド実行前のチェック

INPUT=$(cat)

# プロジェクトルートを取得（環境変数またはスクリプトの場所から推測）
if [ -n "$CURSOR_PROJECT_DIR" ]; then
    PROJECT_DIR="$CURSOR_PROJECT_DIR"
elif [ -n "$CLAUDE_PROJECT_DIR" ]; then
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
else
    # スクリプトの場所からプロジェクトルートを推測
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

HOOK_PRE_COMMANDS_PATH="$PROJECT_DIR/.cursor/hooks/stop_commands_rules.json"

# ツール名を取得
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

# Bashツールの場合のみチェック
if [ "$TOOL_NAME" = "Bash" ]; then
    # コマンドを取得
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

    if [ -n "$COMMAND" ] && [ -f "$HOOK_PRE_COMMANDS_PATH" ]; then
        # 各ルールをループ処理
        RULES=$(jq -r 'keys[]' "$HOOK_PRE_COMMANDS_PATH")
        for RULE_NAME in $RULES; do
            # コマンド配列を取得
            COMMANDS=$(jq -r ".\"$RULE_NAME\".commands[]" "$HOOK_PRE_COMMANDS_PATH" 2>/dev/null)
            MESSAGE=$(jq -r ".\"$RULE_NAME\".message" "$HOOK_PRE_COMMANDS_PATH" 2>/dev/null)

            # 各禁止コマンドをチェック
            for blocked_cmd in $COMMANDS; do
                if echo "$COMMAND" | grep -qF "$blocked_cmd"; then
                    # エラーメッセージを構成
                    ERROR_MESSAGE=$(cat << EOF
❌ エラー: 禁止されたコマンド「 $blocked_cmd 」が検出されました。

ルール: $RULE_NAME
メッセージ: $MESSAGE

検出されたコマンド:
$COMMAND

このコマンドの実行は許可されていません。
EOF
)
                    # 色を適用
                    COLORED_MESSAGE=$(printf "\033[91m%s\033[0m" "$ERROR_MESSAGE")

                    # blockレスポンスを返す（jqで適切にJSON生成、二重エスケープを回避）
                    echo "{}" | jq \
                      --arg reason "$COLORED_MESSAGE" \
                      '{
                        "continue": false,
                        "stopReason": $reason,
                        "hookSpecificOutput": {
                          "hookEventName": "PreToolUse",
                          "permissionDecision": "deny",
                          "permissionDecisionReason": $reason
                        }
                      }'
                    exit 1
                fi
            done
        done
    fi
fi

# 問題なければ承認
echo '{"continue":true}'
exit 0
