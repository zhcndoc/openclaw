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

    `cliBackends` is the runtime ownership list; it lets OpenClaw auto-load the
    plugin when model selection or `agentRuntime.id` mentions `acme-cli`.

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

    The backend id must match the manifest `cliBackends` entry. The registered
    adapter is authoritative plugin code; OpenClaw config selects the backend
    but does not rewrite its command contract.

  </Step>
</Steps>

## 配置结构

`CliBackendConfig` describes how OpenClaw should launch and parse the CLI. The
worked example above intentionally exercises the same command, resume, JSONL,
model-alias, session, image, and watchdog fields as the bundled
`google-gemini-cli` adapter:

| Field                                                     | Use                                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `command`                                                 | Binary name or absolute command path                                              |
| `args`                                                    | Base argv for fresh runs                                                          |
| `resumeArgs`                                              | Alternate argv for resumed sessions; supports `{sessionId}`                       |
| `output` / `resumeOutput`                                 | Parser: `json`, `jsonl`, or `text`                                                |
| `jsonlDialect`                                            | JSONL event dialect: `claude-stream-json` or `gemini-stream-json`                 |
| `liveSession`                                             | Long-lived CLI process mode (`claude-stdio`)                                      |
| `input`                                                   | Prompt transport: `arg` or `stdin`                                                |
| `maxPromptArgChars`                                       | Max prompt length for `arg` mode before falling back to stdin                     |
| `env` / `clearEnv`                                        | Extra env vars to inject, or names to strip before launch                         |
| `modelArg`                                                | Flag used before the model id                                                     |
| `modelAliases`                                            | Map OpenClaw model ids to CLI-native ids                                          |
| `sessionArgs`                                             | How to pass a session id using `{sessionId}`                                      |
| `sessionMode`                                             | `always`, `existing`, or `none`                                                   |
| `sessionIdFields`                                         | JSON fields OpenClaw reads from CLI output                                        |
| `systemPromptArg` / `systemPromptFileArg`                 | System prompt transport                                                           |
| `systemPromptFileConfigArg` / `systemPromptFileConfigKey` | Config-override transport for a system prompt file (for example `-c`)             |
| `systemPromptMode`                                        | `append` or `replace`                                                             |
| `systemPromptWhen`                                        | `first`, `always`, or `never`                                                     |
| `imageArg` / `imageMode`                                  | Image path flag and how to pass multiple images (`repeat` or `list`)              |
| `imagePathScope`                                          | Where staged image files live before handoff: `temp` or `workspace`               |
| `serialize`                                               | Keep same-backend runs ordered                                                    |
| `reseedFromRawTranscriptWhenUncompacted`                  | Opt in to bounded raw-transcript reseed before compaction for safe session resets |
| `reliability.watchdog`                                    | No-output timeout tuning, separate for fresh vs resumed runs                      |

优先选择与 CLI 匹配的最小静态配置。仅为真正属于后端的行为添加插件回调。

## 高级后端钩子

`CliBackendPlugin` 还可以定义：

| Hook                               | Use                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `normalizeConfig(config, context)` | Normalize the registered static adapter with runtime context                |
| `resolveExecutionArgs(ctx)`        | Add request-scoped flags such as thinking effort or side-question isolation |
| `prepareExecution(ctx)`            | Create temporary auth, config, or environment bridges before launch         |
| `transformSystemPrompt(ctx)`       | Apply a final CLI-specific system prompt transform                          |
| `textTransforms`                   | Bidirectional prompt/output replacements                                    |
| `defaultAuthProfileId`             | Prefer a specific OpenClaw auth profile                                     |
| `authEpochMode`                    | Decide how auth changes invalidate stored CLI sessions                      |
| `nativeToolMode`                   | Declare whether native tools are absent, always on, or host-selectable      |
| `toolAvailabilityEnforcement`      | Declare whether exact tool caps are enforced in argv or execution staging   |
| `sideQuestionToolMode`             | Declare disabled native tools for `/btw` side questions                     |
| `bundleMcp` / `bundleMcpMode`      | Opt into OpenClaw's loopback MCP tool bridge                                |
| `ownsNativeCompaction`             | Backend owns its own compaction - OpenClaw defers                           |
| `subscriptionAuthDispatch`         | Opted-in embedded runs on subscription credentials execute via this backend |
| `runtimeArtifact`                  | Bound a script launcher to its complete bundled package tree                |

保持这些钩子的提供方所有权。不要在核心中为 CLI 添加特定分支，若某个后端钩子可以表达该行为。

`prepareExecution(ctx)` 接收 `ctx.contextTokenBudget`，即为本次运行选择的有效 token
上限。拥有原生压缩的后端可以将该预算映射到其 CLI 特定的启动契约中。

