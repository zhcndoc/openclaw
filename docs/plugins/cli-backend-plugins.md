---
summary: "构建一个注册本地 AI CLI 后端的插件"
title: "构建 CLI 后端插件"
sidebarTitle: "CLI 后端插件"
read_when:
  - "你正在构建一个本地 AI CLI 后端插件"
  - "你想为诸如 acme-cli/model 这样的模型引用注册一个后端"
  - "你需要将第三方 CLI 映射到 OpenClaw 的文本回退运行器"
---

CLI 后端插件让 OpenClaw 可以将本地 AI CLI 作为文本推理后端来调用。该后端会在模型引用中显示为一个提供方前缀：

```text
acme-cli/acme-large
```

当上游集成已公开为本地命令时、当 CLI 拥有本地登录状态时或当 API 提供程序不可用时作为后备时，请使用 CLI 后端。

<Info>
  如果上游服务提供了标准的 HTTP 模型 API，请改为编写一个 [提供方插件](/plugins/sdk-provider-plugins)。如果上游运行时拥有完整的 agent 会话、工具事件、压缩或后台任务状态，请使用一个 [agent harness](/plugins/sdk-agent-harness)。
</Info>

## <a id="what-the-plugin-owns"></a> 插件负责什么

一个 CLI 后端插件有三个契约：

| 契约             | 文件                   | 用途                                                   |
| -------------------- | ---------------------- | --------------------------------------------------------- |
| 包入口        | `package.json`         | 指向 OpenClaw 的插件运行时模块              |
| 清单所有权   | `openclaw.plugin.json` | 在运行时加载之前声明后端 id              |
| 运行时注册 | `index.ts`             | 使用命令默认值调用 `api.registerCliBackend(...)` |

清单是发现元数据：它不会执行 CLI，也不会注册运行时行为。运行时行为从插件入口调用 `api.registerCliBackend(...)` 时开始。

## <a id="minimal-backend-plugin"></a> 最小后端插件

