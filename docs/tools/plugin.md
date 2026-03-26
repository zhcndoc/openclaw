---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - 安装或配置插件时
  - 了解插件发现和加载规则时
  - 使用兼容 Codex/Claude 的插件包时
title: "插件"
sidebarTitle: "安装与配置"
---

# 插件

插件为 OpenClaw 扩展新能力：频道、模型提供方、工具、
技能、语音、图像生成等。其中一些插件是**核心**插件（随 OpenClaw 一起发布），
另一些是**外部**插件（由社区发布到 npm）。

## 快速开始

<Steps>
  <Step title="查看已加载内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # 从 npm 安装
    openclaw plugins install @openclaw/voice-call

    # 从本地目录或归档文件安装
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重启 Gateway">
    ```bash
    openclaw gateway restart
    ```

    然后在配置文件中的 `plugins.entries.\<id\>.config` 下进行配置。

  </Step>
</Steps>

如果你更喜欢在聊天中直接控制，可以启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安装路径使用与 CLI 相同的解析器：本地路径/归档文件、显式
`clawhub:<pkg>`，或裸包规格（先 ClawHub，再回退到 npm）。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作方式                                                     | 示例                                                   |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| **原生**   | `openclaw.plugin.json` + 运行时模块；在进程内执行            | 官方插件、社区 npm 包                                  |
| **Bundle** | 兼容 Codex/Claude/Cursor 的布局；映射到 OpenClaw 功能       | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

两者都会显示在 `openclaw plugins list` 中。有关 bundle 的详细信息，请参见 [插件 Bundles](/plugins/bundles)。

如果你正在编写原生插件，请从 [构建插件](/plugins/building-plugins)
和 [插件 SDK 概览](/plugins/sdk-overview) 开始。

## 官方插件

### 可安装（npm）

| 插件             | 包                      | 文档                                 |
| ---------------- | ----------------------- | ------------------------------------ |
| Matrix          | `@openclaw/matrix`     | [Matrix](/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/channels/nostr)             |
| Voice Call      | `@openclaw/voice-call` | [Voice Call](/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/plugins/zalouser)   |

### 核心（随 OpenClaw 一起发布）

<AccordionGroup>
  <Accordion title="模型提供方（默认启用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `qwen-portal-auth`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="内存插件">
    - `memory-core` — 内置内存搜索（通过 `plugins.slots.memory` 默认启用）
    - `memory-lancedb` — 按需安装的长期记忆，带自动回忆/捕获（设置 `plugins.slots.memory = "memory-lancedb"`）
  </Accordion>

  <Accordion title="语音提供方（默认启用）">
    `elevenlabs`, `microsoft`
  </Accordion>

  <Accordion title="其他">
    - `copilot-proxy` — VS Code Copilot Proxy 桥接（默认禁用）
  </Accordion>
</AccordionGroup>

在找第三方插件吗？请参见 [社区插件](/plugins/community)。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 字段              | 说明                                                  |
| ----------------- | ----------------------------------------------------- |
| `enabled`        | 总开关（默认：`true`）                                |
| `allow`          | 插件允许列表（可选）                                  |
| `deny`          | 插件拒绝列表（可选；拒绝优先）                        |
| `load.paths`     | 额外的插件文件/目录                                  |
| `slots`          | 独占槽选择器（例如 `memory`、`contextEngine`）        |
| `entries.\<id\>` | 每个插件的开关 + 配置                                |

配置更改**需要重启 Gateway**。如果 Gateway 以配置
监视 + 进程内重启的方式运行（默认的 `openclaw gateway` 路径），那么该
重启通常会在配置写入落地后片刻自动执行。

<Accordion title="插件状态：已禁用 vs 缺失 vs 无效">
  - **已禁用**：插件存在，但启用规则将其关闭。配置会被保留。
  - **缺失**：配置引用了一个发现过程中未找到的插件 id。
  - **无效**：插件存在，但其配置与声明的 schema 不匹配。
</Accordion>

## 发现与优先级

