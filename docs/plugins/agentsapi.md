---
summary: "使用由 Codex 提供支持的云托管代理 API harness和 OpenClaw"
doc-schema-version: 1
read_when:
  - "您想要将代理 API 设置为 OpenClaw 代理运行时"
  - "您希望通过聊天渠道、说明和工具进行托管执行"
title: "智能体 API"
---

<a id="agents-api-mvp" />
<a id="agents-api" />

## <a id="what-is-agents-api%3F"></a><a id="what-is-agents-api"></a> 什么是代理API？

捆绑的 `agentsapi` 插件将 OpenClaw 的内置代理harness替换为代理 API harness，后者在引擎盖下使用 Codex harness。 **代理harness在OpenAI的云中运行。**它管理对话以及调用模型、使用工具和继续任务的循环。

OpenClaw 将该harness连接到您的聊天频道、个人指令、内存和配置的工具。您可以通过相同的渠道继续与助手进行交互，并将进度、回复和生成的文件传送回对话中。

通过本指南中的托管设置，OpenAI 还提供 Linux 环境，您的代理可以在其中运行代码并处理文件。您可以要求它分析数据、研究主题或生成文件，然后通过后续消息优化结果，而无需配置单独的执行机器。

<a id="what-works-with-a-hosted-vm" />

### <a id="what-you-can-do"></a> 你能做什么

- **运行代码并分析数据。** 要求代理使用 Python、Node.js 或 shell 命令来计算结果、处理数据集或自动执行任务。
- **在聊天中处理文件。** 发送文档或数据文件，要求代理对其进行转换，并从其回复中下载完成的输出。
- **研究和使用连接的工具。** 将内置网络搜索与启用的 OpenClaw 工具、内存和连接的 MCP 服务器相结合。
- **继续进行后续工作。** 优化结果、添加另一个文件或在运行时重定向工作，所有这些都在同一个对话中进行。
- **保留助手的上下文。** 新会话会接收您的 OpenClaw 角色和说明，以便代理从一开始就可以按照您的偏好进行工作。

