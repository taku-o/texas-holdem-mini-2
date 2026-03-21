#!/bin/bash

# 標準入力からJSONを読み取る
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

HOOK_STOP_WORDS_PATH="$PROJECT_DIR/.cursor/hooks/stop_words_rules.json"

# トランスクリプトを処理（.jsonl形式に対応）
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path')
if [ -f "$TRANSCRIPT_PATH" ]; then
    # 最後のアシスタントメッセージのみを取得
    LAST_MESSAGE=$(tac "$TRANSCRIPT_PATH" | while IFS= read -r line; do
        if echo "$line" | jq -e '.type == "assistant"' >/dev/null 2>&1; then
            echo "$line" | jq -r '.message.content[] | select(.type == "text") | .text'
            break
        fi
    done)

    # hook_stop_words.jsonが存在する場合のみ処理
    if [ -f "$HOOK_STOP_WORDS_PATH" ]; then
        # 各ルールをループ処理
        RULES=$(jq -r 'keys[]' "$HOOK_STOP_WORDS_PATH")
        for RULE_NAME in $RULES; do
            # キーワード配列を取得
            KEYWORDS=$(jq -r ".\"$RULE_NAME\".keywords[]" "$HOOK_STOP_WORDS_PATH" 2>/dev/null)
            MESSAGE=$(jq -r ".\"$RULE_NAME\".message" "$HOOK_STOP_WORDS_PATH" 2>/dev/null)

            # 各キーワードをチェック
            for keyword in $KEYWORDS; do
                if echo "$LAST_MESSAGE" | grep -q "$keyword"; then
                    # エラーメッセージを構成
                    ERROR_MESSAGE=$(cat << EOF
！！！注意！！！ NGワードを読み返すと、それがまたNGワードに引っかかってしまうよ

❌ エラー: AIの発言に「 $keyword 」が含まれています。

ルール: $RULE_NAME
メッセージ: $MESSAGE

作業を中止し、ルールに従って計画を見直してください。
EOF
)
                    # 色を適用
                    COLORED_MESSAGE=$(printf "\033[91m%s\033[0m" "$ERROR_MESSAGE")

                    # blockレスポンスを返す（jqで適切にJSON生成、二重エスケープを回避）
                    echo "{}" | jq \
                      --arg reason "$COLORED_MESSAGE" \
                      '{
                        "decision": "block",
                        "reason": $reason
                      }'
                    exit 1
                fi
            done
        done
    fi
fi

# キーワードが見つからなければ正常終了
echo '{"decision": "approve"}'
exit 0
