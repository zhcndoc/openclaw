---
summary: "构建一个注册本地 AI CLI 后端的插件"
title: "构建 CLI 后端插件"
sidebarTitle: "CLI 后端插件"
read_when:
  - 你正在构建一个本地 AI CLI 后端插件
  - 你想为诸如 acme-cli/model 这样的模型引用注册一个后端
  - 你需要将第三方 CLI 映射到 OpenClaw 的文本回退运行器
---

CLI 后端插件让 OpenClaw 可以将本地 AI CLI 作为文本推理后端来调用。该后端会在模型引用中显示为一个提供方前缀：

```text
acme-cli/acme-large
```

当上游集成已经以本地命令的形式提供、当 CLI 自己管理本地登录状态，或者当 API 提供方不可用时 CLI 作为一个有用的回退方案时，请使用 CLI 后端。

<Info>
  如果上游服务提供了标准的 HTTP 模型 API，请改为编写一个 [提供方插件](/plugins/sdk-provider-plugins)。如果上游运行时拥有完整的 agent 会话、工具事件、压缩或后台任务状态，请使用一个 [agent harness](/plugins/sdk-agent-harness)。
</Info>

## 插件负责什么

一个 CLI 后端插件有三个契约：

| 契约                 | 文件                   | 作用                                                      |
| -------------------- | ---------------------- | --------------------------------------------------------- |
| 包入口               | `package.json`         | 指向 OpenClaw 的插件运行时模块                             |
| 清单所有权           | `openclaw.plugin.json` | 在运行时加载之前声明后端 id                                |
| 运行时注册           | `index.ts`             | 使用命令默认值调用 `api.registerCliBackend(...)`          |

清单是发现元数据。它不会执行 CLI，也不会注册运行时行为。运行时行为从插件入口调用 `api.registerCliBackend(...)` 时开始。

## 最小后端插件

