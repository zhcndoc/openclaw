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

    `cliBackends` 是运行时所有权列表；当模型选择或 `agentRuntime.id` 提及 `acme-cli` 时，它会让 OpenClaw 自动加载该插件。

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
          args: ["chat", "--output-format", "stream-json", "--prompt", "{prompt}"],
          resumeArgs: [
            "chat",
            "--resume",
            "{sessionId}",
            "--output-format",
            "stream-json",
            "--prompt",
            "{prompt}",
          ],
          output: "jsonl",
          resumeOutput: "jsonl",
          jsonlDialect: "gemini-stream-json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            large: "acme-large-2026",
            fast: "acme-fast-2026",
          },
          sessionArgs: ["--session", "{sessionId}"],
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptFileArg: "--system-file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          imagePathScope: "workspace",
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

    后端 id 必须与清单中的 `cliBackends` 条目匹配。注册的适配器是权威的插件代码；OpenClaw 配置选择后端，但不会重写其命令契约。

  </Step>
</Steps>

## 配置结构

`CliBackendConfig` 描述 OpenClaw 应如何启动和解析 CLI。上面的完整示例有意涵盖了随附的
`google-gemini-cli` 适配器所使用的相同命令、恢复、JSONL、
模型别名、会话、图像和看门狗字段：

| 字段                                                     | 用途                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `command`                                                 | 二进制名称或绝对命令路径                                                           |
| `args`                                                    | 新运行时使用的基础 argv                                                             |
| `resumeArgs`                                              | 恢复会话时使用的备用 argv；支持 `{sessionId}`                                      |
| `output` / `resumeOutput`                                 | 解析器：`json`、`jsonl` 或 `text`                                                  |
| `jsonlDialect`                                            | JSONL 事件方言：`claude-stream-json` 或 `gemini-stream-json`                       |
| `liveSession`                                             | 长生命周期 CLI 进程模式（`claude-stdio`）                                          |
| `input`                                                   | 提示词传输方式：`arg` 或 `stdin`                                                   |
| `maxPromptArgChars`                                       | `arg` 模式下在回退到 stdin 前允许的最大提示词长度                                  |
| `env` / `clearEnv`                                        | 要注入的额外环境变量，或启动前要移除的变量名称                                     |
| `modelArg`                                                | 模型 id 前使用的标志                                                                |
| `modelAliases`                                            | 将 OpenClaw 模型 id 映射到 CLI 原生 id                                             |
| `sessionArgs`                                             | 使用 `{sessionId}` 传递会话 id 的方式                                              |
| `sessionMode`                                             | `always`、`existing` 或 `none`                                                      |
| `sessionIdFields`                                         | OpenClaw 从 CLI 输出中读取的 JSON 字段                                              |
| `systemPromptArg` / `systemPromptFileArg`                 | 系统提示词传输方式                                                                  |
| `systemPromptFileConfigArg` / `systemPromptFileConfigKey` | 系统提示词文件的配置覆盖传输方式（例如 `-c`）                                      |
| `systemPromptMode`                                        | `append` 或 `replace`                                                              |
| `systemPromptWhen`                                        | `first`、`always` 或 `never`                                                       |
| `imageArg` / `imageMode`                                  | 图像路径标志，以及传递多个图像的方式（`repeat` 或 `list`）                          |
| `imagePathScope`                                          | 交接前暂存图像文件的位置：`temp` 或 `workspace`                                   |
| `serialize`                                               | 保持同一后端的运行按顺序进行                                                        |
| `reseedFromRawTranscriptWhenUncompacted`                  | 在压缩前选择使用有界原始会话记录重新播种，以安全地重置会话                            |
| `reliability.watchdog`                                    | 无输出超时调优，分别适用于新运行和恢复运行                                          |

优先选择与 CLI 匹配的最小静态配置。仅为真正属于后端的行为添加插件回调。

## 高级后端钩子

`CliBackendPlugin` 还可以定义：