托管设置适用于个人单用户网关。如果您希望命令在您管理的基础设施上运行，请参阅 [ 自托管执行](/plugins/agentsapi#self-hosted-execution)。

## <a id="set-up-agents-api"></a> 设立代理 API

从工作的 OpenClaw 网关和聊天通道开始。您还需要 OpenAI API 密钥和适用于您的 Agents API 项目的模型。

### <a id="1.-sign-in-with-an-api-key"></a><a id="1-sign-in-with-an-api-key"></a> 1。使用 API 密钥登录

运行：

```bash
openclaw models auth login --provider openai --method api-key
```

使用具有代理和响应 read/write 以及模型读取权限的密钥。运行时使用官方 `https://api.openai.com/v1` 端点和 `openai-responses` 适配器。请参阅 [OpenAI setup](/providers/openai/setup#getting-started) 以获取身份验证帮助。

请求使用与其他本机 OpenAI 请求相同的属性标头，将 OpenClaw 标识为 `User-Agent: openclaw/<version>`、`originator: openclaw` 和 `version: <version>`。

### <a id="2.-enable-the-plugin-and-choose-your-model"></a><a id="2-enable-the-plugin-and-choose-your-model"></a> 2。启用插件并选择您的模型

将其合并到您现有的 `openclaw.json` 中，保留您的频道设置和其他插件。将两个位置的 `YOUR_MODEL_ID` 替换为您的 Agents API 项目可用的模型。

```json5
{
  plugins: {
    entries: {
      agentsapi: { enabled: true },
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/YOUR_MODEL_ID" },
      models: {
        "openai/YOUR_MODEL_ID": { agentRuntime: { id: "agentsapi" } },
      },
    },
  },
}
```

如果您使用 `plugins.allow`，请将 `agentsapi` 和 `openai` 添加到该列表中。启用插件使其可用；该模型的 `agentRuntime` 设置选择它进行对话。有关提供程序和每个代理模型设置，请参阅 [ 运行时配置](/plugins/sdk-agent-harness/runtime-config)。

### <a id="shared-model-tuning"></a> 共享模型调优

代理 API 使用其自己的本机上下文管理。共享 OpenClaw 设置 `responsesServerCompaction` 和 `responsesCompactThreshold` 不会阻止选择它，但它们不控制托管压缩（包括当 `responsesServerCompaction` 为 `false` 时）。当您将相同模型与 OpenClaw 运行时一起使用时，它们会保持现有行为。模型功能元数据（例如 `supportsTemperature` 和 `codeMode`）也不需要精确的本机实现。

这是尽力调整兼容性，而不是删除请求策略的权限。自定义端点、身份验证、标头、请求参数和存储行为仍然需要一个能够支持它们的运行时；代理API继续需要其官方API-key路由。

### <a id="3.-start-a-conversation-and-try-a-task"></a><a id="3-start-a-conversation-and-try-a-task"></a> 3。开始对话并尝试执行任务

在Control UI中，打开**新会话→环境**并选择**Hosted下的**OpenAI（代理API）**工作区**。该选项使用网关配置的 model/runtime 选择和 API-key 可用性。如果另一个运行时应保留默认值，请将 `pickerRuntimes: ["agentsapi"]` 添加到确切的模型条目，而不是更改其 `agentRuntime`。请参阅 [ 模型运行时选择](/concepts/models#choose-the-same-model-with-different-runtimes)。托管选择不会复制您选择的本地文件夹、项目或工作树；将输入文件作为聊天附件发送。切换回来会恢复您的本地草稿选择，并且需要可用的兼容主机运行时。

通过通常的网关工作流程应用配置。在您的聊天频道中，发送 `/new`，然后尝试：

> 使用Python计算1到100的平方和并显示结果。

查找计算结果`338350`。这会检查从聊天到托管代码执行以及返回的路径。然后要求代理重复计算 1 到 200，以尝试在同一会话中进行后续操作。您可以在 [ 使用文件和工具 ](/plugins/agentsapi#work-with-files-and-tools) 中浏览附件和生成的文件。

<a id="sessions-and-instructions" />

## <a id="continue-a-task"></a> 继续任务

后续消息使用相同的代理 API 会话。要求客服人员修改其答案、使用另一个附件或执行下一步。代理工作时发送的消息可以重定向；停止任务会取消其远程轮询。

从 `v2026.9.9` 保存的会话在第一次连续时升级，而不更改远程会话 ID。保留原始 API 密钥和配置，直到继续成功。如果它们不再匹配，插件将保留绑定并解释如何恢复它们或使用可以解决原始本机会话的密钥显式重置。失败的升级永远不会默默地创建替换对话。有关密钥轮换和回滚的信息，请参阅 [saved-session 升级说明 ](https://github.com/openclaw/openclaw/blob/main/extensions/agentsapi/README.md#upgrading-saved-sessions)。

新会话会接收您的 OpenClaw 指令和角色，包括 `AGENTS.md`、`SOUL.md` 和您的用户上下文。编辑这些指令后，发送 `/new` 或 `/reset` 以开始与更新的上下文的对话。您启用的记忆工具还可以通过网关搜索和调用信息。

<a id="tools-mcp-and-files" />
<a id="tools%2C-mcp%2C-and-files" />

## <a id="work-with-files-and-tools"></a> 使用文件和工具

将文件附加到消息并描述您想要的结果。例如：

> 按月汇总此 CSV 并向我发送包含总计的新 CSV。

附件到达代理的托管工作区。要接收生成的文件，请要求代理将其保存在 `/workspace/outputs` 下并在回复中返回。下载您想要保留的输出：托管工作区与网关的文件分开，并且保存的对话不能保证永久文件存储。

除非使用 `tools.web.search.enabled: false` 或通过会话的 **Web 搜索** 控件全局禁用，否则内置 Web 搜索在新会话中可用。更改有效搜索设置需要`/new`或`/reset`；现有会话拒绝继续使用不同的本机搜索策略。默认情况下，您启用的 OpenClaw 和插件工具在您配置的工具策略下仍然可用，包括内存搜索和调用。您可以单独禁用 [Gateway 工具和 MCP 转发 ](/plugins/agentsapi#forwarding-controls)，而无需禁用托管命令、文件或附件。还可以通过MCP连接远程工具；请参见下面的 [MCP 连接 ](/plugins/agentsapi#mcp-connections)。

## <a id="advanced-configuration-and-reference"></a> 高级配置及参考

以下部分介绍存储、工具连接、自托管执行和当前限制。上面的设置足以开始使用托管环境。

### <a id="files-and-storage"></a> 文件和存储

传入的文件放置在 `/workspace/inputs` 中。返回的带有完整回复的文件来自 `/workspace/outputs`。每个文件最多支持 5 个 MiB 传输，总共 10 个 MiB，每个方向每轮传输 50 个文件。

您的网关工作区和托管文件系统有不同的用途。说明作为上下文提供；当代理需要其工作区中的内容时，将文件作为附件发送。有关环境生命周期和存储行为，请参阅 [ 托管环境指南](https://developers.openai.com/api/docs/guides/agents-api/environments/openai-hosted)。

### <a id="forwarding-controls"></a> 转发控制

要使用托管环境而不公开网关函数回调或配置的 MCP 服务器，请将其合并到现有配置中：

```json5
{
  plugins: {
    entries: {
      agentsapi: {
        enabled: true,
        config: {
          forwarding: {
            gatewayTools: false,
            mcpServers: false,
          },
        },
      },
    },
  },
}
```

两个设置默认为 `true` 并且是独立的：

- `gatewayTools: false` 跳过构建 OpenClaw 和网关函数回调的插件工具。没有声明网关函数，并且在不调用工具或其执行挂钩的情况下拒绝意外的远程函数调用。
- `mcpServers: false` 跳过加载已配置和插件捆绑的 MCP 服务器，包括发现和凭证解析。它还排除了后来添加的服务器；它不是当前已知服务器名称的列表。

对于无转发网关功能或 MCP 服务器，均设置为 `false`。本机 shell/file 工具白名单本身不会禁用 MCP 转发。这些控件仅适用于代理 API 插件，不适用于其他harness或网关自己的工具配置。本机托管的 shell 和文件操作、附件上传、输出工件交付以及同一会话后续操作仍然可用。

本机工具声明是分开的。要省略托管 Web 搜索，请将 `plugins.entries.agentsapi.config.nativeTools` 设置为不带 `web_search` 的列表，例如 `[{ type: "programmatic_tool_calling", enabled: true }]`。提供的列表将替换默认值。这些转发控件不会更改本机 shell、文件或 Web 搜索权限，也不会绕过现有的预检检查。

通过通常的网关工作流程应用配置，然后使用 `/new` 或 `/reset`。会话的远程工具声明是固定的：更改任一转发设置都会拒绝继续并保留原始绑定，直到您重置它。重置和删除在新策略下仍可解决已保存的原生会话；该插件永远不会默默地创建替换对话。

这是**工具暴露隔离，不是完整的网关提示或角色隔离**。 OpenClaw 指令、角色和普通 prompt/lifecycle 挂钩仍然适用。工具授权的提示挂钩仅接收公开的网关函数名称，当禁用网关工具转发时，这些函数名称为空。

### <a id="mcp-connections"></a> MCP 连接

使用 `streamable-http` 传输在 `mcp.servers` 或已启用插件的 MCP 捆绑包中配置远程 MCP 服务器。托管环境必须能够访问服务器的 URL。需要时提供 HTTP 身份验证标头； `localhost` 指托管环境。

更改 MCP 配置或凭据后，开始与 `/new` 或 `/reset` 的新对话。 [ 插件参考](https://github.com/openclaw/openclaw/blob/main/extensions/agentsapi/README.md) 具有连接设置、标头参考和工具过滤器。

### <a id="self-hosted-execution"></a> 自托管执行

自托管执行将代理工具保留在 OpenAI 的云中，并在您管理的基础设施上运行命令和文件操作。捆绑的 `agentsapi` 插件拥有对话和本机会话。可选的 **执行器控制器插件** 将该会话连接到主机上的 `codex exec-server` 进程。

#### <a id="one-executor-per-session"></a> 每个会话一个执行者

每个本机代理 API 会话都有自己的环境 ID、连接 URL 和执行程序进程。后续轮流重用该会话和执行器。开始另一个对话会创建另一个会话及其自己的执行者。

**所有执行器都可以在同一个持久环境**中运行，例如一台VM、远程主机或容器，并使用相同的工作空间目录。这是一种可能的部署，而不是必需的。您可以根据您的隔离和持久性需求将执行器放置在单独的环境中。

例如，两个对话可以具有以下布局：

```text
OpenClaw Gateway                 One persistent remote host
  Conversation A -> Session A -> Executor A --+--> /srv/agent/workspace
  Conversation B -> Session B -> Executor B --+
```

这些会话具有单独的对话历史记录和执行程序连接，但共享该主机上的文件和已安装的软件。会话分离不是文件系统或凭证隔离。并发会话可以更改相同的文件；当工作负载需要隔离时，使用单独的工作区、用户或主机。退出一个会话的执行器必须保持其他执行器和共享工作区完好无损。您的主机的存储和备份策略决定文件的持久性。

#### <a id="1.-prepare-the-execution-host"></a><a id="1-prepare-the-execution-host"></a> 1。准备执行主机

完成上面的 API-key 和模型设置。在执行主机上，准备绝对工作空间路径，安装代理所需的工具和依赖项，并安装支持 `codex exec-server` 的 Codex CLI 版本。按照 [ 官方自托管设置 ](https://developers.openai.com/api/docs/guides/agents-api/environments/self-hosted) 来了解当前安装和出站网络要求。

从平台仪表板为与会话所有者相同的组织、项目以及用户或服务帐户配置受限环境密钥。将该密钥提供给执行者 `CODEX_API_KEY`；将网关的应用程序 API 密钥保留在执行器环境之外。控制器插件拥有安全凭证传送、主机访问、进程监督和文件系统配置。

#### <a id="2.-install-and-configure-a-controller-plugin"></a><a id="2-install-and-configure-a-controller-plugin"></a> 2。安装并配置控制器插件

使用 [ 插件安装工作流程 ](/cli/plugins) 为您的部署安装执行器控制器插件。 OpenClaw 提供控制器合约，而不是捆绑的 SSH 启动器或通用主机管理器。该插件必须注册 `api.registerAgentExecutorController({ workspaceDirectory, ensure, retire })` 并在其清单中声明 `activation.onAgentHarnesses: ["agentsapi"]`。插件作者可以按照[控制器SDK参考](/plugins/sdk-agent-harness/registration#executor-controller-plugins)。

根据该插件的文档配置插件的主机、凭据和现有绝对工作空间路径。这些设置属于控制器插件；它们不是通用 `agentsapi` 设置。其 `workspaceDirectory` 是执行主机上的路径，可以与网关工作区不同。

#### <a id="3.-select-the-controller"></a><a id="3-select-the-controller"></a> 3。选择控制器

将其合并到您现有的配置中。将 `my-executor` 替换为已安装控制器插件的实际 ID 并保留上述设置中模型的 `agentRuntime.id: "agentsapi"` 设置。

```json5
{
  plugins: {
    entries: {
      agentsapi: {
        enabled: true,
        config: {
          environment: "self_hosted",
          executorController: "my-executor",
        },
      },
      "my-executor": { enabled: true },
    },
  },
}
```

`my-executor` 是示例 ID，而不是捆绑插件的名称。如果您使用 `plugins.allow`，请包含控制器的 ID 以及 `agentsapi`、`openai` 和其他允许的插件。保持捆绑代理 API harness启用；控制器添加了执行器管理，而不是第二个harness。

（可选）将 `plugins.entries.agentsapi.config.hostExecutorSkillDirectories` 设置为执行主机上的绝对技能目录路径。自己配置他们的文件和依赖项。 OpenClaw 转发本机发现的路径；它不会将网关技能复制到主机。

应用配置并开始与 `/new` 或 `/reset` 的新对话。更改现有对话的环境、工作区或控制器需要重置。它不会在主机之间迁移文件。

#### <a id="how-startup%2C-reconnection%2C-and-cleanup-work"></a><a id="how-startup-reconnection-and-cleanup-work"></a> 启动、重连和清理如何工作

1. 代理 API 工具创建或恢复本机会话。当 API 需要 `environment_connection` 时，OpenClaw 检索并验证会话的环境并保存其绑定和控制器所有者。
2. OpenClaw 在所选控制器上调用 `ensure(binding, context)`。它仅启动或重新连接该会话的执行程序，使用绑定中的确切 `environmentId`、未更改的 `remoteUrl` 和 `workspaceDirectory`。
3. OpenClaw 等待 API- 确认连接就绪。当执行器启动时，原始输入请求可以保持挂起状态；不会重新提交。健康的后续轮次不会调用控制器或需要主机探测。
4. 完成或中断转弯使执行器可用。网关处置还保留其保存的绑定和执行器。正在运行的执行程序处理本机重新连接；未完成的连接操作可以要求控制器再次准备相同的会话。
5. 本机工作解决后，重置、会话删除或确认终端本机会话失败尝试 `retire(binding, context)`。它仅停止该绑定的执行程序。如果无法确认本机工作已解决，则重置或删除会失败并保留绑定，以便您可以恢复连接或 API-key 身份验证并重试。结算后，执行器退休将尽最大努力：报告无法访问的主机或停止失败，而不会阻止重置或删除。网关重新启动后，清理会在检查保存的本机会话之前重新获取所属代理的 OpenAI API-key 身份验证。

控制器通常在执行主机上准备好的工作区中启动此命令，并以 `CODEX_API_KEY` 的形式安全提供环境密钥：

```bash
codex exec-server \
  --remote "<binding.remoteUrl>" \
  --environment-id "<binding.environmentId>"
```

为每个本机会话使用单独的托管进程，并使 `ensure` 调用可以安全地重复。重新连接并不能保证中断的命令能够继续存在。在重复可能已更改文件或调用服务的工作之前，请检查原始回合的结果。输入提交的截止时间为 60 秒 HTTP，包括连接等待，因此准备主机立即连接。

#### <a id="use-an-external-controller-instead"></a> 使用外部控制器代替

您可以省略 `executorController` 并管理 OpenClaw 外部的执行程序，例如通过 [Agents API Webhook 生命周期](https://developers.openai.com/api/docs/guides/agents-api/environments/lifecycle#start-compute-from-webhooks)。外部控制器拥有会话范围内的启动、重新连接和清理。它必须验证 API 读取，仅处理其预期会话，并使用每个会话的环境 ID 和未更改的远程 URL。在此模式下，OpenClaw 发送的工作空间路径必须已存在于执行器上的同一绝对路径中。为每个会话选择一个生命周期所有者。

#### <a id="check-the-setup-and-file-boundaries"></a> 检查设置和文件边界

从托管设置开始计算，然后要求代理在其工作区中写入一个小文件并在后续中读取它。对于共享主机设置，启动第二个对话并检查它在查看相同文件时是否使用不同的执行程序。重置一个对话并确认另一个对话仍然有效并且共享文件仍然存在。检查控制器进程记录和网关日志以及聊天回复；模型验证探针不会测试执行器连接。

Executor管理不会自动同步Gateway文件或添加附件传输。自托管输入附件需要具有附件暂存功能的注册工作区提供商。该控制器合约不添加自动自托管输出传输。为您的部署配置适当的 workspace/file 集成，或使用托管环境进行内置传输。网关内存和工具保留自己的存储和权限。有关这些边界和升级说明，请参阅 [ 软件包参考 ](https://github.com/openclaw/openclaw/blob/main/extensions/agentsapi/README.md)。

### <a id="session-settings-and-diagnostics"></a> 会话设置和诊断

使用 `/new` 或 `/reset` 来采用对会话指令、MCP 连接、转发控制或推理摘要显示的更改。这些命令针对下一条消息启动新会话。远程历史记录和工作区资源仍然通过代理 API 进行管理。

重置和删除确认在删除会话绑定之前（包括网关重新启动之后）本机工作已停止。如果确认失败，则保留绑定以供恢复。这不会删除远程对话或其保留的文件。回滚或切换本地转录分支也会使其旧的本机绑定无效，并在本地更改提交后退出其受控执行器。

OpenClaw 在其正常记录中显示进度并记录对话和工具历史记录。通道设置控制进度和推理可见性。当 API 提供时，会报告令牌使用情况；它衡量的是使用情况而不是剩余的上下文容量。

对于端到端设置检查，请使用上面的 Python 计算。 `openclaw models status --probe` 检查模型身份验证，而不是完整的代理 API 会话。

<a id="current-limits-and-other-environments" />

### <a id="current-limitations"></a> 当前限制

这些限制描述了当前的 OpenClaw 集成，并且可能会随着支持的扩展而改变。

- **Authentication：** ChatGPT 订阅身份验证、自定义端点和编写的请求传输覆盖不受代理 API 运行时的支持。使用上面的 API-key 设置。
- **托管环境设置：** 该插件不会公开托管技能安装或操作员配置的启动命令、包、环境变量或环境模板。网关脚本、存储库和技能目录不会自动复制到托管环境中。自托管执行器必须由其运营商配置。
- **说明和技能：** 对工作区说明或角色的更改需要新的会话。此运行时尚不支持网关技能文件访问、技能目录传送和插件命令提示符注册。
- **Agent功能：** 本机委派，包括`ultra`委派，不支持本机会话分叉。本机 Codex 项目发现、协作和延迟工具搜索不适用于此运行时。
- **图像和运行时自定义：** 不支持图像输入、图像生成、网关沙箱放置和自定义上下文引擎。
- **MCP 连接：不支持** Stdio、旧版 SSE、请求者范围的连接和自定义 TLS 设置。不转发网关 OAuth 配置文件。不支持的定义将被记录并省略，并且轮流可以在服务器不可用的情况下继续。
- **工具限制和挂钩：** 限制本机 shell、文件或 Web 搜索功能的策略在回合开始前被拒绝。不强制执行 Hook `toolsAllow` 限制；如果您依赖于这些每回合限制，请使用另一个运行时。网关工具政策仍然适用。转向和隔离完成不会运行对话提示挂钩。
- **H历史记录和诊断：** 不提供结构化计划、差异、压缩事件、本机子代理事件以及预执行批准或挂钩事件。当工具结果仍在到达时，历史记录可能不完整或无序。网络搜索活动在没有结果正文或片段的情况下可见。命令退出事实可能不可用，并且令牌使用不会建立剩余上下文容量。
- **Retries：** OpenClaw 可以在暂时的提供程序故障后继续现有会话。它不会自动重播已承认的回合，因为命令或工具可能已经运行。