<Steps>
  <Step title="创建包元数据">
    ```json package.json
    {
      "name": "@acme/openclaw-acme-cli",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      },
      "dependencies": {
        "openclaw": "^2026.3.24"
      },
      "devDependencies": {
        "typescript": "^5.9.0"
      }
    }
    ```

    已发布的包必须包含已构建的 JavaScript 运行时文件。如果你的源码入口是 `./src/index.ts`，请添加指向已构建 JavaScript 对应文件的 `openclaw.runtimeExtensions`。参见 [入口点](/plugins/sdk-entrypoints)。

  </Step>

  <Step title="声明后端所有权">
    ```json openclaw.plugin.json
    {
      "id": "acme-cli",
      "name": "Acme CLI",
      "description": "通过 OpenClaw 运行 Acme 的本地 AI CLI",
      "cliBackends": ["acme-cli"],
      "setup": {
        "cliBackends": ["acme-cli"],
        "requiresRuntime": false
      },
      "activation": {
        "onStartup": false
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```

    `cliBackends` 是运行时所有权列表。它使 OpenClaw 能在配置或模型选择提到 `acme-cli/...` 时自动加载该插件。

    `setup.cliBackends` 是面向描述信息优先的安装界面。当模型发现、引导或状态应该在不加载插件运行时的情况下识别该后端时，请添加它。仅当这些静态描述信息足以完成安装时，才使用 `requiresRuntime: false`。

  </Step>

  <Step title="注册后端">
    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import {
      CLI_FRESH_WATCHDOG_DEFAULTS,
      CLI_RESUME_WATCHDOG_DEFAULTS,
      type CliBackendPlugin,
    } from "openclaw/plugin-sdk/cli-backend";

    function buildAcmeCliBackend(): CliBackendPlugin {
      return {
        id: "acme-cli",
        liveTest: {
          defaultModelRef: "acme-cli/acme-large",
          defaultImageProbe: false,
          defaultMcpProbe: false,
          docker: {
            npmPackage: "@acme/acme-cli",
            binaryName: "acme",
          },
        },
        config: {
          command: "acme",
          args: ["chat", "--json"],
          output: "json",
          input: "stdin",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptFileArg: "--system-file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          reliability: {
            watchdog: {
              fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
              resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
            },
          },
          serialize: true,
        },
      };
    }

    export default definePluginEntry({
      id: "acme-cli",
      name: "Acme CLI",
      description: "通过 OpenClaw 运行 Acme 的本地 AI CLI",
      register(api) {
        api.registerCliBackend(buildAcmeCliBackend());
      },
    });
    ```

    后端 id 必须与清单中的 `cliBackends` 条目一致。注册的 `config` 只是默认值；运行时，`agents.defaults.cliBackends.acme-cli` 下的用户配置会覆盖并合并到它之上。

  </Step>
</Steps>

## 配置结构

`CliBackendConfig` 描述了 OpenClaw 应该如何启动并解析 CLI：

| 字段                                     | 用途                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| `command`                                 | 二进制名称或绝对命令路径                                     |
| `args`                                    | 新会话运行的基础 argv                                         |
| `resumeArgs`                              | 恢复会话时的替代 argv；支持 `{sessionId}`                     |
| `output` / `resumeOutput`                 | 解析器：`json`、`jsonl` 或 `text`                             |
| `input`                                   | 提示词传输方式：`arg` 或 `stdin`                              |
| `modelArg`                                | 模型 id 前使用的标志                                           |
| `modelAliases`                            | 将 OpenClaw 模型 id 映射到 CLI 原生 id                         |
| `sessionArg` / `sessionArgs`              | 传递会话 id 的方式                                              |
| `sessionMode`                             | `always`、`existing` 或 `none`                                |
| `sessionIdFields`                         | OpenClaw 从 CLI 输出中读取的 JSON 字段                        |
| `systemPromptArg` / `systemPromptFileArg` | 系统提示词传输方式                                              |
| `systemPromptWhen`                        | `first`、`always` 或 `never`                                   |
| `imageArg` / `imageMode`                  | 图像路径支持                                                   |
| `serialize`                               | 保持同一后端运行按顺序执行                                     |
| `reliability.watchdog`                    | 无输出超时调优                                                |

优先选择与 CLI 匹配的最小静态配置。仅为真正属于后端的行为添加插件回调。

## 高级后端钩子

`CliBackendPlugin` 还可以定义：

| 钩子                               | 用途                                                   |
| ---------------------------------- | ------------------------------------------------------ |
| `normalizeConfig(config, context)` | 在合并后重写旧版用户配置                 |
| `resolveExecutionArgs(ctx)`        | 添加请求范围标志，如思考力度       |
| `prepareExecution(ctx)`            | 启动前创建临时身份验证或配置桥接  |
| `transformSystemPrompt(ctx)`       | 应用最终的 CLI 特定系统提示词转换     |
| `textTransforms`                   | 双向提示词/输出替换               |
| `defaultAuthProfileId`             | 优先使用特定的 OpenClaw 身份验证配置文件                |
| `authEpochMode`                    | 决定身份验证变更如何使已存储的 CLI 会话失效 |
| `nativeToolMode`                   | 声明 CLI 是否始终启用原生工具     |
| `bundleMcp` / `bundleMcpMode`      | 启用 OpenClaw 的回环 MCP 工具桥接           |
| `ownsNativeCompaction`             | 后端拥有自身压缩能力 - OpenClaw 将延后处理      |

请将这些钩子保持为后端所有。不要在核心中添加 CLI 特定分支，只要后端钩子能够表达该行为即可。

### `ownsNativeCompaction`: 选择退出 OpenClaw 压缩

如果你的后端运行的 agent 会压缩其**自身**的转录内容，请设置
`ownsNativeCompaction: true`，这样 OpenClaw 的保护性摘要器就不会对其
会话运行 - CLI 压缩生命周期会返回 no-op，当前轮次继续执行。`claude-cli`
声明了这一点，因为 Claude Code 在内部压缩，而且没有 harness 端点。像 Codex 这样的原生 harness
会话则继续路由到它们的 harness 压缩端点。

**只有在同时满足以下所有条件时才声明它**，否则延迟的超预算会话可能会
一直超预算 / 变得陈旧（OpenClaw 不再挽救它）：

- 后端会在接近窗口上限时可靠地压缩或限制自身转录内容；
- 它会保留可恢复的会话，以便压缩后的状态能跨轮次保留
  （例如 `--resume` / `--session-id`）；
- 它不是原生 harness 压缩会话 - 匹配 `agentHarnessId` 的会话
  会改为路由到 harness 端点。

## MCP 工具桥接

CLI 后端默认不会接收 OpenClaw 工具。如果 CLI 能够消费 MCP 配置，请显式启用：

```typescript
return {
  id: "acme-cli",
  bundleMcp: true,
  bundleMcpMode: "codex-config-overrides",
  config: {
    command: "acme",
    args: ["chat", "--json"],
    output: "json",
  },
};
```

支持的桥接模式有：

| 模式                     | 用途                                                              |
| ------------------------ | ---------------------------------------------------------------- |
| `claude-config-file`     | 接受 MCP 配置文件的 CLI                                           |
| `codex-config-overrides` | 接受通过 argv 传入配置覆盖项的 CLI                                |
| `gemini-system-settings` | 从其系统设置目录读取 MCP 设置的 CLI                               |

只有在 CLI 确实能够消费时才启用该桥接。如果 CLI 有其自身内置且无法禁用的工具层，请设置 `nativeToolMode:
"always-on"`，这样当调用方要求不使用原生工具时，OpenClaw 可以安全失败。

## 用户配置

用户可以覆盖任意后端默认值：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "acme-cli": {
          command: "/opt/acme/bin/acme",
          args: ["chat", "--json", "--profile", "work"],
          modelAliases: {
            large: "acme-large-2026",
          },
        },
      },
      model: {
        primary: "openai/gpt-5.5",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

请记录用户最可能需要覆盖的最小项。通常只需要在二进制不在 `PATH` 中时覆盖 `command`。

## 验证

对于打包插件，请围绕 builder 和 setup 注册添加一个有针对性的测试，然后运行该插件的目标测试任务：

```bash
pnpm test extensions/acme-cli
```

对于本地或已安装的插件，验证发现能力并实际运行一次模型：

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "reply exactly: backend ok" --model acme-cli/acme-large
```

