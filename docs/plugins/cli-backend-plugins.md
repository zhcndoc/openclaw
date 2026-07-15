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

当上游集成已经以本地命令的形式暴露出来、当 CLI 自身管理本地登录状态时，或者当 API 提供方不可用时，请使用 CLI 后端作为回退方案。

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

清单是发现元数据：它不会执行 CLI，也不会注册运行时行为。运行时行为从插件入口调用 `api.registerCliBackend(...)` 时开始。

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

    已发布的包必须包含已构建的 JavaScript 运行时文件。如果你的源入口是 `./src/index.ts`，请添加 `openclaw.runtimeExtensions`，指向构建后的 JavaScript 同级文件。参见 [入口点](/plugins/sdk-entrypoints)。

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

    `cliBackends` 是运行时所有权列表；当配置或模型选择提到 `acme-cli/...` 时，它会让 OpenClaw 自动加载该插件。

    `setup.cliBackends` 是仅基于描述符的 setup 接口。若模型发现、引导流程或状态需要在不加载插件运行时的情况下识别该后端，请添加它。仅当这些静态描述符已足够用于 setup 时，才使用 `requiresRuntime: false`。

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

    后端 id 必须与 manifest 中的 `cliBackends` 条目匹配。注册的 `config` 只是默认值；运行时用户配置中的 `agents.defaults.cliBackends.acme-cli` 会覆盖并合并到它之上。

  </Step>
</Steps>

## 配置结构

`CliBackendConfig` 描述了 OpenClaw 应该如何启动并解析 CLI：

| Field                                                     | Use                                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `command`                                                 | 二进制名称或绝对命令路径                                                          |
| `args`                                                    | 新运行的基础 argv                                                                   |
| `resumeArgs`                                              | 恢复会话时的替代 argv；支持 `{sessionId}`                                           |
| `output` / `resumeOutput`                                 | 解析器：`json`、`jsonl` 或 `text`                                                  |
| `jsonlDialect`                                            | JSONL 事件方言：`claude-stream-json` 或 `gemini-stream-json`                       |
| `liveSession`                                             | 长生命周期 CLI 进程模式（`claude-stdio`）                                          |
| `input`                                                   | 提示传输方式：`arg` 或 `stdin`                                                     |
| `maxPromptArgChars`                                       | 在回退到 stdin 之前，`arg` 模式下提示词的最大长度                                  |
| `env` / `clearEnv`                                        | 要注入的额外环境变量，或在启动前要移除的变量名                                      |
| `modelArg`                                                | 在模型 id 之前使用的标志                                                           |
| `modelAliases`                                            | 将 OpenClaw 模型 id 映射到 CLI 原生 id                                             |
| `sessionArg` / `sessionArgs`                              | 传递会话 id 的方式                                                                  |
| `sessionMode`                                             | `always`、`existing` 或 `none`                                                     |
| `sessionIdFields`                                         | OpenClaw 从 CLI 输出中读取的 JSON 字段                                             |
| `systemPromptArg` / `systemPromptFileArg`                 | 系统提示词传输方式                                                                  |
| `systemPromptFileConfigArg` / `systemPromptFileConfigKey` | 系统提示词文件的配置覆盖传输方式（例如 `-c`）                                       |
| `systemPromptMode`                                        | `append` 或 `replace`                                                              |
| `systemPromptWhen`                                        | `first`、`always` 或 `never`                                                       |
| `imageArg` / `imageMode`                                  | 图片路径标志，以及如何传递多张图片（`repeat` 或 `list`）                            |
| `imagePathScope`                                          | 交接前暂存图片文件所在位置：`temp` 或 `workspace`                                   |
| `serialize`                                               | 保持同一后端的运行顺序                                                              |
| `reseedFromRawTranscriptWhenUncompacted`                  | 选择启用在压缩前基于有界原始转录内容重新播种，以便安全重置会话                        |
| `reliability.outputLimits`                                | 单次 live CLI 轮次保留的原始 JSONL 最大字符数/行数（live-session 后端）              |
| `reliability.watchdog`                                    | 无输出超时调优，分别适用于新运行和恢复运行                                          |

