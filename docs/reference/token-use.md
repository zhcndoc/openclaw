---
summary: "OpenClaw 如何构建提示上下文并报告令牌使用情况与费用"
read_when:
  - 解释令牌使用、费用或上下文窗口时
  - 调试上下文增长或压缩行为时
title: "令牌使用和费用"
---

# 令牌使用和费用

OpenClaw 跟踪的是**令牌（tokens）**，而非字符。令牌是针对模型定制的，但大多数 OpenAI 式模型处理英文文本时，平均每个令牌约包含 ~4 个字符。

## 系统提示如何构建

OpenClaw 每次运行时都会组装自己的系统提示，内容包括：

- 工具列表 + 简短描述
- 技能列表（仅元数据；指令通过 `read` 按需加载）
- 自更新指令
- 工作空间 + 启动文件（新建时包括 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`，存在时包括 `MEMORY.md`，小写回退为 `memory.md`）。大型文件会被 `agents.defaults.bootstrapMaxChars`（默认：20000）截断，启动注入总大小受 `agents.defaults.bootstrapTotalMaxChars`（默认：150000）限制。`memory/*.md` 文件通过记忆工具按需加载，不会自动注入。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考状态）

完整细节见 [系统提示](/concepts/system-prompt)。

## 上下文窗口计数内容

模型接收到的所有内容都计入上下文限制：

- 系统提示（上述所有部分）
- 会话历史（用户与助理消息）
- 工具调用及工具返回结果
- 附件/转录（图片、音频、文件）
- 压缩摘要及修剪产物
- 服务提供者包装层或安全头（不可见，但计数）

对于图片，OpenClaw 会在调用提供者之前对转录或工具图像数据做降采样。
可用 `agents.defaults.imageMaxDimensionPx`（默认：`1200`）调整：

- 较低值通常减少视觉令牌使用和传输大小。
- 较高值保留更多视觉细节，适合 OCR 或界面密集截图。

欲获取实际明细（按注入文件、工具、技能及系统提示大小划分），请使用 `/context list` 或 `/context detail`。详见 [上下文](/concepts/context)。

## 如何查看当前令牌使用

聊天中可使用：

- `/status` → 显示带有会话模型、上下文使用量、最近的输入/输出令牌数及**预测费用**（仅 API Key 可见）的**颜文字状态卡片**。
- `/usage off|tokens|full` → 在每条回复尾部附加**每次响应的使用情况汇总**。
  - 会话持续有效（存储为 `responseUsage`）。
  - OAuth 认证下**隐藏费用**（只显示令牌数）。
- `/usage cost` → 显示 OpenClaw 会话日志中的本地费用汇总。

其他界面支持：

- **TUI/Web TUI：** 支持 `/status` 与 `/usage`。
- **CLI：** 可用 `openclaw status --usage` 和 `openclaw channels list` 查看服务商配额窗口（非每次响应费用）。

## 费用估算（显示时）

费用基于你的模型定价配置估算：

```
models.providers.<provider>.models[].cost
```

此处为每 100 万令牌的美元费用，针对 `input`、`output`、`cacheRead` 和 `cacheWrite`。如果缺少定价信息，OpenClaw 只显示令牌数。OAuth 认证的令牌永远不显示美元费用。

## 缓存 TTL 和修剪影响

服务商的提示缓存仅在缓存 TTL 窗口内有效。OpenClaw 还可选择运行**缓存 TTL 过期修剪**：当缓存 TTL 到期后，修剪会话，然后重置缓存窗口，使后续请求可重复使用刚刚缓存的新上下文，避免全量重新缓存历史，从而降低缓存写入成本，尤其在会话闲置过长时。

可在 [网关配置](/gateway/configuration) 中设置，行为细节见 [会话修剪](/concepts/session-pruning)。

心跳机制可使缓存在空闲间隙保持“热”状态。若模型缓存 TTL 是 `1h`，将心跳间隔设置略低于该值（如 `55m`）可避免重新缓存整个提示，节约缓存写入成本。

多智能体环境中，可共用一份模型配置，并通过 `agents.list[].params.cacheRetention` 针对单个智能体调整缓存策略。

详尽操作指南见 [提示缓存](/reference/prompt-caching)。

Anthropic API 费用方面，缓存读成本远低于输入令牌，缓存写成本则按更高倍数计费。最新费率和 TTL 乘数见 Anthropic 官方文档：[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：用心跳保持 1 小时缓存“热”状态

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 示例：混合流量下的每智能体缓存策略

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # 大多数智能体的默认基线
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # 深度会话保持长缓存热状态
    - id: "alerts"
      params:
        cacheRetention: "none" # 突发通知避免缓存写入
```

`agents.list[].params` 会叠加于所选模型的 `params`，因此你只需覆盖 `cacheRetention`，其他模型默认参数保持不变。

### 示例：启用 Anthropic 1M 上下文测试版请求头

Anthropic 的 100 万上下文窗口目前处于测试版本。OpenClaw 可在启用支持 Opus 或 Sonnet 模型上的 `context1m` 后注入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这对应 Anthropic 的 `context-1m-2025-08-07` 测试版请求头。

仅当模型条目设置 `context1m: true` 时生效。

要求：凭证必须具备长上下文使用资格（API Key 计费，或开启额外使用的订阅）。否则 Anthropic 会返回 `HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

如果使用 OAuth/订阅令牌认证 Anthropic (`sk-ant-oat-*`)，OpenClaw 会跳过 `context-1m-*` 测试版请求头，因为 Anthropic 当前拒绝这种组合并返回 HTTP 401。

## 减少令牌压力的建议

- 使用 `/compact` 概括长会话。
- 在工作流中尽量裁剪大型工具输出。
- 针对截图密集会话，调低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会注入提示中）。
- 在冗长、探索性工作时优先选择较小模型。

详情请参见 [技能](/tools/skills) 中的技能列表开销公式。