如果后端支持图像或 MCP，请添加一个实时冒烟测试，使用真实 CLI 证明这些路径可用。不要仅依赖静态检查来验证 prompt、图像、MCP 或 session-resume 行为。

## 清单

<Check>`package.json` 包含 `openclaw.extensions` 以及发布包的构建后运行时条目</Check>
<Check>`openclaw.plugin.json` 声明了 `cliBackends` 和有意设置的 `activation.onStartup`</Check>
<Check>当 setup/model 发现应在冷启动时看到后端时，`setup.cliBackends` 已存在</Check>
<Check>`api.registerCliBackend(...)` 使用与 manifest 相同的后端 id</Check>
<Check>`agents.defaults.cliBackends.<id>` 下的用户覆盖仍然优先生效</Check>
<Check>Session、system prompt、image 和 output parser 设置与真实 CLI 合约一致</Check>
<Check>有针对性的测试以及至少一个实时 CLI 冒烟测试证明了后端路径</Check>

## 相关内容

- [CLI backends](/gateway/cli-backends) - 用户配置和运行时行为
- [Building plugins](/plugins/building-plugins) - 包和 manifest 基础
- [Plugin SDK overview](/plugins/sdk-overview) - 注册 API 参考
- [Plugin manifest](/plugins/manifest) - `cliBackends` 和 setup 描述符
- [Agent harness](/plugins/sdk-agent-harness) - 完整的外部 agent 运行时