优先选择与 CLI 匹配的最小静态配置。仅为真正属于后端的行为添加插件回调。

## 高级后端钩子

`CliBackendPlugin` 还可以定义：

| Hook                               | Use                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `normalizeConfig(config, context)` | 在合并后重写旧版用户配置                                      |
| `resolveExecutionArgs(ctx)`        | 添加请求作用域标志，例如思考力度或 side-question 隔离 |
| `prepareExecution(ctx)`            | 在启动前创建临时认证、配置或环境桥接         |
| `transformSystemPrompt(ctx)`       | 应用最终的 CLI 特定系统提示词转换                          |
| `textTransforms`                   | 双向提示词/输出替换                                    |
| `defaultAuthProfileId`             | 优先使用特定的 OpenClaw 认证配置文件                                     |
| `authEpochMode`                    | 决定认证变更如何使已存储的 CLI 会话失效                      |
| `nativeToolMode`                   | 声明原生工具是不存在、始终开启，还是可由宿主选择      |
| `sideQuestionToolMode`             | 为 `/btw` side questions 声明已禁用的原生工具                     |
| `bundleMcp` / `bundleMcpMode`      | 选择接入 OpenClaw 的 loopback MCP 工具桥                                |
| `ownsNativeCompaction`             | 后端拥有自己的压缩——OpenClaw 让步                           |
| `runtimeArtifact`                  | 将脚本启动器绑定到其完整的打包包树                |

保持这些钩子的提供方所有权。不要在核心中为 CLI 添加特定分支，若某个后端钩子可以表达该行为。

`prepareExecution(ctx)` 接收 `ctx.contextTokenBudget`，即为本次运行选择的有效 token
上限。拥有原生压缩的后端可以将该预算映射到其 CLI 特定的启动契约中。

`runtimeArtifact` 由插件拥有，且用户不可覆盖。只有在一次实时推理轮次铸造或重新验证已验证的设置权限时才会查询它；正常的 CLI 运行不需要它。没有该声明的后端无法铸造已验证的 CLI 设置权限。`bundled-package-tree` 声明会命名精确的 `package.json` 所有者，并要求包入口点就是该命令。OpenClaw 会对已边界化的完整已安装包树进行哈希，包括嵌套依赖，并对重定向 symlink、声明包之外的启动器、必需的外部依赖声明、过大的树以及未知脚本采取失败关闭。只有当该树包含完整的推理实现时才声明它；可选的工具集成不会让外部实现图变得安全。

如果同一个后端还提供了一个自包含的原生可执行文件，请在 `nativeExecutableNames` 中列出其规范 basename。即便用户覆盖了后端命令，其他原生命令仍然是不受验证的。

`ctx.executionMode` 在正常轮次中为 `"agent"`，在临时的 `/btw` 调用中为 `"side-question"`。当 CLI 需要不同的一次性标志时使用它，例如为 BTW 禁用原生工具、会话持久化或恢复行为。如果某个后端通常具有 `nativeToolMode: "always-on"`，但其 side-question argv 能可靠地禁用这些工具，也请设置 `sideQuestionToolMode: "disabled"`；否则当 BTW 需要无工具 CLI 运行时，OpenClaw 会失败关闭。

仅当 `resolveExecutionArgs` 能为单次运行禁用每一个后端原生工具时，才将 `nativeToolMode` 设置为 `"selectable"`。对于这些受限运行，`ctx.toolAvailability.native` 是一个空元组，且 `ctx.toolAvailability.mcp` 是精确的宿主隔离 MCP allowlist。该钩子必须替换冲突的工具标志，并返回强制执行这两个值的 argv；OpenClaw 会在最终的新鲜或恢复 argv 上调用一次，并在后端无法强制执行该限制时失败关闭。此上下文中的 MCP 名称之所以可以安全地自动批准，仅仅是因为宿主已经将生成的 MCP 配置限制到了那些服务器和工具。