`runtimeArtifact` is plugin-owned. It is consulted
only when a live inference turn mints or revalidates verified setup authority;
normal CLI runs do not require it. A backend without this declaration cannot
mint verified CLI setup authority. A `bundled-package-tree` declaration names
the exact `package.json` owner and requires the package entrypoint to be the
command. OpenClaw hashes the bounded complete installed package tree, including
nested dependencies, and fails closed for redirecting symlinks,
launchers outside the declared package, required external dependency
declarations, oversized trees, and unknown scripts. Declare this only when that
tree contains the complete inference implementation; optional tool integrations
do not make an external implementation graph safe.

If the same backend also ships a self-contained native executable, list its
canonical basenames in `nativeExecutableNames`. Other native commands remain
unverified.

`ctx.executionMode` 在正常轮次中为 `"agent"`，在临时的 `/btw` 调用中为 `"side-question"`。当 CLI 需要不同的一次性标志时使用它，例如为 BTW 禁用原生工具、会话持久化或恢复行为。如果某个后端通常具有 `nativeToolMode: "always-on"`，但其 side-question argv 能可靠地禁用这些工具，也请设置 `sideQuestionToolMode: "disabled"`；否则当 BTW 需要无工具 CLI 运行时，OpenClaw 会失败关闭。

Set `nativeToolMode: "selectable"` only when the backend can disable every
backend-native tool for an individual run. Restricted runs receive a canonical
contract: `ctx.toolAvailability.native` is the exact backend-native list and
`ctx.toolAvailability.openClaw` is the exact list of OpenClaw tool names. The
host independently limits the generated MCP configuration and grant to that
OpenClaw list; plugins must not translate it in core or add transport prefixes.

Declare how the backend enforces that contract:

- `toolAvailabilityEnforcement: "execution-args"` requires
  `resolveExecutionArgs`. The hook must replace conflicting tool flags, disable
  customization surfaces that can execute outside the selected tools, and
  return enforcing argv for both fresh and resumed runs.
- `toolAvailabilityEnforcement: "prepare-execution"` requires
  `prepareExecution`. The hook must stage an exact per-run policy and return
  `toolAvailabilityEnforced: true`; missing acknowledgement fails closed and
  OpenClaw cleans up the staged resources before launch.

Runtime caps such as cron `toolsAllow` are normalized and group-expanded by
OpenClaw before this contract is built. Native tools are disabled, and a
backend without a complete declared enforcement path fails before execution.

Plugins built against `v2026.7.2-beta.1` through `v2026.7.2-beta.3` may still
read the deprecated `ctx.toolAvailability.mcp` transport-name projection and
may omit `toolAvailabilityEnforcement` when a selectable backend implements
`resolveExecutionArgs`. OpenClaw recognizes that shipped beta path from the
plugin package's required `openclaw.build.openclawVersion` metadata and
preserves it through the `2026.8.x` line. New and updated plugins should use canonical
`ctx.toolAvailability.openClaw` names and declare
`toolAvailabilityEnforcement: "execution-args"` explicitly; the beta
compatibility path is scheduled for removal after that window.

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

## Selecting the backend

Users select a standalone backend through its model-ref prefix. A backend that
declares a canonical `modelProvider` can instead be selected through that
provider model's `agentRuntime.id`. Adapter mechanics remain in the plugin:

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

Put credentials in OpenClaw auth profiles or plugin-owned config. Ensure the
registered command is on the gateway service's `PATH`; deployments that need a
different path or argv should change or wrap the plugin registration.

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

<Check>`package.json` has `openclaw.extensions` and built runtime entries for published packages</Check>
<Check>`openclaw.plugin.json` declares `cliBackends` and intentional `activation.onStartup`</Check>
<Check>`setup.cliBackends` is present when setup/model discovery should see the backend cold</Check>
<Check>`api.registerCliBackend(...)` uses the same backend id as the manifest</Check>
<Check>The backend model prefix or model-scoped `agentRuntime.id` selects the registration</Check>
<Check>Session, system prompt, image, and output parser settings match the real CLI contract</Check>
<Check>Targeted tests and at least one live CLI smoke prove the backend path</Check>

## 相关内容

- [CLI backends](/gateway/cli-backends) - runtime selection and behavior
- [Building plugins](/plugins/building-plugins) - package and manifest basics
- [Plugin SDK overview](/plugins/sdk-overview) - registration API reference
- [Plugin manifest](/plugins/manifest) - `cliBackends` and setup descriptors
- [Agent harness](/plugins/sdk-agent-harness) - full external agent runtimes
