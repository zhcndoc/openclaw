---
summary: "使用情况追踪界面及凭证要求"
read_when:
  - 你正在连接提供方使用情况/配额界面
  - 你需要解释使用情况追踪行为或身份验证要求
title: "使用情况追踪"
---

## 它是什么

- 直接从提供方的使用端点拉取使用情况/额度。
- 无估算成本；仅显示提供方报告的窗口。
- 人类可读的状态输出被标准化为 `X% left`，即使上游 API 报告的是已消耗额度、剩余额度或仅原始计数。
- 当实时会话快照稀疏时，会话级别的 `/status` 和 `session_status` 可以回退到最新的转录使用条目。该回退机制填充缺失的 Token/缓存计数器，可以恢复活动运行时模型标签，并且当会话元数据缺失或较小时，偏好较大的面向提示的总数。现有的非零实时值仍然优先。

## 显示位置

- 聊天中的 `/status`：包含会话 Token + 估算成本（仅限 API 密钥）的丰富 emoji 状态卡片。当可用时，提供方使用情况会针对**当前模型提供方**显示为标准化的 `X% left` 窗口。
- 聊天中的 `/usage off|tokens|full`：每个响应的使用页脚（OAuth 仅显示 Token）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志聚合的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的每提供方细分。
- CLI：`openclaw channels list` 打印与提供方配置相同的使用快照（使用 `--no-usage` 跳过）。
- macOS 菜单栏：上下文下的“使用情况”部分（仅当可用时）。

## 提供方与凭证

- **Anthropic (Claude)**：身份验证配置文件中的 OAuth 令牌。
- **GitHub Copilot**：身份验证配置文件中的 OAuth 令牌。
- **Gemini CLI**：身份验证配置文件中的 OAuth 令牌。
  - JSON 使用情况回退到 `stats`；`stats.cached` 被标准化为 `cacheRead`。
- **OpenAI Codex**：身份验证配置文件中的 OAuth 令牌（存在时使用 accountId）。
- **MiniMax**：API 密钥或 MiniMax OAuth 身份验证配置文件。OpenClaw 将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为相同的 MiniMax 额度范畴，优先使用存储的 MiniMax OAuth（如果存在），否则回退到 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示**剩余**额度，因此 OpenClaw 在显示前将其反转；基于计数的字段在存在时优先。
  - 编码计划窗口标签来自提供方的 hours/minutes 字段（如果存在），然后回退到 `start_time` / `end_time` 跨度。
  - 如果编码计划端点返回 `model_remains`，OpenClaw 优先使用聊天模型条目，当显式的 `window_hours` / `window_minutes` 字段缺失时从时间戳派生窗口标签，并将模型名称包含在计划标签中。
- **Xiaomi MiMo**：通过 env/config/auth 存储的 API 密钥（`XIAOMI_API_KEY`）。
- **z.ai**：通过 env/config/auth 存储的 API 密钥。

当无法解析出可用的提供方使用身份验证时，将隐藏使用情况。提供方可以提供插件特定的使用身份验证逻辑；否则，OpenClaw 会回退到匹配身份验证配置文件、环境变量或配置中的 OAuth/API 密钥凭证。

## 相关内容

- [Token use and costs](/reference/token-use)
- [API usage and costs](/reference/api-usage-costs)
- [Prompt caching](/reference/prompt-caching)