<Steps>
  <Step id="create-package-metadata" title="创建包元数据">
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

  <Step id="declare-backend-ownership" title="声明后端所有权">
    ```json openclaw.plugin.json
    {
      "id": "acme-cli",
      "name": "Acme CLI",
      "description": "Run Acme's local AI CLI through OpenClaw",
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

  <Step id="register-the-backend" title="注册后台">
    ```typescript index.ts
    import { definePluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

    function buildAcmeCliBackend(): Parameters<OpenClawPluginApi["registerCliBackend"]>[0] {
      return {
        id: "acme-cli",
        modelProvider: "acme-cli",
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
          serialize: true,
        },
      };
    }

    export default definePluginEntry({
      id: "acme-cli",
      name: "Acme CLI",
      description: "Run Acme's local AI CLI through OpenClaw",
      register(api) {
        api.registerCliBackend(buildAcmeCliBackend());
      },
    });
    ```

    后端 id 必须与清单中的 `cliBackends` 条目匹配。注册的适配器是权威的插件代码；OpenClaw 配置选择后端，但不会重写其命令契约。

    将 `modelProvider` 设置为 CLI 执行其模型的规范模型提供者。它可以匹配后端 ID（如上所述）或单独的提供商 ID。省略它或提供空白值会在运行时或仅安装注册期间发出警告：直接 CLI 引用仍然有效，但不会创建提供程序到运行时的绑定。 OpenClaw 不会从 `id` 推断出该字段。

  </Step>
</Steps>

## <a id="config-shape"></a> 配置结构

`CliBackendConfig` 描述了 OpenClaw 应如何启动和解析 CLI。上面的示例有意执行与捆绑的 `google-gemini-cli` 适配器相同的命令、简历、JSONL、模型别名、会话和图像字段：

| 字段                                                     | 用途                                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `command`                                                 | 二进制名称或绝对命令路径                                              |
| `args`                                                    | 新运行时使用的基础 argv                                                          |
| `resumeArgs`                                              | 恢复会话时使用的备用 argv；支持 `{sessionId}`                       |
| `output` / `resumeOutput`                                 | 解析器：`json`、`jsonl` 或 `text`                                                |
| `jsonlDialect`                                            | JSONL 事件方言：`claude-stream-json` 或 `gemini-stream-json`                 |
| `liveSession`                                             | 长生命周期 CLI 进程模式（`claude-stdio`）                                      |
| `input`                                                   | 提示词传输方式：`arg` 或 `stdin`                                                |
| `maxPromptArgChars`                                       | `arg` 模式下在回退到 stdin 前允许的最大提示词长度                     |
| `env` / `clearEnv`                                        | 要注入的额外环境变量，或启动前要移除的变量名称                         |
| `modelArg`                                                | 模型 id 前使用的标志                                                     |
| `modelAliases`                                            | 将 OpenClaw 模型 id 映射到 CLI-native id                                          |
| `sessionArgs`                                             | 使用 `{sessionId}` 传递会话 id 的方式                                      |
| `sessionMode`                                             | `always`、`existing` 或 `none`                                                   |
| `sessionIdFields`                                         | JSON 字段 OpenClaw 从 CLI 输出读取                                        |
| `systemPromptArg` / `systemPromptFileArg`                 | 系统提示词传输方式                                                           |
| `systemPromptFileConfigArg` / `systemPromptFileConfigKey` | 系统提示词文件的配置覆盖传输方式（例如 `-c`）             |
| `systemPromptMode`                                        | `append` 或 `replace`                                                             |
| `systemPromptWhen`                                        | `first`、`always` 或 `never`                                                     |
| `imageArg` / `imageMode`                                  | 图像路径标志，以及传递多个图像的方式（`repeat` 或 `list`）              |
| `imagePathScope`                                          | 交接前暂存图像文件的位置：`temp` 或 `workspace`               |
| `serialize`                                               | 保持同一后端的运行按顺序进行                                                    |
| `reseedFromRawTranscriptWhenUncompacted`                  | 在压缩前选择使用有界原始会话记录重新播种，以安全地重置会话 |
| `freshSessionRecovery`                                    | 可恢复的恢复会话失败后的新恢复策略                 |
| `reliability.watchdog`                                    | 无输出超时调优，分别适用于新运行和恢复运行                      |

`claude-stream-json` 不仅仅是一个解析器选择：它声明后端的 `result` 记录携带 Claude Code 的终端语义，包括 `terminal_reason`。 `terminal_reason` 为 `hook_stopped`、`stop_hook_prevented`、`aborted_tools`、`aborted_streaming`、`budget_exhausted` 或 `max_turns` 的无应答 `result` 是记录的转弯停止：OpenClaw向用户报告该原因，并且不会在后备模型上重放回合，因为后端的工具操作可能已经运行。

省略 `reliability.watchdog` 以继承标准配置文件，包括 cron 的较长恢复运行预算和显式超时。仅当后端有意需要自己的看门狗策略时才设置它。

恢复重试保留在操作员配置的 `timeoutMs` 内：单调测量经过的时间，因此 NTP 校正或手动时钟更改既不能缩短仍有预算的重试，也不能让挂起的 CLI 超过其超时时间。

`freshSessionRecovery` 是后端拥有的兼容性合约：

- 将其保留为未定义或将其设置为 `"replace-binding"` 以保留旧的清除和重新设定种子行为。 OpenClaw 清除持久绑定，并在故障符合恢复条件时使用新会话重试。
- 将其设置为 `"invalidated-only"` 以抑制新的替换，除非共享失效检查证明旧会话已死亡。只有 `session_expired` 这样做。

从 CLI 或 SDK 会话合约中选择值，而不是从提供商 ID 或广泛错误类中选择。捆绑的Anthropic后端使用`"invalidated-only"`；其本机会话合约不会将未过期失败视为对话无法再恢复的证据。

优先选择与 CLI 匹配的最小静态配置。仅为真正属于后端的行为添加插件回调。

## <a id="advanced-backend-hooks"></a> 高级后端钩子

`CliBackendPlugin` 还可以定义：

| 钩子                               | 用途                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `normalizeConfig(config, context)` | 使用运行时上下文规范化已注册的静态适配器                      |
| `resolveExecutionArgs(ctx)`        | 添加请求范围的标志，例如思考强度或侧问题隔离       |
| `prepareExecution(ctx)`            | 在启动前创建临时身份验证、配置或环境桥接               |
| `transformSystemPrompt(ctx)`       | 应用最终的 CLI- 特定系统提示转换                                |
| `textTransforms`                   | 双向 prompt/output 替代品                                          |
| `defaultAuthProfileId`             | 优先使用特定的 OpenClaw 身份验证配置                                           |
| `authEpochMode`                    | 决定身份验证变更如何使存储的 CLI 会话失效                            |
| `nativeToolMode`                   | 声明原生工具是不存在、始终启用，还是由宿主选择            |
| `toolAvailabilityEnforcement`      | 声明是在 argv 中还是在执行暂存阶段强制执行精确的工具上限         |
| `projectNativeToolAuthority`       | 将观察到的本机工具列表映射到 cron 上限的标准 OpenClaw 功能 |
| `sideQuestionToolMode`             | 为 `/btw` 侧问题声明禁用的原生工具                           |
| `bundleMcp` / `bundleMcpMode`      | 选择加入 OpenClaw 的回环 MCP 工具桥接                                      |
| `ownsNativeCompaction`             | 后端拥有自己的自动压缩 - OpenClaw defers                       |
| `manualCompaction`                 | 原子命令、传输和肯定确认合约                  |
| `subscriptionAuthDispatch`         | 选择加入的、使用订阅凭据执行的嵌入式运行通过此后端执行       |
| `runtimeArtifact`                  | 将脚本启动器绑定到其完整的捆绑包树                      |

让这些钩子归提供商所有。当后端挂钩可以表达行为时，请勿将 CLI- 特定分支添加到核心。

`prepareExecution(ctx)` 接收 `ctx.contextTokenBudget`，即为运行选择的有效代币限制。拥有本机压缩的后端可以将该预算映射到其 CLI- 特定启动合约中。它还接收可选的有效 `ctx.thinkingLevel`：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`。当所选级别必须通过启动环境或分阶段配置应用时，请使用该字段；对于本机 CLI 标志，相同的字段可用于 `resolveExecutionArgs(ctx)`。