### `ownsNativeCompaction`: opting out of OpenClaw compaction

如果你的后端运行的代理会压缩它**自己的**对话记录，请设置 `ownsNativeCompaction: true`，这样 OpenClaw 的保护性摘要器就绝不会对其会话运行——CLI 的压缩生命周期会返回一个 no-op，当前轮次继续执行。`claude-cli` 声明了它，因为 Claude Code 会在内部压缩，而且没有 harness 端点。像 Codex 这样的 native-harness 会话则继续路由到它们各自的 harness 压缩端点。

**只有在以下所有条件都满足时才声明它**，否则一个延后且超出预算的会话可能会继续超预算或变得陈旧（OpenClaw 将不再对其进行挽救）：

- 后端在接近其窗口上限时能够可靠地压缩或限制自己的对话记录；
- 它会持久化一个可恢复的会话，以便压缩后的状态能跨轮次保留（例如 `--resume` / `--session-id`）；
- 它不是一个 native-harness 压缩会话——与 `agentHarnessId` 匹配的会话会改为路由到 harness 端点。

## MCP 工具桥接

CLI 后端默认不会接收 OpenClaw 工具。如果 CLI 可以消费
MCP 配置，请显式启用：

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

支持的桥接模式：

| 模式                     | 用途                                                              |
| ------------------------ | ---------------------------------------------------------------- |
| `claude-config-file`     | 接受 MCP 配置文件的 CLI                                           |
| `codex-config-overrides` | 接受通过 argv 传入配置覆盖项的 CLI                                |
| `gemini-system-settings` | 从其系统设置目录读取 MCP 设置的 CLI                               |

只有在 CLI 确实能够消费时才启用桥接。如果 CLI 有
其自身内置的工具层且无法禁用，请设置 `nativeToolMode:
"always-on"`，这样当调用方要求不使用原生
工具时，OpenClaw 就可以安全失败。如果它可以在每次运行时禁用所有原生工具，请使用 `"selectable"` 并配合上面的
`resolveExecutionArgs` 契约。

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
        primary: "openai/gpt-5.6-sol",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

请记录用户最可能需要的最小覆盖项——通常只有当二进制文件不在 `PATH` 中时才需要设置 `command`。

## 验证

对于打包插件，请围绕 builder 和 setup 注册添加一个有针对性的测试，然后运行该插件的目标测试任务：

```bash
pnpm test extensions/acme-cli
```

对于本地或已安装的插件，验证发现能力并实际运行一次模型：

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "回复必须完全是：backend ok" --model acme-cli/acme-large
```

如果后端支持图像或 MCP，请添加一个实时冒烟测试，使用真实 CLI 证明这些路径可用。不要依赖静态检查来验证 prompt、图像、MCP 或会话恢复行为。

## 清单

<Check>`package.json` 包含 `openclaw.extensions` 以及发布包的构建后运行时条目</Check>
<Check>`openclaw.plugin.json` 声明了 `cliBackends` 和有意设置的 `activation.onStartup`</Check>
<Check>当 setup/model 发现应在冷启动时看到后端时，`setup.cliBackends` 已存在</Check>
<Check>`api.registerCliBackend(...)` 使用与 manifest 相同的后端 id</Check>
<Check>`agents.defaults.cliBackends.<id>` 下的用户覆盖仍然优先级更高</Check>
<Check>Session、system prompt、image 和 output parser 设置与真实 CLI 合约一致</Check>
<Check>有针对性的测试以及至少一个实时 CLI 冒烟测试证明了后端路径</Check>

## 相关内容

- [CLI 后端](/gateway/cli-backends) - 用户配置和运行时行为
- [构建插件](/plugins/building-plugins) - 包和 manifest 基础
- [插件 SDK 概览](/plugins/sdk-overview) - 注册 API 参考
- [插件清单](/plugins/manifest) - `cliBackends` 和 setup 描述符
- [Agent harness](/plugins/sdk-agent-harness) - 完整的外部 agent 运行时
