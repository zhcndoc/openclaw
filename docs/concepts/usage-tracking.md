---
summary: "使用情况跟踪界面和凭据要求"
read_when:
  - 当你正在接入提供方使用量/配额界面时
  - 你需要解释使用情况跟踪行为或认证要求时
title: "使用情况跟踪"
---

## 它是什么

- 直接从提供方的使用量/配额端点拉取数据。
- 不估算成本；只使用提供方报告的窗口。
- 人类可读的状态输出会标准化为 `X% left`，即使上游 API 报告的是已消耗配额、剩余配额，或者仅仅是原始计数。
- 会话级 `/status` 和 `session_status` 在实时会话快照信息稀疏时，可以回退到最近的 transcript 使用条目。该回退会补全缺失的 token/cache 计数，能够恢复活动运行时模型标签，并且在会话元数据缺失或更小时，优先选择更大的、面向 prompt 的总数。现有的非零实时值仍然优先。

## 显示位置

- 聊天中的 `/status`：带 emoji 的状态卡，显示会话 token + 预估成本（仅 API key）。在可用时，提供方使用情况会以标准化的 `X% left` 窗口显示给 **当前模型提供方**。
- 聊天中的 `/usage off|tokens|full`：每次响应的使用情况页脚（OAuth 仅显示 token）。
- 聊天中的 `/usage cost`：从 OpenClaw 会话日志聚合得出的本地成本摘要。
- CLI：`openclaw status --usage` 会打印完整的按提供方拆分情况。
- CLI：`openclaw channels list` 会在提供方配置旁边打印相同的使用情况快照（使用 `--no-usage` 可跳过）。
- macOS 菜单栏：Context 下的“Usage”部分（仅在可用时）。

## 提供方 + 凭据

- **Anthropic（Claude）**：auth profiles 中的 OAuth token。
- **GitHub Copilot**：auth profiles 中的 OAuth token。
- **Gemini CLI**：auth profiles 中的 OAuth token。
  - JSON 使用情况会回退到 `stats`；`stats.cached` 会被标准化为
    `cacheRead`。
- **OpenAI Codex**：auth profiles 中的 OAuth token（在存在时使用 `accountId`）。
- **MiniMax**：API key 或 MiniMax OAuth auth profile。OpenClaw 将
  `minimax`、`minimax-cn` 和 `minimax-portal` 视为相同的 MiniMax 配额
  界面，优先使用已存储的 MiniMax OAuth（如果存在），否则回退到
  `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示**剩余**
  配额，因此 OpenClaw 在显示前会将其取反；当存在基于计数的字段时，
  以计数字段为准。
  - coding-plan 窗口标签优先来自提供方的 hours/minutes 字段，
    然后回退到 `start_time` / `end_time` 区间。
  - 如果 coding-plan 端点返回 `model_remains`，OpenClaw 会优先选择
    chat-model 条目；在显式 `window_hours` / `window_minutes` 字段缺失时，
    会根据时间戳推导窗口标签，并在 plan 标签中包含模型名称。
- **Xiaomi MiMo**：通过 env/config/auth store 的 API key（`XIAOMI_API_KEY`）。
- **z.ai**：通过 env/config/auth store 的 API key。

当无法解析出可用的提供方使用情况认证时，使用情况会被隐藏。提供方
可以提供插件特定的使用情况认证逻辑；否则 OpenClaw 会回退到通过 auth profiles、
环境变量或配置匹配 OAuth/API key 凭据。

## 相关内容

- [Token 使用量和成本](/reference/token-use)
- [API 使用量和成本](/reference/api-usage-costs)
- [Prompt 缓存](/reference/prompt-caching)