`resolveExecutionArgs(ctx)` 还接收可选的 `ctx.fastMode`，即此调用的有效布尔值。核心在 CLI 后解析自动模式并处理范围准入和后端准备，因此经过的等待计入其截止时间。显式打开和关闭保持不变。该字段遵循会话、代理和模型快速模式设置；后端可以将其映射到其本机参数或忽略它。生成的进程会保留调用的决定；它不接收原始 `"auto"`。

当后端拥有已安装的 CLI 协议或 SDK 集成时，`prepareExecution(ctx)` 也可能返回可选的 `execute` 传输。传输接收准确准备的命令、参数、可选的 `argv0`、环境、提示、会话和工具可用性；它产生后端现有的结构化流记录。构造 CLI 调用时，在 `args` 中保留准备好的命令 `argv0` 和解释器或脚本前缀。 `argv0` 保留 PATH 填充程序的调用名称。可选的 `promptContext.prependContext` 和 `promptContext.appendContext` 是私人提示构建添加和有界保存的会话注释，与普通的 `prompt` 分开。保存的注释是引用的参考数据，并且可能会在恢复轮次时重复；他们并不断言先前的原生转变消耗了他们。通过本机运行时的私有上下文机制传输它们；切勿将它们记录为操作员编写的输入。 OpenClaw 的策略和观察钩子仍然收到完整的逻辑提示。本机工具操作必须使用提供的运行绑定 `requestToolPermission` 回调，而不是创建独立的审批权限。 OpenClaw 保留取消、看门狗、会话策略，并且 MCP 授予所有权。配对节点执行和手动压缩继续通过现有的主机管理的进程路径。

可重用传输具有运行绑定 `liveSession` 功能。在创建初始或替换流程之前，请等待 `liveSession.restart()`，除非当前流程可重用。这加入了之前的进程退出及其主机拥有的资源清理；仅等待子进程退出是不够的。当调用者被撤销或必须保留确切的实时生成时，主机拒绝重新启动。 `register()` 保持同步准入检查，并在清理未解决时拒绝替换。

