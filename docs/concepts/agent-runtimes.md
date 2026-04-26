---
summary: "OpenClaw 如何区分模型提供方、模型、渠道和代理运行时"
title: "代理运行时"
read_when:
  - 你在 PI、Codex、ACP 或其他原生代理运行时之间做选择
  - 你对状态或配置中的 provider/model/runtime 标签感到困惑
  - 你正在为原生 harness 编写支持一致性文档
---

**代理运行时** 是拥有一个已准备好的模型循环的组件：它接收提示，驱动模型输出，处理原生工具调用，并将完成的一轮返回给 OpenClaw。

运行时很容易与提供方混淆，因为它们都会出现在模型配置附近。它们是不同层：

| 层级          | 示例                                   | 含义                                                             |
| ------------- | -------------------------------------- | ---------------------------------------------------------------- |
| 提供方        | `openai`, `anthropic`, `openai-codex` | OpenClaw 如何进行认证、发现模型，以及命名模型引用。             |
| 模型          | `gpt-5.5`, `claude-opus-4-6`          | 为代理回合选择的模型。                                           |
| 代理运行时    | `pi`, `codex`, 由 ACP 支持的运行时     | 执行已准备好回合的底层循环。                                     |
| 渠道          | Telegram, Discord, Slack, WhatsApp    | 消息进入和离开 OpenClaw 的位置。                                |

你还会在代码和配置中看到 **harness** 这个词。harness 是提供代理运行时的实现。例如，随附的 Codex harness 实现了 `codex` 运行时。为了兼容，配置键仍然命名为 `embeddedHarness`，但面向用户的文档和状态输出通常应该使用 runtime。

常见的 Codex 配置使用 `openai` 提供方和 `codex` 运行时：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

这意味着 OpenClaw 先选择一个 OpenAI 模型引用，然后让 Codex app-server 运行时来执行嵌入式代理回合。它并不意味着渠道、模型提供方目录或 OpenClaw 会话存储会变成 Codex。

## 运行时所有权

不同运行时拥有循环的不同部分。

| 表面                        | OpenClaw PI 嵌入式                      | Codex app-server                                                            |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| 模型循环所有者              | 通过 PI 嵌入式运行器的 OpenClaw        | Codex app-server                                                            |
| 规范线程状态                | OpenClaw 转录记录                       | Codex 线程，以及 OpenClaw 转录镜像                                           |
| OpenClaw 动态工具           | 原生 OpenClaw 工具循环                   | 通过 Codex 适配器桥接                                                       |
| 原生 shell 和文件工具       | PI/OpenClaw 路径                        | Codex 原生工具，在受支持时通过原生钩子桥接                                   |
| 上下文引擎                  | 原生 OpenClaw 上下文组装                | OpenClaw 将项目上下文组装到 Codex 回合中                                     |
| 压缩                        | OpenClaw 或所选上下文引擎               | Codex 原生压缩，并带有 OpenClaw 通知和镜像维护                               |
| 渠道投递                    | OpenClaw                                | OpenClaw                                                                    |

这种所有权划分是主要设计原则：

- 如果 OpenClaw 拥有该表面，OpenClaw 就可以提供正常的插件钩子行为。
- 如果原生运行时拥有该表面，OpenClaw 就需要运行时事件或原生钩子。
- 如果原生运行时拥有规范线程状态，OpenClaw 应该镜像并投影上下文，而不是重写不受支持的内部结构。

## 运行时选择

OpenClaw 在完成提供方和模型解析后选择嵌入式运行时：

1. 会话中已记录的运行时优先。配置变更不会把现有转录热切换到另一个原生线程系统。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 会为新会话或重置后的会话强制使用该运行时。
3. `agents.defaults.embeddedHarness.runtime` 或
   `agents.list[].embeddedHarness.runtime` 可以设置为 `auto`、`pi`，或已注册的
   运行时 id，例如 `codex`。
4. 在 `auto` 模式下，已注册的插件运行时可以声明其支持的提供方/模型
   组合。
5. 如果在 `auto` 模式下没有运行时声明某个回合，并且设置了
   `fallback: "pi"`（默认值），OpenClaw 会使用 PI 作为兼容性回退。设置
   `fallback: "none"` 则会让未匹配的 `auto` 模式选择直接失败。

显式插件运行时默认会在失败时关闭。例如，
`runtime: "codex"` 表示 Codex，或者在没有清晰选择时返回错误，除非你在
相同的覆盖作用域中设置了 `fallback: "pi"`。

## 兼容性契约

当某个运行时不是 PI 时，它应该说明 OpenClaw 暴露的哪些表面是受支持的。
运行时文档可使用如下结构：

| 问题                                   | 重要原因                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| 谁拥有模型循环？                       | 决定重试、工具继续执行以及最终答案决策发生在何处。                                            |
| 谁拥有规范线程历史？                   | 决定 OpenClaw 是否可以编辑历史，还是只能镜像它。                                              |
| OpenClaw 动态工具是否可用？            | 消息、会话、cron 和 OpenClaw 拥有的工具都依赖这一点。                                         |
| 动态工具钩子是否可用？                 | 插件期望围绕 OpenClaw 拥有的工具使用 `before_tool_call`、`after_tool_call` 和中间件。        |
| 原生工具钩子是否可用？                 | shell、patch 和运行时拥有的工具需要原生钩子支持来实现策略和观察。                              |
| 上下文引擎生命周期是否运行？           | 内存和上下文插件依赖 assemble、ingest、after-turn 和 compaction 生命周期。                   |
| 暴露了哪些压缩数据？                   | 有些插件只需要通知，而另一些需要保留/丢弃元数据。                                              |
| 明确不支持什么？                       | 用户不应假设在原生运行时拥有更多状态时仍与 PI 等价。                                          |

Codex 运行时支持契约记录在
[Codex harness](/plugins/codex-harness#v1-support-contract) 中。

## 状态标签

状态输出可能同时显示 `Execution` 和 `Runtime` 标签。应将它们理解为
诊断信息，而不是提供方名称。

- 像 `openai/gpt-5.5` 这样的模型引用告诉你所选的提供方/模型。
- 像 `codex` 这样的运行时 id 告诉你正在执行该回合的循环。
- 像 Telegram 或 Discord 这样的渠道标签告诉你对话发生在哪里。

如果在更改运行时配置后某个会话仍显示 PI，请使用 `/new` 开始一个新会话，
或用 `/reset` 清除当前会话。现有会话会保留其记录的运行时，因此转录不会
通过两个不兼容的原生会话系统重新播放。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [代理 harness 插件](/plugins/sdk-agent-harness)
- [代理循环](/concepts/agent-loop)
- [模型](/concepts/models)
