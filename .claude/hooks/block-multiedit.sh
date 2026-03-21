#!/bin/bash
ESCAPED_MESSAGE="ERROR: MultiEditツールの使用はユーザーの許可を取らない限り禁止されています。Editツールを使用してください。"
cat << EOF
{
  "continue": false,
  "stopReason": "${ESCAPED_MESSAGE}",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "${ESCAPED_MESSAGE}"
  }
}
EOF
exit 2