可以接受用户输入已在飞行中的转弯的运行时通过 `ctx.registerMessageInjection` 提供它。一旦回合准备好接受输入就调用它；然后，主机公开该运行的同转弯转向，而不是将消息作为单独的转弯进行排队。接收器应答 `isAvailable()` 进行准入，并仅在运行时确认消耗后才解析 `queueMessage(text, withCurrent)`，而不仅仅是在写入 stdin 后。将同步本机写入传递给`await withCurrent(submit)`：主机在调用它之前准备当前源和工具权限。重新检查 `submit` 内的本机可用性，因此在准备期间完成的回合在写入之前会被拒绝。当输入从未开始时拒绝，因此主机将其作为普通的排队回合重放，而不是丢失它；主机在会话记录中记录开始的输入，因此运行时不得将其写入其中。注册与运行一样长。

对于捆绑或官方插件的双向进程，请使用共享 [`createOwnedStdioProcess` 所有者 ](/plugins/sdk-overview/infrastructure#owned-stdio-processes) 以及准备好的命令、参数、`argv0` 和 `exactEnv: true`。在POSIX上，`terminateOnHostLoss: true`在主机丢失变成协议EOF之前停止进程树；显式 stdin 关闭仍然很优雅。这可以防止未应答的权限挂钩在网关被杀死后继续。在发布现场会话注册之前加入 `closeOwnedStdioProcess`。

`runtimeArtifact` 是插件拥有的。仅当实时推理生成或重新验证经过验证的设置权限时才会查阅它；正常的 CLI 运行不需要它。没有此声明的后端无法创建经过验证的 CLI 设置权限。 `bundled-package-tree` 声明指定了确切的 `package.json` 所有者，并要求包入口点是命令。 OpenClaw 对有界的完整安装包树（包括嵌套依赖项）进行哈希处理，并拒绝重定向符号链接、已声明包外部的启动器、所需的外部依赖项声明、超大树和未知脚本。仅当该树包含完整的推理实现时才声明这一点；可选的工具集成并不能使外部实现图安全。

在 Windows 上，受支持的 JavaScript 入口点通过从 `PATH` 中选择的经过验证的 Node 可执行文件运行。显式脚本路径不需要 `PATHEXT` 中的后缀；裸命令查找仍然遵循 `PATH` 和 `PATHEXT`。

如果同一后端还提供独立的本机可执行文件，请在 `nativeExecutableNames` 中列出其标准基本名称。其他本机命令仍未验证。

`ctx.executionMode` is `"agent"`对于正常转弯和`"side-question"`对于短暂的`/btw`来电。当CLI需要不同的一次性标志，例如禁用本机工具、会话持久性或恢复行为BTW。如果后端通常有`nativeToolMode: "always-on"`但它的附带问题 argv 可靠地禁用了这些工具，也设置了`sideQuestionToolMode: "disabled"`；否则OpenClaw拒绝运行时BTW无需工具CLI跑步。

仅当后端可以禁用单个运行的每个后端本机工具时，才设置 `nativeToolMode: "selectable"`。受限运行接收共享合约：`ctx.toolAvailability.native` 是确切的后端本机列表，`ctx.toolAvailability.openClaw` 是 OpenClaw 工具名称的确切列表。主机独立限制生成的MCP配置并授予该OpenClaw列表；插件不得在核心中对其进行翻译或添加传输前缀。

声明后端如何强制执行该契约：

- `toolAvailabilityEnforcement: "execution-args"` 要求提供 `resolveExecutionArgs`。该钩子必须替换冲突的工具标志，禁用可在选定工具之外执行的自定义入口，并为全新运行和恢复运行返回强制执行契约的 argv。
- `toolAvailabilityEnforcement: "prepare-execution"` 需要 `prepareExecution`。挂钩必须执行精确的每次运行策略并返回 `toolAvailabilityEnforced: true`；缺少确认会阻止启动，OpenClaw 会清理暂存资源。

运行时上限（例如 cron 的 `toolsAllow`）会在构建此契约之前由 OpenClaw 进行规范化和分组展开。原生工具会被禁用，而没有完整声明式强制执行路径的后端会在执行前失败。

其本机工具可模型调用的后端可以声明 `projectNativeToolAuthority(nativeTools)`，以便从其会话创建的自动化保留创建者的本机功能。对于 Claude 流-JSON，输入是父回合的 `system/init.tools` 列表，当存在主机选择时与 `toolAvailability.native` 相交。托管本机设置可以在选择 CLI 参数后删除工具，因此永远不会推断默认值。每个回合都以待定权限开始：MCP 发现仍然可用，但工具调用明显拒绝，直到初始化提供列表。热转弯不能借用前一转弯的快照。仅返回核心词汇表中的标准名称（`read`、`write`、`edit`、`apply_patch`、`exec`、`process`、`web_search`、`web_fetch`），每个名称均源自主机通过本机工具强制执行的名称这份合同。核心在更新活动环回授权之前验证结果，并在最终的创建者上限捕获时再次验证结果；任何其他名字都失败。更新快照会使之前缓存的工具投影失效。仅项目等效功能：Claude 的 `Glob` 定位路径，`NotebookEdit` 编辑笔记本单元，因此两者都不授予通用 `read` 或 `edit`。本机列表包含工具名称，而不是权限规则模式。在 OpenClaw 显式请求 shell 并拒绝托管要求或禁用它的旧托管设置后，Codex 本机代码模式项目 `read` 和 `exec`。每次飞行前都会检查有效设置及其来源；对于本机模式，用户本地 shell 禁用被覆盖，而托管拒绝在捕获之前拒绝。它从不推断 `write`、`edit`、`apply_patch` 或 `process`。固定的 Codex 注册表没有禁用 shell 的模型；禁用其 shell 的自定义模型仍然是不可观察的异常，因为 Codex 不公开该模型功能。

以前保存的空自动化上限仍然受到限制。重新创建作业或从新的授权创建者轮流显式编辑其工具；不能安全地将旧的空帽与故意拒绝区分开来。

### <a id="parsejsonlevent%3A-provider-specific-jsonl-streams"></a><a id="parsejsonlevent-provider-specific-jsonl-streams"></a> `parseJsonlEvent`：提供方特定的 JSONL 流

当后端输出的逐行 JSON 不符合内置的 Claude、Codex 或 Gemini 方言时，设置 `parseJsonlEvent`。该钩子接收一行原始内容以及解析后的后端 id 和配置，并返回一个规范化事件、多个事件，或返回 `null` 以让内置解析器尝试处理该行。

支持的事件包括增量助理文本、增量思维、本机工具 start/result 显示、会话 ID 和终端结果。终端结果可能包括最终文本、用法、错误和后继会话 ID。任一事件形状报告的会话 ID 参与恢复会话和分叉持久性。

生命周期事件有意与此返回联合分开，因此现有插件可以继续详尽地匹配它。请使用 `parseJsonlLifecycleEvent` 作为后端拥有的生命周期记录。

工具事件描述的是后端已经执行的工作。OpenClaw 会渲染并汇总这些事件，但不会将其视为宿主工具执行、可信诊断、回环关联或消息传递证据。

### <a id="parsejsonllifecycleevent%3A-provider-native-lifecycle-records"></a><a id="parsejsonllifecycleevent-provider-native-lifecycle-records"></a> `parseJsonlLifecycleEvent`：提供者本机生命周期记录

当后端发出独立于助手文本、工具、会话和终端结果的生命周期状态的 JSONL 记录时，设置 `parseJsonlLifecycleEvent`。该钩子接收与 `parseJsonlEvent` 相同的行和上下文，并首先尝试。返回生命周期事件会消耗该行；返回 `null` 让源兼容的 `parseJsonlEvent` 挂钩或内置解析器处理它。

当前的生命周期合约支持本机压缩开始和结束记录。最终记录包括 `completed`，因此通道可以区分成功和不完整的压缩，而无需从后续消息推断结果。

### <a id="ownsnativecompaction%3A-opting-out-of-openclaw-compaction"></a><a id="ownsnativecompaction-opting-out-of-openclaw-compaction"></a> `ownsNativeCompaction`：选择退出 OpenClaw 压缩

如果您的后端运行压缩其 **own** 转录本的代理，请设置 `ownsNativeCompaction: true`，以便 OpenClaw 的保护摘要器永远不会针对其会话运行 - 自动 CLI 压缩会推迟到后端，然后继续进行。 `claude-cli` 声明它是因为 Claude Code 内部压缩，没有harness端点。它还声明了 `manualCompaction`，因此显式 OpenClaw `/compact` 恢复绑定的 Claude Code 会话并调用其本机 `/compact` 命令，而不记录对话轮次。诸如 Codex 之类的本机harness会话会继续路由到其harness压缩端点。

**只有在以下所有条件都满足时才声明它**，否则一个延后且超出预算的会话可能会继续超预算或变得陈旧（OpenClaw 将不再对其进行挽救）：

- 后端在接近其窗口上限时能够可靠地压缩或限制自己的对话记录；
- 它会持久化一个可恢复的会话，以便压缩后的状态能跨轮次保留（例如 `--resume` / `--session-id`）；
- 它不是一个原生 harness 压缩会话——与 `agentHarnessId` 匹配的会话会改为路由到 harness 端点。

如果后端支持就地手动命令，请在所有权标志旁边声明它：

```typescript
manualCompaction: {
  buildPrompt: (instructions) =>
    instructions ? `/compact ${instructions}` : "/compact",
  input: "arg",
  validateOutput: (rawOutput) =>
    rawOutput.includes('"type":"compaction_complete"')
      ? { ok: true }
      : { ok: false, reason: "CLI did not confirm compaction." },
},
```

构建器接收可选的 `/compact` 指令。验证器接收有界的原始过程输出，并且必须要求后端拥有的肯定确认；单独的零出口并不能证明压缩。不要为创建单独会话或需要普通模型转向的命令声明此功能。

## <a id="mcp-tool-bridge"></a> MCP 工具桥接

CLI 后端默认不会接收 OpenClaw 工具。如果 CLI 可以消费 MCP 配置，请显式启用：

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
| `claude-config-file`     | 接受 MCP 配置文件的 CLI                              |
| `codex-config-overrides` | 接受 argv 上的配置覆盖的 CLI                        |
| `gemini-system-settings` | 从系统设置目录读取 MCP 设置的 CLI |

仅当 CLI 实际可以消耗桥时才启用桥。如果 CLI 有自己的内置工具层且无法禁用，请设置 `nativeToolMode: "always-on"`，以便当调用者不需要本机工具时 OpenClaw 可以拒绝运行。如果它可以在每次运行时禁用每个本机工具，请将 `"selectable"` 与上面的 `resolveExecutionArgs` 合约一起使用。

## <a id="selecting-the-backend"></a> 选择后端

用户通过其 model-ref 前缀选择独立后端。可以通过该提供程序模型的 `agentRuntime.id` 选择声明标准 `modelProvider` 的后端。适配器机制保留在插件中：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "openai/gpt-6-astra",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

将凭据放入 OpenClaw 身份验证配置文件或插件拥有的配置中。检查注册的命令是否在网关服务的`PATH`上；需要不同路径或 argv 的部署应更改或包装插件注册。

## <a id="verification"></a> 验证

对于打包插件，请围绕 builder 和 setup 注册添加一个有针对性的测试，然后运行该插件的目标测试任务：

```bash
pnpm test extensions/acme-cli
```

对于本地或已安装的插件，验证发现能力并实际运行一次模型：

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "reply exactly: backend ok" --model acme-cli/acme-large
```

如果后端支持图像或 MCP，请添加一个实时冒烟测试，使用真实 CLI 证明这些路径可用。不要依赖静态检查来验证 prompt、图像、MCP 或会话恢复行为。

## <a id="checklist"></a> 清单

<Check>`package.json` 包含 `openclaw.extensions` 以及已发布软件包的构建运行时条目</Check>
<Check>`openclaw.plugin.json` 声明了 `cliBackends` 和有意设置的 `activation.onStartup`</Check>
当 setup/model 发现应该看到后端冷</Check> 时，<Check>`setup.cliBackends` 存在
<Check>`api.registerCliBackend(...)` 使用与清单相同的后端 id</Check>
<Check>后端模型前缀或以模型为作用域的 `agentRuntime.id` 会选择该注册项</Check>
<Check>会话、系统提示词、图像和输出解析器设置与实际 CLI 契约一致</Check>
<Check>有针对性的测试以及至少一次实时 CLI 冒烟测试证明了后端路径</Check>

## <a id="related"></a> 相关内容

- [CLI 后端](/gateway/cli-backends) - 运行时选择和行为
- [构建插件](/plugins/building-plugins) - 软件包和清单基础
- [插件 SDK 概览](/plugins/sdk-overview) - 注册 API 参考
- [插件清单](/plugins/manifest) - `cliBackends` 和设置描述符
- [代理工具链](/plugins/sdk-agent-harness) - 完整的外部代理运行时。