| Hook                               | 用途                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `normalizeConfig(config, context)` | 使用运行时上下文规范化已注册的静态适配器                                   |
| `resolveExecutionArgs(ctx)`        | 添加请求范围的标志，例如思考力度或旁问题隔离                               |
| `prepareExecution(ctx)`            | 在启动前创建临时身份验证、配置或环境桥接                                   |
| `transformSystemPrompt(ctx)`       | 应用最终的 CLI 特定系统提示词转换                                           |
| `textTransforms`                   | 双向提示词/输出替换                                                         |
| `defaultAuthProfileId`             | 优先使用特定的 OpenClaw 身份验证配置文件                                   |
| `authEpochMode`                    | 决定身份验证变更如何使存储的 CLI 会话失效                                   |
| `nativeToolMode`                   | 声明原生工具是不存在、始终启用还是由宿主选择                               |
| `toolAvailabilityEnforcement`      | 声明确切的工具上限是在 argv 中还是在执行准备阶段强制执行                    |
| `sideQuestionToolMode`             | 为 `/btw` 旁问题声明禁用的原生工具                                         |
| `bundleMcp` / `bundleMcpMode`      | 选择加入 OpenClaw 的回环 MCP 工具桥接                                      |
| `ownsNativeCompaction`              | 后端拥有自己的压缩机制——OpenClaw 延后处理                                  |
| `subscriptionAuthDispatch`         | 选择加入：使用订阅凭据的嵌入式运行通过此后端执行                           |
| `runtimeArtifact`                  | 将脚本启动器绑定到其完整的捆绑包树                                         |

保持这些钩子的提供方所有权。不要在核心中为 CLI 添加特定分支，若某个后端钩子可以表达该行为。

`prepareExecution(ctx)` 接收 `ctx.contextTokenBudget`，即为本次运行选择的有效 token
上限。拥有原生压缩的后端可以将该预算映射到其 CLI 特定的启动契约中。

`runtimeArtifact` 由插件负责。它仅在实时推理轮次创建或重新验证已验证的设置权限时
使用；正常的 CLI 运行不需要它。没有此声明的后端无法创建已验证的 CLI 设置权限。
`bundled-package-tree` 声明会指定确切的 `package.json` 所有者，并要求包入口点就是
该命令。OpenClaw 会对有界的完整已安装包树进行哈希处理，包括嵌套依赖；对于重定向
符号链接、位于声明包之外的启动器、所需的外部依赖声明、超大目录树以及未知脚本，
会采取失败关闭策略。仅当该目录树包含完整的推理实现时才声明此项；可选的工具集成
并不能使外部实现图变得安全。

如果同一个后端还提供了自包含的原生可执行文件，请在 `nativeExecutableNames` 中列出
其规范基名。其他原生命令仍未经过验证。

`ctx.executionMode` 在正常轮次中为 `"agent"`，在临时的 `/btw` 调用中为 `"side-question"`。当 CLI 需要不同的一次性标志时使用它，例如为 BTW 禁用原生工具、会话持久化或恢复行为。如果某个后端通常具有 `nativeToolMode: "always-on"`，但其 side-question argv 能可靠地禁用这些工具，也请设置 `sideQuestionToolMode: "disabled"`；否则当 BTW 需要无工具 CLI 运行时，OpenClaw 会失败关闭。

仅当后端能够为单次运行禁用每一个后端原生工具时，才设置
`nativeToolMode: "selectable"`。受限运行会收到一个规范契约：`ctx.toolAvailability.native`
是确切的后端原生工具列表，而 `ctx.toolAvailability.openClaw` 是确切的 OpenClaw
工具名称列表。宿主会独立地将生成的 MCP 配置和授权限制为该 OpenClaw 列表；插件不得
在核心中对其进行转换，也不得添加传输前缀。

声明后端如何强制执行该契约：

- `toolAvailabilityEnforcement: "execution-args"` 要求提供
  `resolveExecutionArgs`。该钩子必须替换冲突的工具标志，禁用可在选定工具之外执行的
  自定义入口，并为全新运行和恢复运行返回强制执行契约的 argv。
