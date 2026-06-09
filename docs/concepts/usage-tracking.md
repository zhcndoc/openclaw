---
summary: "使用情况跟踪界面和凭据要求"
read_when:
  - 当你正在接入提供方使用量/配额界面时
  - 你需要解释使用情况跟踪行为或认证要求时
title: "使用情况跟踪"
---

## 它是什么

- 直接从提供方的使用量端点拉取使用量/配额。
- 不估算成本；只显示提供方报告的配额窗口或账户状态摘要。
- 面向人类可读的配额窗口状态输出会标准化为 `X% left`，即使上游 API 报告的是已用配额、剩余配额或仅原始计数。没有可重置配额窗口的提供方可以改为显示提供方摘要文本，例如余额。
- 会话级 `/status` 和 `session_status` 在实时会话快照信息稀疏时，可以回退到最新的 transcript 使用量条目。该回退会补全缺失的 token/cache 计数，能够恢复当前运行时模型标签，并且在会话元数据缺失或更小时，优先采用更大的面向 prompt 的总数。现有的非零实时值仍然优先。

## 显示位置

- 聊天中的 `/status`：带表情的状态卡，显示会话 token + 估算成本（仅 API key）。当可用时，提供方使用量会显示为当前模型提供方的标准化 `X% left` 窗口或提供方摘要文本。
- 聊天中的 `/usage off|tokens|full`：每条响应的使用量页脚（OAuth 仅显示 token）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志汇总的本地成本摘要。
- CLI：`openclaw status --usage` 打印完整的按提供方细分信息。
- CLI：`openclaw channels list` 会在提供方配置旁打印相同的使用量快照（使用 `--no-usage` 可跳过）。
- macOS 菜单栏：Context 下的“Usage”部分（仅在可用时）。

## 提供方 + 凭据

- **Anthropic (Claude)**：auth profiles 中的 OAuth tokens。
- **GitHub Copilot**：auth profiles 中的 OAuth tokens。
- **Gemini CLI**：auth profiles 中的 OAuth tokens。
  - JSON 使用量会回退到 `stats`；`stats.cached` 会标准化为
    `cacheRead`。
- **OpenAI Codex**：auth profiles 中的 OAuth tokens（存在时使用 accountId）。
- **MiniMax**：API key 或 MiniMax OAuth auth profile。OpenClaw 将
  `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额
  界面，优先使用已存储的 MiniMax OAuth（如果存在），否则回退到
  `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  使用量轮询会在配置了
  `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl`
  时从中推导 Coding Plan 主机，否则使用 MiniMax CN 主机。
  MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示**剩余**
  配额，因此 OpenClaw 在显示前会对其取反；若存在基于计数的字段，则以其为准。
  - Coding-plan 窗口标签会优先取提供方的 hours/minutes 字段，
    然后再回退到 `start_time` / `end_time` 区间。
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先选择
    chat-model 条目；当显式 `window_hours` / `window_minutes` 字段不存在时，
    会根据时间戳推导窗口标签，并在 plan 标签中包含模型名称。
- **Xiaomi MiMo**：通过 env/config/auth store 的 API key（`XIAOMI_API_KEY`）。
- **z.ai**：通过 env/config/auth store 的 API key。
- **DeepSeek**：通过 env/config/auth store 的 API key（`DEEPSEEK_API_KEY`）。
  OpenClaw 会调用 DeepSeek 的余额端点，并将提供方报告的余额显示为文本，
  而不是百分比剩余配额窗口。

当无法解析出可用的提供方使用情况认证时，使用情况会被隐藏。提供方
可以提供插件特定的使用情况认证逻辑；否则 OpenClaw 会回退到通过 auth profiles、
环境变量或配置匹配 OAuth/API key 凭据。

## 相关内容

- [Token 使用量和成本](/reference/token-use)
- [API 使用量和成本](/reference/api-usage-costs)
- [Prompt 缓存](/reference/prompt-caching)
