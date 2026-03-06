---
summary: "使用情况追踪界面及凭证要求"
read_when:
  - 你正在接入提供方使用情况/额度界面
  - 你需要解释使用追踪行为或身份验证要求
title: "使用情况追踪"
---

# 使用情况追踪

## 什么是使用情况追踪

- 直接从提供方的使用情况端点拉取使用/额度数据。
- 不包含预估费用；仅显示提供方报告的时间窗口数据。

## 显示位置

- 聊天中的 `/status`：带有表情丰富状态卡，显示会话令牌 + 预估费用（仅 API 密钥）。当可用时，显示**当前模型提供方**的使用情况。
- 聊天中的 `/usage off|tokens|full`：每条响应的使用脚注（OAuth 仅显示令牌数）。
- 聊天中的 `/usage cost`：基于 OpenClaw 会话日志聚合的本地费用汇总。
- 命令行界面（CLI）：`openclaw status --usage` 打印详细按提供方分解的使用信息。
- 命令行界面（CLI）：`openclaw channels list` 与提供方配置一起打印相同的使用快照（使用 `--no-usage` 可跳过）。
- macOS 菜单栏：“上下文”中的“使用情况”部分（仅当可用时显示）。

## 提供方与凭证

- **Anthropic (Claude)**：认证配置中的 OAuth 令牌。
- **GitHub Copilot**：认证配置中的 OAuth 令牌。
- **Gemini CLI**：认证配置中的 OAuth 令牌。
- **Antigravity**：认证配置中的 OAuth 令牌。
- **OpenAI Codex**：认证配置中的 OAuth 令牌（存在时使用 accountId）。
- **MiniMax**：API 密钥（编码计划密钥；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小时编码计划时间窗口。
- **z.ai**：通过环境变量/配置/认证存储的 API 密钥。

若不存在匹配的 OAuth/API 凭证，则隐藏使用情况信息。
