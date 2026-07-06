---
summary: "OpenClaw 中实验性标志的含义，以及当前已文档化的标志"
title: "实验性功能"
read_when:
  - 你看到一个 `.experimental` 配置键，并想知道它是否稳定
  - 你想尝试预览版运行时功能，而不把它们与普通默认值混淆
  - 你想在一个地方找到当前已文档化的实验性标志
---

实验性功能是通过显式标志启用的可选预览能力。在它们获得稳定默认值或长期契约之前，需要更多真实场景的验证。

- 默认关闭，除非文档告诉你启用某项功能。
- 其形式和行为变化速度可能快于稳定配置。
- 如果已经存在稳定路径，优先使用稳定路径。
- 只有先在较小环境中测试后，才应大范围推广。

## 当前已文档化的标志

| Surface                  | Key                                                                                        | Use it when                                                                                                                       | More                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Local model runtime      | `agents.defaults.experimental.localModelLean`, `agents.list[].experimental.localModelLean` | 当更小或更严格的本地后端在处理 OpenClaw 的完整默认工具面板时会吃不消时                                                             | [本地模型](/gateway/local-models)                                                             |
| Memory search            | `agents.defaults.memorySearch.experimental.sessionMemory`                                  | 你希望 `memory_search` 为之前的会话转录建立索引，并接受额外的存储/索引成本                                                         | [内存配置参考](/reference/memory-config#session-memory-search-experimental)                  |
| Codex harness            | `plugins.entries.codex.config.appServer.experimental.sandboxExecServer`                    | 你希望原生 Codex app-server 0.132.0 或更新版本将目标指向由 OpenClaw 沙箱支持的 exec-server，而不是禁用 Code Mode                | [Codex harness 参考](/plugins/codex-harness-reference#sandboxed-native-execution)           |
| Structured planning tool | `tools.experimental.planTool`                                                              | 你希望在兼容的运行时和 UI 中暴露结构化的 `update_plan` 工具，用于多步骤工作跟踪                                                  | [网关配置参考](/gateway/config-tools#toolsexperimental)                                      |

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true` 会在每一轮从代理的直接工具面板中移除重量级的可选工具：`browser`、`cron`、`message`、`image_generate`、`music_generate`、`video_generate`、`tts` 和 `pdf`。明确允许或交付所必需的工具仍然可用，不过工具搜索可能会将它们编入目录而不是直接暴露。精简模式还会在 `tools.toolSearch` 尚未设置时，默认将插件/MCP/客户端目录切换为结构化工具搜索（`tool_search`、`tool_describe`、`tool_call`）。使用 `agents.list[].experimental.localModelLean` 可将其仅作用于某一个代理。

如果你已经在全局调优了工具搜索，OpenClaw 会保持该配置不变。将 `tools.toolSearch: false` 设为关闭，可退出精简模式下的工具搜索默认行为。

### 为什么是这些工具

这些工具具有最长的描述、最宽泛的参数形状，或者最容易让小模型偏离正常编码与对话路径。对于较小上下文或更严格的 OpenAI 兼容后端来说，这两者的差异在于：

- 工具 schema 能否装进提示词，而不是挤占对话历史。
- 模型是能否选对工具，还是因为过多相似的 schema 而发出格式错误的工具调用。
- Chat Completions 适配器是否能保持在结构化输出限制内，而不是在工具调用负载大小上返回 400。

移除它们只会缩短直接工具列表。模型仍然可以使用 `read`、`write`、`edit`、`exec`、`apply_patch`、图像理解、网页搜索/获取（如已配置）、记忆以及会话/代理工具。额外目录仍可通过工具搜索访问，除非你设置 `tools.toolSearch: false`；明确的工具允许项也可以让精简代理重新回到裁剪后的工作流。

### 何时启用

一旦你已经证明模型可以与 Gateway 通信，但完整的代理轮次表现异常，就启用精简模式：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 正常的代理轮次因格式错误的工具调用、提示词过大，或模型忽略其工具而失败。
3. 切换为 `localModelLean: true` 后故障消失。

### 何时保持关闭

如果你的后端能够干净地处理完整的默认运行时，就保持关闭。这是为需要更小工具面板的本地栈提供的变通方案，而不是面向托管模型或资源充足的本地机器的默认设置。

精简模式不能替代 `tools.profile`、`tools.allow`/`tools.deny`，也不能替代模型的 `compat.supportsTools: false` 逃生开关。若要为某个特定代理永久使用更窄的工具面板，优先使用这些稳定的配置项。

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

仅针对一个代理：

```json5
{
  agents: {
    list: [
      {
        id: "local",
        model: "lmstudio/gemma-4-e4b-it",
        experimental: {
          localModelLean: true,
        },
      },
    ],
  },
}
```

更改该标志后请重启 Gateway。精简过滤会移除 `browser`、`cron`、`message`、`image_generate`、`music_generate`、`video_generate`、`tts` 和 `pdf`，除非你通过 `tools.allow` 或 `tools.alsoAllow` 明确保留它们；工具搜索仍可能将已保留的工具编入目录，而不是直接暴露它们。

## 实验性并不意味着隐藏

实验性功能应在文档中以及配置路径本身明确说明，而不是隐藏在一个看起来像稳定默认设置的选项背后。

## 相关

- [功能](/concepts/features)
- [发布渠道](/install/development-channels)
