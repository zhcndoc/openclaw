---
title: "代理运行时架构"
summary: "OpenClaw 如何组织内置代理运行时：代码布局、边界、资源清单和运行时选择。"
---

OpenClaw 拥有内置代理运行时。运行时代码位于 `src/agents/` 下，模型/提供方传输位于 `src/llm/` 下，面向插件的契约通过 `openclaw/plugin-sdk/*` 的入口文件导出。

## 运行时布局

| 路径                                | 负责内容                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/agents/embedded-agent-runner/` | 内置尝试循环（`run.ts`、`run/`）、模型选择与提供方规范化（`model*.ts`）、按提供方的请求参数（`extra-params.*`）、压缩、转写以及会话连接。                            |
| `src/agents/sessions/`              | 会话持久化（`session-manager.ts`）、资源发现（`package-manager.ts`、`resource-loader.ts`）、会话内 `extensions` 加载、提示模板、技能、主题，以及由 TUI 支持的工具渲染器（`tools/`）。 |
| `packages/agent-core/`              | 可复用的 agent 核心（`@openclaw/agent-core`）：agent 循环、harness 类型、消息、压缩辅助、提示模板、技能，以及会话存储契约。                                                           |
| `src/agents/runtime/`               | OpenClaw 外观层，将 `@openclaw/agent-core` 连接到插件 SDK LLM 运行时，并重新导出它及本地代理工具。                                                                                             |
| `src/agents/agent-tools*.ts`        | 由 OpenClaw 管理的工具定义、参数 schema、工具策略、工具调用前/后适配器，以及主机/沙箱编辑工具。                                                                                            |
| `src/agents/agent-hooks/`           | 内置运行时钩子：压缩保护措施、压缩说明、上下文修剪。                                                                                                                                   |
| `src/agents/harness/`               | 内置和由插件注册的 harness 的注册表、选择策略与生命周期。                                                                                                                       |
| `src/llm/`                          | 模型/提供方注册表、传输辅助工具，以及提供方特定的流式实现（`src/llm/providers/`）。                                                                                                          |

## 边界

Core 通过 OpenClaw 模块和 SDK barrel 调用内置运行时；不再保留任何外部代理框架包。插件使用已文档化的 `openclaw/plugin-sdk/*` 入口点，不会导入 `src/**` 内部实现。

`@earendil-works/pi-tui` 仍然是一个第三方依赖：它是本地 TUI 和会话工具渲染器使用的终端组件工具包。将其内化将是单独的 vendor 化工作。

## 清单

资源包在 `package.json` 元数据中声明 OpenClaw 资源。条目是相对于包根目录的文件路径或 glob：

```json
{
  "openclaw": {
    "extensions": ["extensions/index.ts"],
    "skills": ["skills/*.md"],
    "prompts": ["prompts/*.md"],
    "themes": ["themes/*.json"]
  }
}
```

清单中未列出的资源类型会回退到发现约定的 `extensions/`、`skills/`、`prompts/` 和 `themes/` 目录。

## 运行时选择

- 内置运行时 id 是 `openclaw`。旧别名 `pi` 会规范化为 `openclaw`；`codex-app-server` 会规范化为 `codex`。
- 插件适配器会注册额外的运行时 id（例如 `codex`）。
- 运行时策略是按模型/提供方范围配置的 `agentRuntime.id`（模型条目优先于提供方条目）。未设置或 `default` 会解析为 `auto`。
- `auto` 会选择支持该提供方/模型的已注册插件适配器，否则使用内置的 OpenClaw 运行时。
- 官方 API 端点上的 `openai` 提供方默认使用 `codex` 适配器；自定义 `baseUrl` 值则保持其已配置的行为。

## 相关

- [OpenClaw 代理运行时工作流](/openclaw-agent-runtime)
- [代理运行时](/concepts/agent-runtimes)
