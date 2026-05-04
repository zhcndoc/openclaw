---
summary: "OpenClaw 中实验性标志的含义，以及当前已文档化的标志"
title: "实验性功能"
read_when:
  - 你看到一个 `.experimental` 配置键，并想知道它是否稳定
  - 你想尝试预览版运行时功能，而不把它们与普通默认值混淆
  - 你想在一个地方找到当前已文档化的实验性标志
---

OpenClaw 中的实验性功能是**可选启用的预览能力**。它们位于显式标志之后，因为在配得上稳定默认值或长期公开契约之前，它们仍然需要更多真实世界的使用验证。

将它们与普通配置区别对待：

- 除非相关文档告诉你去尝试某个功能，否则保持它们**默认关闭**。
- 预期其**形态和行为变化**会比稳定配置更快。
- 如果已经存在稳定路径，优先使用稳定路径。
- 如果你要在更大范围内推广 OpenClaw，请先在较小环境中测试实验性标志，然后再将它们纳入共享基线。

## 当前已文档化的标志

| Surface                  | Key                                                       | Use it when                                                                                                    | More                                                                                          |
| ------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 本地模型运行时           | `agents.defaults.experimental.localModelLean`             | 更小或更严格的本地后端在处理 OpenClaw 的完整默认工具集时无法正常工作                                             | [本地模型](/gateway/local-models)                                                             |
| 内存搜索                 | `agents.defaults.memorySearch.experimental.sessionMemory` | 你希望 `memory_search` 为之前的会话转录建立索引，并接受额外的存储/索引成本                                      | [内存配置参考](/reference/memory-config#session-memory-search-experimental)                   |
| 结构化规划工具           | `tools.experimental.planTool`                             | 你希望在兼容的运行时和 UI 中公开结构化的 `update_plan` 工具，用于多步骤工作跟踪                                 | [网关配置参考](/gateway/config-tools#toolsexperimental)                                      |

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true` 是一个针对较弱本地模型配置的缓冲阀。启用后，OpenClaw 会在每一轮中从代理的工具面板里移除三个默认工具 —— `browser`、`cron` 和 `message`。除此之外没有任何变化。

### 为什么是这三个工具

这三个工具在默认的 OpenClaw 运行时中拥有最长的描述和最多的参数形状。对于小上下文或更严格的 OpenAI 兼容后端而言，这意味着：

- 工具 schema 能否干净地放入提示词中，还是会挤占对话历史。
- 模型能否选中正确的工具，还是因为相似 schema 太多而发出格式错误的工具调用。
- Chat Completions 适配器能否保持在服务端结构化输出限制之内，还是会因工具调用负载大小触发 400 错误。

移除它们不会悄悄重写 OpenClaw —— 只是让工具列表变短了。模型仍然可以使用 `read`、`write`、`edit`、`exec`、`apply_patch`、Web 搜索/获取（在已配置时）、memory，以及会话/代理工具。

### 何时启用

当你已经证明模型可以与 Gateway 通信，但完整的代理轮次表现异常时，启用精简模式。典型的信号链是：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 正常的代理轮次因格式错误的工具调用、提示词过大，或模型忽略其工具而失败。
3. 切换 `localModelLean: true` 后故障消失。

### 何时保持关闭

如果你的后端能够干净地处理完整默认运行时，就保持关闭。精简模式是一种变通方案，不是默认设置。它之所以存在，是因为某些本地栈需要更小的工具面板才能正常工作；托管模型和资源充足的本地设备则不需要。

精简模式也不能替代 `tools.profile`、`tools.allow`/`tools.deny`，或模型的 `compat.supportsTools: false` 逃逸阀。如果你需要为某个特定代理永久使用更窄的工具面板，应优先使用这些稳定选项，而不是实验性标志。

### 启用

```json5
{
  agents: {
    defaults: {
      experimental: {
        localModelLean: true,
      },
    },
  },
}
```

更改标志后重启 Gateway，然后使用以下命令确认精简后的工具列表：

```bash
openclaw status --deep
```

深度状态输出会列出当前启用的代理工具；当精简模式开启时，`browser`、`cron` 和 `message` 应当不会出现。

## 实验性并不意味着隐藏

如果一个功能是实验性的，OpenClaw 应当在文档和配置路径本身中明确说明。它**不应该**做的是把预览行为偷偷塞进一个看起来稳定的默认选项里，然后假装那是正常的。配置接口变得混乱，往往就是这样开始的。

## 相关

- [功能](/concepts/features)
- [发布渠道](/install/development-channels)