OpenClaw 按以下顺序扫描插件（先匹配者优先）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` — 显式文件或目录路径。
  </Step>

  <Step title="工作区扩展">
    `\<workspace\>/.openclaw/extensions/*.ts` 和 `\<workspace\>/.openclaw/extensions/*/index.ts`。
  </Step>

  <Step title="全局扩展">
    `~/.openclaw/extensions/*.ts` 和 `~/.openclaw/extensions/*/index.ts`。
  </Step>

  <Step title="捆绑插件">
    随 OpenClaw 一起发布。许多默认启用（模型提供方、语音）。
    其他则需要显式启用。
  </Step>
</Steps>

### 启用规则

- `plugins.enabled: false` 会禁用所有插件
- `plugins.deny` 始终优先于 allow
- `plugins.entries.\<id\>.enabled: false` 会禁用该插件
- 工作区来源的插件**默认禁用**（必须显式启用）
- 捆绑插件遵循内置的默认开启集合，除非被覆盖
- 独占槽可以强制启用该槽所选中的插件

## 插件槽（独占分类）

某些类别是独占的（同一时间只能激活一个）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // 或 "none" 以禁用
      contextEngine: "legacy", // 或一个插件 id
    },
  },
}
```

| 槽              | 控制内容              | 默认值              |
| --------------- | --------------------- | ------------------- |
| `memory`        | 当前生效的内存插件    | `memory-core`       |
| `contextEngine` | 当前生效的上下文引擎  | `legacy`（内置）    |

## CLI 参考

```bash
openclaw plugins list                    # 简洁清单
openclaw plugins inspect <id>            # 深度详情
openclaw plugins inspect <id> --json     # 机器可读
openclaw plugins status                  # 运行状态摘要
openclaw plugins doctor                  # 诊断

openclaw plugins install <package>        # 安装（先 ClawHub，再 npm）
openclaw plugins install clawhub:<pkg>   # 仅从 ClawHub 安装
openclaw plugins install <path>          # 从本地路径安装
openclaw plugins install -l <path>       # 链接（不复制），用于开发
openclaw plugins update <id>             # 更新一个插件
openclaw plugins update --all            # 更新全部

openclaw plugins enable <id>
openclaw plugins disable <id>
```

查看完整详情，请参见 [`openclaw plugins` CLI 参考](/cli/plugins)。

## 插件 API 概览

插件可以导出一个函数，或导出一个带有 `register(api)` 的对象：

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

常见注册方法：

| 方法                                 | 注册内容             |
| ------------------------------------ | -------------------- |
| `registerProvider`                   | 模型提供方（LLM）    |
| `registerChannel`                    | 聊天频道             |
| `registerTool`                       | Agent 工具           |
| `registerHook` / `on(...)`           | 生命周期钩子         |
| `registerSpeechProvider`             | 文本转语音 / STT     |
| `registerMediaUnderstandingProvider` | 图像/音频分析        |
| `registerImageGenerationProvider`    | 图像生成             |
| `registerWebSearchProvider`          | Web 搜索             |
| `registerHttpRoute`                  | HTTP 端点            |
| `registerCommand` / `registerCli`    | CLI 命令             |
| `registerContextEngine`              | 上下文引擎           |
| `registerService`                    | 后台服务             |

类型化生命周期钩子的守卫行为：

- `before_tool_call`: `{ block: true }` 是终态；会跳过低优先级处理器。
- `before_tool_call`: `{ block: false }` 是空操作，不会清除先前的 block。
- `message_sending`: `{ cancel: true }` 是终态；会跳过低优先级处理器。
- `message_sending`: `{ cancel: false }` 是空操作，不会清除先前的 cancel。

有关完整的类型化钩子行为，请参见 [SDK 概览](/plugins/sdk-overview#hook-decision-semantics)。

## 相关内容

- [构建插件](/plugins/building-plugins) — 创建你自己的插件
- [插件 Bundles](/plugins/bundles) — 兼容 Codex/Claude/Cursor 的 bundle
- [插件清单](/plugins/manifest) — manifest schema
- [注册工具](/plugins/building-plugins#registering-agent-tools) — 在插件中添加 agent 工具
- [插件内部机制](/plugins/architecture) — 能力模型和加载流水线
- [社区插件](/plugins/community) — 第三方列表
