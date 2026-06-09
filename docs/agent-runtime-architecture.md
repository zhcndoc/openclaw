---
title: "Agent runtime architecture"
summary: "OpenClaw 如何运行内置的 agent runtime、providers、sessions、tools 和 extensions。"
---

OpenClaw 直接拥有内置的 agent runtime。运行时代码位于 `src/agents/` 下，模型/provider 辅助代码位于 `src/llm/` 下，面向插件的契约通过 `openclaw/plugin-sdk/*` barrels 暴露。

## Runtime Layout

- `src/agents/embedded-agent-runner/`: 内置 agent 尝试循环、provider 流适配器、压缩、模型选择，以及 session 连接。
- `src/agents/sessions/`: session 持久化、extension 加载、资源发现、skills、prompts、themes，以及基于 TUI 的工具渲染器。
- `packages/agent-core/`: 可复用的 agent core、底层 harness 类型、messages、压缩辅助函数、prompt 模板，以及 tool/session 契约。
- `src/agents/runtime/`: `@openclaw/agent-core` 的 OpenClaw 外观层以及本地代理工具。
- `src/agents/agent-tools*.ts`: OpenClaw 拥有的工具定义、schemas、policy、before/after hook 适配器，以及宿主编辑支持。
- `src/agents/agent-hooks/`: 内置 runtime hooks，例如压缩保护和上下文裁剪。
- `src/llm/`: 模型/provider 注册表、传输辅助函数，以及 provider 特定的流实现。

## Boundaries

核心代码通过 OpenClaw 模块和 SDK barrels 调用内置 runtime，而不是通过旧的外部 agent packages。插件使用已文档化的 `openclaw/plugin-sdk/*` 入口点，不会导入 `src/**` 内部实现。

`@earendil-works/pi-tui` 仍然是第三方 TUI 依赖。它作为终端组件工具包被本地 TUI 和 session 渲染器使用；将其内化会是一个单独的 vendoring 工作。

## Manifests

资源包在 package metadata 中声明 OpenClaw resources：

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

package manager 也会发现常规的 `extensions/`、`skills/`、`prompts/` 和 `themes/` 目录。

## Runtime Selection

默认的内置 runtime id 是 `openclaw`。插件 harness 可以注册额外的 runtime id。`auto` 会在存在支持它的插件 harness 时选择该 harness，否则使用内置的 OpenClaw runtime。

## Related

- [OpenClaw agent runtime workflow](/openclaw-agent-runtime)
- [Agent runtimes](/concepts/agent-runtimes)
