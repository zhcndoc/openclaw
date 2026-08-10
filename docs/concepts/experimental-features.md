---
summary: "OpenClaw 中实验性标志的含义，以及当前已文档化的标志"
title: "实验性功能"
read_when:
  - 你看到一个 `.experimental` 配置键，并想知道它是否稳定
  - 你想尝试预览版运行时功能，而不把它们与普通默认值混淆
  - 你想在一个地方找到当前已文档化的实验性标志
---

实验性功能是位于显式标志之后的预览界面。它们需要更多真实场景下的使用经验，才能成为稳定默认值或长期契约。

- 默认关闭，除非某个文档描述了一个狭义的自动设置规则。
- 其形态和行为可能比稳定配置变化得更快。
- 如果已经存在稳定路径，优先使用稳定路径。
- 仅在先于较小环境中测试之后，再广泛推广。

## 当前已文档化的标志

| 表面             | 键                                                                                           | 使用场景                                                                                                                       | 更多                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 本地模型运行时 | `agents.defaults.experimental.localModelLean`, `agents.entries.*.experimental.localModelLean` | 较小或限制更严格的本地后端无法处理 OpenClaw 的完整默认工具集                                                | [本地模型](/gateway/local-models)                                                  |
| Codex harness       | `plugins.entries.codex.config.appServer.experimental.sandboxExecServer`                       | 希望原生 Codex app-server 0.143.0 或更高版本将目标设为由 OpenClaw 沙箱支持的 exec-server，而不是禁用 Code Mode | [Codex harness 参考](/plugins/codex-harness-reference#sandboxed-native-execution) |
| Code Mode           | `tools.codeMode.enabled`                                                                      | 希望以紧凑的代码编排方式访问隐藏的 OpenClaw 工具目录                                                       | [Code Mode](/tools/code-mode)                                                          |
| 云端工作器       | `cloudWorkers.desktop`                                                                        | 希望通过控制 UI 监视或控制支持桌面的云端工作器环境                                        | [云端工作器桌面](/gateway/cloud-workers#desktop-interactive)                     |
| Swarm               | `tools.swarm.enabled`                                                                         | 希望 Code Mode 脚本并行编排受限规模的子代理组                                                | [Swarm](/tools/swarm)                                                                  |

## 控制 UI 实验室

打开 **设置 → 代理与工具 → 实验室**，以管理带有控制 UI 开关的实验。启用或禁用某个实验会立即修补规范的网关配置；只有当某个功能需要重启时，页面才会显示重启提示。

目前已发布的实验室条目包括代码模式、群集、工具搜索、工具循环检测、本地模型的 Lean 工具、消息审计元数据和云端工作器桌面。消息审计元数据和云端工作器桌面需要重启网关；其他开关通常会在未来的代理运行中生效，无需重启。

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true` 会在每一轮从代理的直接可见工具中移除重量级的可选工具：`browser`、`cron`、`message`、`image_generate`、`music_generate`、`video_generate`、`tts` 和 `pdf`。明确允许或因交付要求保留的工具仍然可用，不过工具搜索可能会将它们编入目录，而不是直接暴露。精简模式在 `tools.toolSearch` 尚未设置时，也会默认将插件/MCP/客户端目录切换为结构化工具搜索（`tool_search`、`tool_describe`、`tool_call`）。可使用 `agents.entries.*.experimental.localModelLean` 将其作用范围限定到单个代理。

在入门配置过程中，如果 `ollama` 或 `lmstudio` 的推理路由已验证可用，而该值缺失，则会自动设置 `agents.defaults.experimental.localModelLean: true`。OpenClaw 会记录该设置来源于入门配置，因此之后若切换到已验证的非本地路由，只会取消这个自动设置。显式配置为 `true` 或 `false` 会被保留。其他自托管和 OpenAI 兼容提供商不会根据模型名称或 URL 推断。

如果你已经在全局调优了工具搜索，OpenClaw 会保持该配置不变。将 `tools.toolSearch: false` 设为关闭，可退出精简模式下的工具搜索默认行为。

在结构化 `tools` 模式下，精简运行会让 `exec` 仍然直接可见，并与工具搜索控制并列显示，这样面向代码调优的本地模型仍可选择它们熟悉的 shell 路径。这只会改变 schema 的可见性：正常的工具策略、沙箱和 exec 审批仍然适用。显式的 `code` 和 `directory` 模式会保持其正常的压缩行为。

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