- `toolAvailabilityEnforcement: "prepare-execution"` 要求提供
  `prepareExecution`。该钩子必须为每次运行暂存精确的策略，并返回
  `toolAvailabilityEnforced: true`；缺少确认时会采取失败关闭策略，且 OpenClaw 会在
  启动前清理暂存资源。

运行时上限（例如 cron 的 `toolsAllow`）会在构建此契约之前由 OpenClaw 进行规范化和分组
展开。原生工具会被禁用，而没有完整声明式强制执行路径的后端会在执行前失败。

针对 `v2026.7.2-beta.1` 至 `v2026.7.2-beta.3` 构建的插件仍可读取已弃用的
`ctx.toolAvailability.mcp` 传输名称投影；当可选择的后端实现了
`resolveExecutionArgs` 时，也可以省略 `toolAvailabilityEnforcement`。OpenClaw 会根据
插件包所需的 `openclaw.build.openclawVersion` 元数据识别这一已发布的 beta 路径，并在
`2026.8.x` 系列中保留该兼容性。新插件和更新后的插件应使用规范的
`ctx.toolAvailability.openClaw` 名称，并明确声明
`toolAvailabilityEnforcement: "execution-args"`；beta 兼容路径计划在该窗口结束后移除。

### `parseJsonlEvent`：提供方特定的 JSONL 流

当后端输出的逐行 JSON 不符合内置的 Claude、Codex 或 Gemini 方言时，设置
`parseJsonlEvent`。该钩子接收一行原始内容以及解析后的后端 id 和配置，并返回一个
规范化事件、多个事件，或返回 `null` 以让内置解析器尝试处理该行。

支持的事件包括增量助手文本、增量思考、原生工具启动/结果显示、会话 id 以及终止结果。
终止结果可以包含最终文本、用量、错误和后继会话 id。任一事件形式报告的会话 id 都会
参与恢复会话和分叉持久化。

工具事件描述的是后端已经执行的工作。OpenClaw 会渲染并汇总这些事件，但不会将其视为
宿主工具执行、可信诊断、回环关联或消息传递证据。

### `ownsNativeCompaction`：选择退出 OpenClaw 压缩

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

## 选择后端

用户通过后端的模型引用前缀选择独立后端。声明了规范 `modelProvider` 的后端，也可以通过该提供商模型的 `agentRuntime.id` 进行选择。适配器机制仍保留在插件中：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "openai/gpt-5.6-sol",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

将凭据放入 OpenClaw 身份验证配置文件或插件自有配置中。确保已注册的命令位于网关服务的 `PATH` 中；需要使用不同路径或 argv 的部署应更改或封装插件注册。

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

<Check>`package.json` 包含 `openclaw.extensions` 以及已发布软件包的构建运行时条目</Check>
<Check>`openclaw.plugin.json` 声明了 `cliBackends` 和有意设置的 `activation.onStartup`</Check>
<Check>当设置/模型发现需要在后端冷启动时感知该后端，`setup.cliBackends` 已存在</Check>
<Check>`api.registerCliBackend(...)` 使用与清单相同的后端 ID</Check>
<Check>后端模型前缀或以模型为作用域的 `agentRuntime.id` 会选择该注册项</Check>
<Check>会话、系统提示词、图像和输出解析器设置与实际 CLI 契约一致</Check>
<Check>有针对性的测试以及至少一次实时 CLI 冒烟测试证明了后端路径</Check>

## 相关内容

- [CLI 后端](/gateway/cli-backends) - 运行时选择和行为
- [构建插件](/plugins/building-plugins) - 软件包和清单基础
- [插件 SDK 概览](/plugins/sdk-overview) - 注册 API 参考
- [插件清单](/plugins/manifest) - `cliBackends` 和设置描述符
- [代理工具链](/plugins/sdk-agent-harness) - 完整的外部代理运行时
